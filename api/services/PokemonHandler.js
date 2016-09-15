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

exports.getSafePokemonForUser = async (
    pkmn, user, {checkUnique = false, parse = true, omitBox = false, knownBoxVisibility} = {}
) => {
  if (!pkmn) {
    throw {statusCode: 404};
  }
  if (checkUnique) {
    pkmn.isUnique = await pkmn.checkIfUnique();
  }
  if (parse) {
    pkmn.assignParsedNames();
  }
  const userIsOwner = !!user && user.name === pkmn.owner;
  const userIsAdmin = !!user && user.isAdmin;
  if (userIsOwner || userIsAdmin) {
    return pkmn;
  }
  if (pkmn.visibility === 'private') {
    throw {statusCode: 403};
  }
  let filteredPkmn = pkmn.omitOwnerOnlyInfo();
  if (pkmn.visibility !== 'public') {
    filteredPkmn = filteredPkmn.omitPrivateData();
  }
  if (omitBox || (knownBoxVisibility || pkmn._boxVisibility) !== 'listed') {
    filteredPkmn = _.omit(filteredPkmn, 'box');
  }
  return filteredPkmn;
};

exports.getSafeBoxForUser = async (box, user) => {
  if (!box) {
    throw {statusCode: 404};
  }
  const isOwner = user && user.name === box.owner;
  const isAdmin = user && user.isAdmin;
  return isOwner || isAdmin ? box : _.omit(box, 'updatedAt');
};

exports.filterPokemonListForUser = async (pkmnList, user) => {
  return pkmnList
    .filter(p => !p._markedForDeletion)
    .filter(p => user && (user.name === p.owner || user.isAdmin) || p.visibility !== 'private');
};

exports.getSafeBoxSliceForUser = async ({box, user, afterId, beforeId, sliceSize}) => {
  if (sliceSize <= 0) return [];
  let startIndex, endIndex;
  /* Fetch 10 extra items from the db to reduce the chance that another batch will need to be fetched due to IDs being deleted/private.
  (then get rid of the extras before returning the results to the client) */
  const EXTRA_FALLBACK_AMOUNT = 10;
  if (afterId) {
    const indexOfMarker = box._orderedIds.indexOf(afterId);
    if (indexOfMarker === -1) throw {statusCode: 404};
    startIndex = indexOfMarker + 1;
    endIndex = startIndex + sliceSize + EXTRA_FALLBACK_AMOUNT;
  } else if (beforeId) {
    const indexOfMarker = box._orderedIds.indexOf(beforeId);
    if (indexOfMarker === -1) throw {statusCode: 404};
    startIndex = Math.max(indexOfMarker - sliceSize - EXTRA_FALLBACK_AMOUNT, 0);
    endIndex = indexOfMarker;
  } else {
    startIndex = 0;
    endIndex = sliceSize + EXTRA_FALLBACK_AMOUNT;
  }
  // The IDs of the Pokémon that should be fetched
  const desiredIds = box._orderedIds.slice(startIndex, endIndex);

  if (!desiredIds.length) return [];

  // The Pokémon objects corresponding to those IDs (not necessarily in order)
  const unsafeResults = await Pokemon.find({id: desiredIds});

  // An object mapping {[Pokémon ID]: Pokémon object} to put the items in the correct order in linear time
  const resultsById = _.mapValues(_.groupBy(unsafeResults, 'id'), 0);

  // The Pokémon objects in the correct order
  const unsafeSortedResults = desiredIds.map(id => resultsById[id]);

  const unsafeFilteredResults = PokemonHandler.filterPokemonListForUser(unsafeSortedResults, user);

  const safeFilteredResults = await Promise.map(unsafeFilteredResults, pkmn => {
    return PokemonHandler.getSafePokemonForUser(pkmn, user, {parse: true});
  });

  const isReversed = !afterId && beforeId;
  const slicedSafeFilteredResults = isReversed
    ? safeFilteredResults.slice(-sliceSize)
    : safeFilteredResults.slice(0, sliceSize);
  const nextAfterId = isReversed ? null : _.last(desiredIds);
  const nextBeforeId = isReversed ? desiredIds[0] : null;
  const nextItems = await PokemonHandler.getSafeBoxSliceForUser({
    box,
    user,
    afterId: nextAfterId,
    beforeId: nextBeforeId,
    sliceSize: sliceSize - slicedSafeFilteredResults.length
  });
  return isReversed
    ? nextItems.concat(slicedSafeFilteredResults)
    : slicedSafeFilteredResults.concat(nextItems);
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
  await Promise.method(Validation.verifyUserIsOwner)(box, user, {allowAdmin: false})
    .catchThrow({statusCode: 404}, {statusCode: 404, message: 'Box not found'})
    .catchThrow({statusCode: 403}, {statusCode: 403, message: 'Cannot upload to this box'});
  parsed.box = box.id;
  parsed._boxVisibility = box.visibility;
  parsed.owner = user.name;
  parsed.visibility = visibility;
  return parsed;
};

exports.getBoxSize = (boxId, filterQuery) => {
  return Pokemon.count(_.assign({
    box: boxId,
    _markedForDeletion: false
  }, filterQuery));
};

exports.pickPokemonFields = (pkmn, fieldString) => {
  return _.isString(fieldString)
    ? pkmn && _.pick(pkmn, fieldString.split(',').concat('toJSON'))
    : pkmn;
};
