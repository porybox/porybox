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
    Validation.requireParams(params, 'box');
    const files = await new Promise((resolve, reject) => {
      req.file('pk6').upload((err, files) => err ? reject(err) : resolve(files));
    });
    if (!files.length) {
      return res.status(400).json('No files uploaded');
    }
    return PokemonHandler.createPokemonFromFile({
      user: req.user,
      visibility,
      boxId: params.box,
      file: files[0].fd
    }).tap(async pokemon => {
      if (await PokemonHandler.getBoxSize(pokemon.box) >= Constants.MAX_BOX_SIZE) {
        throw {statusCode: 400, message: 'Cannot upload to a maximum-capacity box'};
      }
    }).then(parsed => Pokemon.create(parsed))
      .tap(result => BoxOrdering.addPkmnIdsToBox(result.box, [result.id]))
      .then(result => PokemonHandler.getSafePokemonForUser(result, req.user, {checkUnique: true}))
      .then(res.created);
  },

  /**
  * POST /pk6/multi
  * @param {Array} files
  * `files` must be an array of up to 50 elements, in the following format:
  * [
  *   {box: 'a box id', visibility: 'a visibility setting', data: 'a base64 string representing the pk6 file'},
  *   { ... },
  *   ...
  * ]
  * The `visibility` parameter for each file is optional, and defaults to the user's default visibility setting if
  not provided.
  *
  * The endpoint will usually return a 201 response in the following format:
  * [
  *   {success: true, created: <pokemon data>, error: null},
  *   {success: false, created: null, error: 'Missing box'},
  *   { ... },
  *   ...
  * ]
  */
  async uploadMultipleFiles (req, res) {
    const files = req.param('files');
    if (!Array.isArray(files)) {
      return res.status(400).json('Invalid files array');
    }

    if (files.length === 0) {
      return res.status(400).json('No files uploaded');
    }

    if (files.length > Constants.MAX_MULTI_UPLOAD_SIZE) {
      return res.status(400).json('A maximum of 50 files may be uploaded at a time');
    }

    files.forEach(file => Validation.verifyPokemonParams({visibility: file.visibility}));
    files.forEach(file => Validation.assert(_.isString(file.box), 'Missing/invalid box ID'));

    const defaultVisibility = (await UserPreferences.findOne({
      user: req.user.name
    })).defaultPokemonVisibility;
    const parsePromises = _.map(files, Promise.method(file => {
      const fileBuf = _.attempt(Buffer.from, file.data, 'base64');
      if (_.isError(fileBuf)) {
        throw {statusCode: 400, message: 'Failed to parse the provided file'};
      }

      return PokemonHandler.createPokemonFromFile({
        user: req.user,
        visibility: file.visibility || defaultVisibility,
        boxId: file.box,
        file: fileBuf,
        gen: file.gen
      });
    }));

    parsePromises.forEach(p => p.suppressUnhandledRejections());
    await Promise.all(parsePromises.map(promise => promise.reflect()));

    // a list of all uploads that were parsed successfully and have valid boxes
    const fulfilledUploads
      = parsePromises.filter(promise => promise.isFulfilled()).map(promise => promise.value());

    // a map with box IDs as keys and an array of parsed uploads for the given box as values
    const fulfilledValuesByBox = _.groupBy(fulfilledUploads, 'box');

    // a map with box IDs as keys and numbers representing the current box size as values
    const boxSizes = await Promise.props(_.mapValues(fulfilledValuesByBox, (vals, boxId) => {
      return PokemonHandler.getBoxSize(boxId);
    }));

    // a Set containing the "overflow" files, i.e. Pokémon that will not be
    // added because they would cause the box to exceed its max capacity.
    const overflowFiles = new Set(_.reduce(fulfilledValuesByBox, (accum, valuesForBox, boxId) => {
      // For each box, a maximum of `Constants.MAX_BOX_SIZE - boxSizes[boxId]` new files can be accepted.
      // Add uploads which come after that index to the set of overflow files.
      return accum.concat(valuesForBox.slice(Constants.MAX_BOX_SIZE - boxSizes[boxId]));
    }, []));

    // a list of Pokémon documents created in the database
    const created = await Promise.map(
      Pokemon.create(fulfilledUploads.filter(value => !overflowFiles.has(value))),
      pkmn => PokemonHandler.getSafePokemonForUser(pkmn, req.user)
    );

    await Promise.all(_.values(_.groupBy(created, 'box')).map(pkmnArray => {
      return BoxOrdering.addPkmnIdsToBox(pkmnArray[0].box, _.map(pkmnArray, 'id'));
    }));

    let successCount = 0;
    return res.created(parsePromises.map(promise => {
      if (promise.isFulfilled()) {
        if (overflowFiles.has(promise.value())) {
          return {success: false, created: null, error: 'Cannot upload to a maximum-capacity box'};
        }
        return {success: true, created: created[successCount++], error: null};
      }
      return {success: false, created: null, error: promise.reason().message || 'Unknown error'};
    }));
  },

  async get (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'id');
    const pokemon = await Pokemon.findOne({id: req.param('id'), _markedForDeletion: false});
    const safePkmn = await PokemonHandler.getSafePokemonForUser(pokemon, req.user, {
      checkUnique: true
    });
    return res.ok(PokemonHandler.pickPokemonFields(safePkmn, params.pokemonFields));
  },

  async delete (req, res) {
    const id = req.param('id').split(',');
    const pokemon = await Pokemon.find().where({id});
    for (const i in pokemon) {
      Validation.verifyUserIsOwner(pokemon[i], req.user);
    }
    for (const i in pokemon) {
      await pokemon[i].markForDeletion();
    }
    res.send(202);
    await Promise.delay(req.param('immediately') ? 0 : Constants.POKEMON_DELETION_DELAY);
    const updatedPokemon = await Pokemon.find().where({id});
    for (const updatedPkmn in updatedPokemon) {
      if (updatedPkmn._markedForDeletion) {
        await updatedPkmn.destroy();
      }
    }
  },

  async undelete (req, res) {
    const id = req.allParams().id.split(',');
    const pokemon = await Pokemon.find().where({id});
    for (const i in pokemon) {
      Validation.verifyUserIsOwner(pokemon[i], req.user, {allowDeleted: true});
      const box = await Box.findOne({id: pokemon[i].box, _markedForDeletion: false});
      if (!box) {
        return res.badRequest();
      }
      if (await PokemonHandler.getBoxSize(pokemon[i].box) >= Constants.MAX_BOX_SIZE) {
        return res.status(400).json('Cannot add a Pokémon to a maximum-capacity box');
      }
    }
    for (const i in pokemon) {
      await pokemon[i].unmarkForDeletion();
    }
    return res.ok();
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
    res.attachment(`${pokemon.nickname}-${pokemon.id}.pk6`);
    res.status(200).send(Buffer.from(pokemon._rawFile || pokemon._rawPk6, 'base64'));
    if (!userIsOwner && pokemon.visibility === 'public') {
      await pokemon.incrementDownloadCount();
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

    let oldBox;
    if (params.box === pokemon.box) {
      oldBox = newBox;
      _.remove(orderedContents, pkmn => pkmn.id === pokemon.id);
    } else if (await PokemonHandler.getBoxSize(newBox.id) >= Constants.MAX_BOX_SIZE) {
      return res.status(400).json('Cannot move a Pokémon to a maximum-capacity box');
    } else {
      oldBox = await Box.findOne({id: pokemon.box});
    }

    _.remove(oldBox._orderedIds, id => id === pokemon.id);
    /* If the new box contains deleted items, the provided index of the new pokemon of the orderedContents list might not be
    the same as the index of the new pokemon in the _orderedIds list, since the _orderedIds list also contains the IDs of
    deleted contents. To fix the issue, take the pokemon ID that the new pokemon will immediately follow in the orderedContents
    list, and place the new pokemon right after that ID in the _orderedIds list. */
    const adjIndex = index > 0 ? newBox._orderedIds.indexOf(orderedContents[index - 1].id) + 1 : 0;
    await BoxOrdering.removePkmnIdFromBox(oldBox.id, pokemon.id);
    pokemon.box = newBox.id;
    const promises = [
      BoxOrdering.addPkmnIdsToBox(newBox.id, [pokemon.id], adjIndex),
      Pokemon.update({id: pokemon.id}, {box: newBox.id})
    ];
    await Promise.all(promises);
    return res.ok();
  },

  async edit (req, res) {
    const params = req.allParams();
    Validation.requireParams(params, 'id');
    const filteredParams = Validation.filterParams(params, [
      'visibility',
      'publicNotes',
      'privateNotes'
    ]);
    const pokemon = await Pokemon.findOne({id: params.id});
    Validation.verifyUserIsOwner(pokemon, req.user);
    Validation.verifyPokemonParams(filteredParams);
    await Pokemon.update({id: pokemon.id}, filteredParams);
    return res.ok(pokemon);
  },

  async getClones (req, res) {
    const id = req.param('id');
    const pkmn = await Pokemon.findOne({id, _markedForDeletion: false});
    Validation.verifyUserCanAccessPokemon(pkmn, req.user);
    const page = _.isUndefined(req.query.page) ? 1 : +req.query.page;
    if (Number.isNaN(page) || page % 1 || page < 1) return res.badRequest();
    const pokemonFields = req.param('pokemonFields');
    const contents = await Pokemon
      .find({_cloneHash: pkmn._cloneHash, _markedForDeletion: false, id: {not: id}})
      .sort('createdAt DESC')
      .skip((page - 1) * Constants.CLONES_LIST_PAGE_SIZE)
      .limit(Constants.CLONES_LIST_PAGE_SIZE)
      .then()
      .map(result => {
        return PokemonHandler.getSafePokemonForUser(result, req.user, {omitBox: true})
          .catchReturn({statusCode: 403}, null);
      })
      .map((clone) => {
        if (!clone) return null;
        const visible = clone._boxVisibility === 'listed';
        return visible || req.user && (req.user.name === clone.owner || req.user.isAdmin)
          ? clone
          : null;
      })
      .map(pkmn => PokemonHandler.pickPokemonFields(pkmn, pokemonFields));
    return res.ok({contents, page, pageSize: Constants.CLONES_LIST_PAGE_SIZE});
  }
}, catchAsyncErrors);
