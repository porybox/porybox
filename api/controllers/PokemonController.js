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

    const prohibitReason = PokemonHandler.checkProhibited(parsed);
    if (prohibitReason !== null) {
      return res.status(400).json(prohibitReason);
    }

    Validation.requireParams(params, 'box');
    const box = await Box.findOne({id: params.box});
    Validation.verifyUserIsOwner(box, req.user, {allowAdmin: false});
    parsed.box = box.id;
    parsed.owner = req.user.name;
    parsed.visibility = visibility;
    // Attempt to parse the move IDs, etc. make sure that the IDs are valid
    if (_.isError(_.attempt(pk6parse.assignReadableNames, _.clone(parsed)))) {
      return res.status(400).json('Failed to parse the provided file');
    }
    const result = await Pokemon.create(parsed);
    result.isUnique = await result.checkIfUnique();
    box._orderedIds.push(result.id);
    await box.save();
    return PokemonHandler.getSafePokemonForUser(result, req.user).then(res.created);
  },

  async get (req, res) {
    const pokemon = await Pokemon.findOne({
      id: req.param('id'),
      _markedForDeletion: false
    }).populate('notes');
    return PokemonHandler.getSafePokemonForUser(pokemon, req.user, {
      checkUnique: true
    }).then(res.ok);
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
    const box = await Box.findOne({id: pokemon.box, _markedForDeletion: false});
    if (!box) {
      return res.badRequest();
    }
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
    res.header('Content-Disposition', `attachment; filename=${pokemon.nickname}-${pokemon.id}.pk6`);
    res.status(200).send(Buffer.from(pokemon._rawPk6, 'base64'));
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
  * @param {number} [index] The index at which the Pokémon should be placed into the new box. Note that if
  the Pokémon is being moved around within a single box, the indices of everything else in that box will shift around.

  For example, suppose Box 1 contains [A B C], and Box 2 contains [D E].

  * If D is moved to Box 1 with index=2, Box 1 will look like this: [A B D C] (D ends up at index 2, as requested)
  * If D is moved to Box 1 with index=3, Box 1 will look like this: [A B C D] (D ends up at index 3, as requested)
  * If A is moved to Box 1 with index=2, Box 1 will look like this: [B C A] (A ends up at index 2, as requested)
  * If A is moved to Box 1 with index=3, a 400 error will be returned, because it is not possible to place A at an index of 3.

  If the `index` parameter is omitted, the Pokémon will always be placed in the last slot of the box.
  */
  async move (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, ['id', 'box']);
    const pokemon = await Pokemon.findOne({id: params.id});
    const newBox = await Box.findOne({id: params.box}).populate('contents');
    Validation.verifyUserIsOwner(pokemon, req.user);
    Validation.verifyUserIsOwner(newBox, req.user);
    if (pokemon.owner !== newBox.owner) {
      return res.forbidden();
    }
    const orderedContents = BoxOrdering.getOrderedPokemonList(newBox);
    const indCap = params.box === pokemon.box ? orderedContents.length - 1 : orderedContents.length;
    const index = _.has(params, 'index') ? params.index : indCap;
    if (!_.isNumber(index) || index % 1 || !_.inRange(index, indCap + 1)) {
      return res.badRequest('Invalid index parameter');
    }

    let itemsToSave, oldBox;
    if (params.box === pokemon.box) {
      oldBox = newBox;
      itemsToSave = [pokemon, newBox];
      _.remove(orderedContents, pkmn => pkmn.id === pokemon.id);
    } else {
      oldBox = await Box.findOne({id: pokemon.box});
      itemsToSave = [pokemon, newBox, oldBox];
    }

    _.remove(oldBox._orderedIds, id => id === pokemon.id);
    pokemon.box = newBox.id;
    /* If the new box contains deleted items, the provided index of the new pokemon of the orderedContents list might not be
    the same as the index of the new pokemon in the _orderedIds list, since the _orderedIds list also contains the IDs of
    deleted contents. To fix the issue, take the pokemon ID that the new pokemon will immediately follow in the orderedContents
    list, and place the new pokemon right after that ID in the _orderedIds list. */
    const adjIndex = index > 0 ? newBox._orderedIds.indexOf(orderedContents[index - 1].id) + 1 : 0;
    newBox._orderedIds.splice(adjIndex, 0, pokemon.id);

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
}, catchAsyncErrors);
