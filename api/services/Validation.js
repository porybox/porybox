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
  }
};
