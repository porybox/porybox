const attributes = _.clone(Constants.CHANGEABLE_PREFERENCES);
attributes.user = {model: 'User', unique: true, primaryKey: true};
attributes.toJSON = function () {
  return _.omit(this, (value, key) => {
    return key.startsWith('_') || ['createdAt', 'updatedAt', 'id'].includes(key);
  });
};
module.exports = {schema: true, attributes};
