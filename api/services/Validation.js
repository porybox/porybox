module.exports = {
  filterParams (allParams, legalParams, {throwOnEmpty = true} = {}) {
    const filtered = _.pick(allParams, _.isArray(legalParams) ? legalParams : _.keys(legalParams));
    if (_.isEmpty(filtered) && throwOnEmpty) {
      throw {statusCode: 400, message: 'No valid parameters specified'};
    }
    return filtered;
  },
  requireParams (allParams, requiredValues) {
    _.forEach(_.isArray(requiredValues) ? requiredValues : [requiredValues], param => {
      if (!_.has(allParams, param)) {
        throw {statusCode: 400, message: `Missing parameter ${param}`};
      }
    });
  },
  async verifyUserIsOwner (
    model,
    {user, id, allowAdmin = true, allowDeleted = false, populate = []}
  ) {
    const queryParams = {id};
    if (!allowDeleted) {
      queryParams._markedForDeletion = false;
    }
    const item = await model.findOne(queryParams).populate(populate || []);
    if (!item) {
      throw {statusCode: 404};
    }
    if (item.owner === user.name || user.isAdmin && allowAdmin) {
      return item;
    }
    if (item._markedForDeletion) {
      /* If anyone other than the owner tries to undelete the pokemon, return a 404 error.
      That way, the server doesn't leak information on whether a pokemon with the given ID ever existed. */
      throw {statusCode: 404};
    }
    throw {statusCode: 403};
  },
  verifyUserIsPokemonOwner (...args) {
    return module.exports.verifyUserIsOwner(Pokemon, ...args);
  },
  verifyUserIsBoxOwner (...args) {
    return module.exports.verifyUserIsOwner(Box, ...args);
  },
  verifyBoxParams (box) {
    if (!_.isString(box.name) || _.isEmpty(box.name)) {
      throw {statusCode: 400, message: 'Invalid box name'};
    }
    if (box.description && !_.isString(box.description)) {
      throw {statusCode: 400, message: 'Invalid box description'};
    }
    if (!Constants.BOX_VISIBILITIES.includes(box.visibility)) {
      throw {statusCode: 400, message: 'Invalid box visibility'};
    }
  },
  verifyPokemonParams (pokemon) {
    if (!Constants.POKEMON_VISIBILITIES.includes(pokemon.visibility)) {
      throw {statusCode: 400, message: 'Invalid pokemon visibility'};
    }
  },
  verifyPokemonNoteParams (note) {
    if (!_.isString(note.text) || _.isEmpty(note.text)) {
      throw {statusCode: 400, message: 'Invalid note text'};
    }
    if (!Constants.POKEMON_NOTE_VISIBILITIES.includes(note.visibility)) {
      throw {statusCode: 400, message: 'Invalid note visibility'};
    }
  }
};
