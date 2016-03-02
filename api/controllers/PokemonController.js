const pk6parse = require('pk6parse');
exports.uploadpk6 = async (req, res) => {
  try {
    const parsed = await new Promise((resolve, reject) => {
      req.file('pk6').upload((err, files) => (
        err ? reject(err) : resolve(pk6parse.parseFile(files[0].fd))
      ));
    });
    const visibility = req.param('visibility');
    if (visibility && !_.includes(['private', 'public', 'readonly'], visibility)) {
      return res.badRequest();
    }
    parsed.owner = req.user.username;
    parsed.visibility = visibility;
    parsed.cloneHash = PokemonHandler.computeCloneHash(parsed);
    parsed.id = require('crypto').randomBytes(16).toString('hex');
    const result = await Pokemon.create(parsed);
    result.isUnique = await result.checkIfUnique();
    return res.send(201, result);
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
    if (req.user && req.user.username === pokemon.owner || pokemon.visibility === 'public') {
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
    if (pokemon.owner !== req.user.username) {
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
    const myPokemon = await Pokemon.find({owner: req.user.username});
    await Promise.map(myPokemon, async pkmn => {
      pkmn.isUnique = await pkmn.checkIfUnique();
    });
    return res.ok(myPokemon);
  } catch (err) {
    return res.serverError(err);
  }
}
