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
  verifyUserIsOwner (item, user, {allowAdmin = true, allowDeleted = false} = {}) {
    if (!item || !allowDeleted && item._markedForDeletion) {
      throw {statusCode: 404};
    }
    if (item.owner !== user.name && !(user.isAdmin && allowAdmin)) {
      /* If anyone other than the owner tries to undelete an item, return a 404 error.
      That way, the server doesn't leak information on whether an item with the given ID ever existed. */
      throw {statusCode: item._markedForDeletion ? 404 : 403};
    }
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
  },
  async usernameAvailable (name) {
    if (!_.isString(name) || !Constants.VALID_USERNAME_REGEX.test(name)) {
      return false;
    }
    const existingUser = await User.findOne({name});
    const deletedUser = await DeletedUser.findOne({name});
    return !(existingUser || deletedUser);
  }
};
