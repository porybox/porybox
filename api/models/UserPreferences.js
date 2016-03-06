const attributes = _.clone(Constants.CHANGEABLE_PREFERENCES);
attributes.user = {model: 'User', unique: true, primaryKey: true};
module.exports = {schema: true, attributes};
