const pk6parse = require('pk6parse');
const moment = require('moment');
exports.uploadpk6 = async (req, res) => {
  try {
    const params = req.allParams();
    const visibility = params.visibility;
    if (visibility && !_.includes(['private', 'public', 'readonly'], visibility)) {
      return res.status(400).json('Invalid visibility setting');
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
    const pokemon = await Pokemon.findOne({id: req.param('id')});
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
    const pokemon = await Pokemon.findOne({id: req.param('id')});
    if (!pokemon) {
      return res.notFound();
    }
    if (pokemon.owner !== req.user.name) {
      return res.forbidden();
    }
    await Pokemon.destroy({id: req.param('id')});
    return res.ok();
  } catch (err) {
    return res.serverError(err);
  }
};

exports.mine = async (req, res) => {
  try {
    const myPokemon = await Pokemon.find({owner: req.user.name});
    await Promise.map(myPokemon, async pkmn => {
      pkmn.isUnique = await pkmn.checkIfUnique();
    });
    return res.ok(myPokemon);
  } catch (err) {
    return res.serverError(err);
  }
}
