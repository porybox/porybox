const pk6parse = require('pk6parse');
const moment = require('moment');
exports.uploadpk6 = async (req, res) => {
  try {
    const params = req.allParams();
    let visibility;
    if (params.visibility) {
      if (!Constants.POKEMON_VISIBILITIES.includes(params.visibility)) {
        return res.status(400).json('Invalid visibility setting');
      }
      visibility = params.visibility;
    } else {
      visibility = (await UserPreferences.findOne({user: req.user.name})).defaultPokemonVisibility;
    }
    const files = await new Promise((resolve, reject) => {
      req.file('pk6').upload((err, files) => err ? reject(err) : resolve(files));
    });
    if (!files.length) {
      return res.status(400).json('No files uploaded');
    }
    const parsed = _.attempt(pk6parse.parseFile, files[0].fd);
    if (_.isError(parsed)) {
      return res.status(400).json('Failed to parse the provided file');
    }
    let box;
    if (params.box) {
      box = await Box.findOne({id: params.box});
      if (!box) {
        return res.status(400).json(`Box ${params.box} not found`);
      }
      if (box.owner !== req.user.name) {
        return res.status(403).json("Cannot upload to another user's box");
      }
    } else {
      box = await Box.create({
        name: `Untitled Box ${moment.utc().format('YYYY-MM-DD HH:mm:ss')}`,
        owner: req.user.name,
        id: require('crypto').randomBytes(16).toString('hex')
      });
    }
    parsed.box = box.id;
    parsed.owner = req.user.name;
    parsed.visibility = visibility;
    parsed.cloneHash = PokemonHandler.computeCloneHash(parsed);
    parsed.id = require('crypto').randomBytes(16).toString('hex');
    const result = await Pokemon.create(parsed);
    result.isUnique = await result.checkIfUnique();
    return res.status(201).json(result);
  } catch (err) {
    return res.serverError(err);
  }
};

exports.get = async (req, res) => {
  try {
    const pokemon = await Pokemon.findOne({id: req.param('id'), _markedForDeletion: false});
    if (!pokemon) {
      return res.notFound();
    }
    pokemon.isUnique = await pokemon.checkIfUnique();
    if (req.user && req.user.name === pokemon.owner || pokemon.visibility === 'public') {
      return res.ok(pokemon);
    }
    if (pokemon.visibility === 'private') {
      return res.forbidden();
    }
    return res.ok(pokemon.omitPrivateData());
  } catch (err) {
    return res.serverError(err);
  }
};

exports.delete = async (req, res) => {
  try {
    const id = req.param('id');
    let pokemon = await Pokemon.findOne({id});
    if (!pokemon) {
      return res.notFound();
    }
    if (pokemon.owner !== req.user.name) {
      return res.forbidden();
    }
    await pokemon.markForDeletion();
    res.send(202);
    await Promise.delay(req.param('immediately') ? 0 : Constants.POKEMON_DELETION_DELAY);
    pokemon = await Pokemon.findOne({id});
    if (pokemon._markedForDeletion) {
      await pokemon.destroy();
    }
  } catch (err) {
    if (res.finished) {
      sails.log.error(err);
    } else {
      return res.serverError(err);
    }
  }
};

exports.undelete = async (req, res) => {
  try {
    const pokemon = await Pokemon.findOne({id: req.param('id')});
    if (!pokemon) {
      return res.notFound();
    }
    if (pokemon.owner !== req.user.name) {
      /* If anyone other than the owner tries to undelete the pokemon, return a 404 error.
      That way, the server doesn't leak information on whether a pokemon with the given ID ever existed. */
      return pokemon._markedForDeletion ? res.notFound() : res.forbidden();
    }
    await pokemon.unmarkForDeletion();
    return res.ok();
  } catch (err) {
    return res.serverError(err);
  }
};

exports.mine = async (req, res) => {
  try {
    const myPokemon = await Pokemon.find({owner: req.user.name, _markedForDeletion: false});
    await Promise.map(myPokemon, async pkmn => {
      pkmn.isUnique = await pkmn.checkIfUnique();
    });
    return res.ok(myPokemon);
  } catch (err) {
    return res.serverError(err);
  }
};

exports.download = async (req, res) => {
  try {
    const pokemon = await Pokemon.findOne({id: req.param('id'), _markedForDeletion: false});
    if (!pokemon) {
      return res.notFound();
    }
    const userIsOwner = !!req.user && req.user.name === pokemon.owner;
    if (pokemon.visibility !== 'public' && !userIsOwner) {
      return res.forbidden();
    }
    res.status(200).json(pokemon._rawPk6);
    if (!userIsOwner) {
      pokemon.downloadCount++;
      await pokemon.save();
    }
  } catch (err) {
    return res.serverError(err);
  }
};
