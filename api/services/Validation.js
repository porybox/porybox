module.exports = {
  filterParams (allParams, legalParams, {throwOnEmpty = true} = {}) {
    const filtered = _.pick(allParams, _.isArray(legalParams) ? legalParams : _.keys(legalParams));
    if (_.isEmpty(filtered) && throwOnEmpty) {
      throw {statusCode: 400, message: 'No valid parameters specified'};
    }
    return filtered;
  },
  requireParams (allParams, requiredValues, {requireStrings = true} = {}) {
    _.forEach(_.isArray(requiredValues) ? requiredValues : [requiredValues], param => {
      if (!_.has(allParams, param) || requireStrings && !_.isString(allParams[param])) {
        throw {statusCode: 400, message: `Invalid/missing required parameter '${param}'`};
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
      throw item._markedForDeletion
        ? {statusCode: 404}
        : {statusCode: 403};
    }
  },
  verifyBoxParams (params) {
    if (!_.isUndefined(params.name)) {
      if (!_.isString(params.name || _.isEmpty(params.name))) {
        throw {statusCode: 400, message: 'Invalid/missing box name'};
      }
      if (params.name.length > Constants.MAX_BOX_NAME_LENGTH) {
        throw {statusCode: 400, message: 'Box name too long'};
      }
    }
    if (!_.isUndefined(params.description)) {
      if (params.description && !_.isString(params.description)) {
        throw {statusCode: 400, message: 'Invalid box description'};
      }
      if (params.description.length > Constants.MAX_BOX_DESCRIPTION_LENGTH) {
        throw {statusCode: 400, message: 'Box description too long'};
      }
    }
    if (!_.isUndefined(params.visibility)
        && !Constants.BOX_VISIBILITIES.includes(params.visibility)) {
      throw {statusCode: 400, message: 'Invalid box visibility'};
    }
  },
  verifyPokemonParams (params) {
    if (!_.isUndefined(params.visibility)
        && !Constants.POKEMON_VISIBILITIES.includes(params.visibility)) {
      throw {statusCode: 400, message: 'Invalid Pokémon visibility'};
    }
    if (!_.isUndefined(params.publicNotes)) {
      if (!_.isString(params.publicNotes)) {
        throw {statusCode: 400, message: 'Invalid publicNotes'};
      }
      if (params.publicNotes.length > Constants.MAX_POKEMON_NOTE_LENGTH) {
        throw {statusCode: 400, message: 'Public notes too long'};
      }
    }
    if (!_.isUndefined(params.privateNotes)) {
      if (!_.isString(params.privateNotes)) {
        throw {statusCode: 400, message: 'Invalid privateNotes'};
      }
      if (params.privateNotes.length > Constants.MAX_POKEMON_NOTE_LENGTH) {
        throw {statusCode: 400, message: 'Private notes too long'};
      }
    }
  },
  assert (value, message) {
    // These are assertions used for client input; they will sometimes be false if the client has erred.
    if (!value) throw {statusCode: 400, message};
  },
  sanityCheck (value, message = 'Assertion error') {
    /* These are assertions that should never be false, but that are worth checking anyway to prevent catastrophes if
    they are unexpectedly false. */
    if (!value) throw new Error(message);
  },
  usernameValid (name) {
    return _.isString(name) && Constants.VALID_USERNAME_REGEX.test(name);
  },
  async usernameAvailable (name) {
    if (!Validation.usernameValid(name)) {
      return false;
    }
    const existingUser = await User.findOne({name});
    const deletedUser = await DeletedUser.findOne({name});
    return !(existingUser || deletedUser);
  }
};
