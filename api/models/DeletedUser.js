module.exports = {
  schema: true,
  attributes: {
    name: {
      required: true,
      type: 'string',
      unique: true,
      primaryKey: true
    }
  }
};
