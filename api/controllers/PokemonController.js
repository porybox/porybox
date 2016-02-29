const pk6parse = require('pk6parse');
exports.uploadpk6 = async (req, res) => {
  try {
    const parsed = await new Promise((resolve, reject) => {
      req.file('pk6').upload((err, files) => (
        err ? reject(err) : resolve(pk6parse.parseFile(files[0].fd))
      ));
    });
    parsed.owner = req.user.username;
    parsed.cloneHash = PokemonHandler.computeCloneHash(parsed);
    parsed.id = require('crypto').randomBytes(16).toString('hex');
    const result = await Pokemon.create(parsed);
    result.__isUnique__ = await result.isUnique(); // These won't get saved to the database, just used for testing
    result.__tsv__ = result.tsv();
    result.__esv__ = result.esv();
    result.__isShiny__ = result.isShiny();
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
