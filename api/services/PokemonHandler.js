const pk6parse = require('pk6parse');
exports.computeCloneHash = pkmn => {
  // Computes a hash of this Pokemon's immutable data, for the purposes of detecting clones.
  // Data that can be changed (e.g. current moves, EVs, evolution state) is not included.
  // If the output of this function changes, a database migration should be run to fix the hashes on everything.
  const buf = Buffer.alloc(42);
  buf.writeUInt32LE(pkmn.encryptionConstant); // 4 bytes
  buf.write(pkmn.ot, 4, 24, 'utf16le'); // 24 bytes
  buf.writeUInt16LE(pkmn.tid, 28); // 2 bytes
  buf.writeUInt16LE(pkmn.sid, 30); // 2 bytes
  buf.writeUInt32LE(pkmn.pid, 32); // 4 bytes
  buf.writeUInt16LE(pk6parse.getPokemonData(pkmn.dexNo).first_evolution_id, 36); // 2 bytes
  if (exports.isStaticPidEvent(pkmn)) {
    let compactIvs = 0;
    [pkmn.ivHp, pkmn.ivAtk, pkmn.ivDef, pkmn.ivSpe, pkmn.ivSpAtk, pkmn.ivSpDef].forEach(value => {
      compactIvs = compactIvs << 5 | value;
    });
    buf.writeUInt32LE(compactIvs >>> 0, 38); // (5 bits per IV) * (6 IVs) + (2 blank bits) = 32 bits = 4 bytes
    // Total: 42 bytes (initialized in buffer above)
  }
  return require('crypto').createHash('sha256').update(buf).digest('base64');
};

// Returns the reason that a given pokemon is prohibited from being uploaded, or `null` if it is allowed to be uploaded.
exports.checkProhibited = pkmn => {
  const matchedProps = Constants.PROHIBITED_UPLOADS.find(prohibitedUpload => {
    return _.keys(prohibitedUpload.props).every(key => prohibitedUpload.props[key] === pkmn[key]);
  });
  return matchedProps ? matchedProps.reason : null;
};

exports.isStaticPidEvent = () => false; // TODO: Implement this

exports.getSafePokemonForUser = async (pkmn, user, {checkUnique = false, parse = true} = {}) => {
  if (!pkmn) {
    throw {statusCode: 404};
  }
  if (checkUnique) {
    pkmn.isUnique = await pkmn.checkIfUnique();
  }
  if (parse) {
    pkmn.assignParsedNames();
  }
  const pokemonIsPublic = pkmn.visibility === 'public';
  const userIsOwner = !!user && user.name === pkmn.owner;
  const userIsAdmin = !!user && user.isAdmin;
  if (userIsOwner || userIsAdmin) {
    return pkmn;
  }
  if (pokemonIsPublic) {
    return pkmn.omitOwnerOnlyInfo();
  }
  if (pkmn.visibility === 'private') {
    throw {statusCode: 403};
  }
  return pkmn.omitOwnerOnlyInfo().omitPrivateData();
};

exports.getSafeBoxForUser = async (box, user) => {
  if (!box) {
    throw {statusCode: 404};
  }
  box.contents = await Promise.all(BoxOrdering.getOrderedPokemonList(box)
    .filter(p => !p._markedForDeletion)
    .filter(p => {
      return user && user.name === p.owner || p.visibility !== 'private' || user && user.isAdmin;
    })
    .map(p => PokemonHandler.getSafePokemonForUser(p, user, {parse: true})));
  return box;
};

exports.createPokemonFromPk6 = async ({user, visibility, boxId, file}) => {
  const parseFunc = Buffer.isBuffer(file) ? pk6parse.parseBuffer : pk6parse.parseFile;
  const parsed = _.attempt(parseFunc, file, {parseNames: true});
  if (_.isError(parsed)) {
    throw {statusCode: 400, message: 'Failed to parse the provided file'};
  }
  const prohibitReason = PokemonHandler.checkProhibited(parsed);
  if (prohibitReason !== null) {
    throw {statusCode: 400, message: prohibitReason};
  }
  const box = await Box.findOne({id: boxId});
  Validation.verifyUserIsOwner(box, user, {allowAdmin: false});
  parsed.box = box.id;
  parsed.owner = user.name;
  parsed.visibility = visibility;
  return parsed;
};

exports.pickPokemonFields = (pkmn, fieldString) => {
  return _.isString(fieldString) ? _.pick(pkmn, fieldString.split(',').concat('toJSON')) : pkmn;
};
