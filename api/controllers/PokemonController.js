const pk6parse = require('pk6parse');
module.exports = _.mapValues({
  async uploadpk6 (req, res) {
    const params = req.allParams();
    let visibility;
    if (params.visibility) {
      visibility = params.visibility;
      Validation.verifyPokemonParams({visibility});
    } else {
      visibility = (await UserPreferences.findOne({
        user: req.user.name
      })).defaultPokemonVisibility;
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
    Validation.requireParams(params, 'box');
    const box = await Box.findOne({id: params.box});
    Validation.verifyUserIsOwner(box, req.user, {allowAdmin: false});
    parsed.box = box.id;
    parsed.owner = req.user.name;
    parsed.visibility = visibility;
    const result = await Pokemon.create(parsed);
    result.isUnique = await result.checkIfUnique();
    box._orderedIds.push(result.id);
    await box.save();
    return res.created(result);
  },

  async get (req, res) {
    const pokemon = await Pokemon.findOne({
      id: req.param('id'),
      _markedForDeletion: false
    }).populate('notes');
    if (!pokemon) {
      return res.notFound();
    }
    pokemon.isUnique = await pokemon.checkIfUnique();
    pokemon.assignParsedNames();
    const pokemonIsPublic = pokemon.visibility === 'public';
    const userIsOwner = !!req.user && req.user.name === pokemon.owner;
    const userIsAdmin = !!req.user && req.user.isAdmin;
    if (pokemonIsPublic || userIsOwner || userIsAdmin) {
      return res.ok(pokemon);
    }
    if (pokemon.visibility === 'private') {
      return res.forbidden();
    }
    return res.ok(pokemon.omitPrivateData());
  },

  async delete (req, res) {
    const id = req.param('id');
    const pokemon = await Pokemon.findOne({id});
    Validation.verifyUserIsOwner(pokemon, req.user);
    await pokemon.markForDeletion();
    res.send(202);
    await Promise.delay(req.param('immediately') ? 0 : Constants.POKEMON_DELETION_DELAY);
    const updatedPokemon = await Pokemon.findOne({id});
    if (updatedPokemon._markedForDeletion) {
      await pokemon.destroy();
    }
  },

  async undelete (req, res) {
    const params = req.allParams();
    const pokemon = await Pokemon.findOne({id: params.id});
    Validation.verifyUserIsOwner(pokemon, req.user, {allowDeleted: true});
    await pokemon.unmarkForDeletion();
    return res.ok();
  },

  async mine (req, res) {
    const myPokemon = await Pokemon.find({owner: req.user.name, _markedForDeletion: false});
    await Promise.map(myPokemon, async pkmn => {
      pkmn.isUnique = await pkmn.checkIfUnique();
    });
    return res.ok(myPokemon);
  },

  async download (req, res) {
    const pokemon = await Pokemon.findOne({id: req.param('id'), _markedForDeletion: false});
    if (!pokemon) {
      return res.notFound();
    }
    const userIsOwner = !!req.user && req.user.name === pokemon.owner;
    const userIsAdmin = !!req.user && req.user.isAdmin;
    if (pokemon.visibility !== 'public' && !userIsOwner && !userIsAdmin) {
      return res.forbidden();
    }
    res.status(200).json(pokemon._rawPk6);
    if (!userIsOwner && pokemon.visibility === 'public') {
      pokemon.downloadCount++;
      await pokemon.save();
    }
  },

  /**
  * Moves a Pokémon from one box to another, or to a different location within a box.
  * POST /p/:id/move
  * @param {string} id The ID of the Pokémon that should be moved
  * @param {string} box The ID of the box that the Pokémon should be moved to.
  * @param {number} [index] The index where the Pokémon should be inserted in the new box. If omitted, the
  Pokémon is inserted at the end of the box.
  */
  async move (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, ['id', 'box']);
    const pokemon = await Pokemon.findOne({id: params.id});
    const newBox = await Box.findOne({id: params.box});
    Validation.verifyUserIsOwner(pokemon, req.user);
    Validation.verifyUserIsOwner(newBox, req.user);
    if (pokemon.owner !== newBox.owner) {
      return res.forbidden();
    }
    const index = _.has(params, 'index') ? params.index : newBox._orderedIds.length;
    if (!_.isNumber(index) || index % 1 || !_.inRange(index, newBox._orderedIds.length + 1)) {
      return res.badRequest('Invalid index parameter');
    }

    let itemsToSave, oldBox;
    if (params.box === pokemon.box) {
      oldBox = newBox;
      itemsToSave = [pokemon, newBox];
    } else {
      oldBox = await Box.findOne({id: pokemon.box});
      itemsToSave = [pokemon, newBox, oldBox];
    }

    _.remove(oldBox._orderedIds, id => id === pokemon.id);
    pokemon.box = newBox.id;
    newBox._orderedIds.splice(index, 0, pokemon.id);

    await Promise.all(itemsToSave.map(item => item.save()));
    return res.ok();
  },
  async addNote (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, ['id', 'text']);
    const pokemon = await Pokemon.findOne({id: params.id});
    Validation.verifyUserIsOwner(pokemon, req.user);
    let visibility;
    if (params.visibility) {
      visibility = params.visibility;
    } else {
      visibility = (await UserPreferences.findOne({
        user: req.user.name
      })).defaultPokemonNoteVisibility;
    }
    const newNoteParams = {text: params.text, visibility, pokemon};
    Validation.verifyPokemonNoteParams(newNoteParams);
    const newNote = await PokemonNote.create(newNoteParams);
    return res.created(newNote);
  },

  async deleteNote (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, ['id', 'noteId']);
    const pokemon = await Pokemon.findOne({id: params.id, _markedForDeletion: false});
    if (!pokemon) {
      return res.notFound();
    }
    if (pokemon.owner !== req.user.name && !req.user.isAdmin) {
      return res.forbidden();
    }
    const note = await PokemonNote.findOne({id: params.noteId, pokemon: params.id});
    if (!note) {
      return res.notFound();
    }
    await note.destroy();
    return res.ok();
  },

  async editNote (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, ['id', 'noteId']);
    const filteredParams = Validation.filterParams(params, ['text', 'visibility']);
    const pokemon = await Pokemon.findOne({id: params.id});
    Validation.verifyUserIsOwner(pokemon, req.user);
    const note = await PokemonNote.findOne({id: params.noteId, pokemon: params.id});
    if (!note) {
      return res.notFound();
    }
    _.assign(note, filteredParams);
    Validation.verifyPokemonNoteParams(note);
    await note.save();
    return res.ok(note);
  },

  async edit (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'id');
    const filteredParams = Validation.filterParams(params, ['visibility']);
    const pokemon = await Pokemon.findOne({id: params.id});
    Validation.verifyUserIsOwner(pokemon, req.user);
    _.assign(pokemon, filteredParams);
    Validation.verifyPokemonParams(pokemon);
    await pokemon.save();
    return res.ok(pokemon);
  }
}, CatchAsyncErrors);
