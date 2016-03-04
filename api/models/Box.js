module.exports =  {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    name: {
      type: 'string'
    },
    owner: {
      model: 'user',
      required: true
    },
    description: {
      type: 'string',
      defaultsTo: ''
    },
    visibility: {
      enum: ['listed', 'unlisted'],
      defaultsTo: 'listed'
    },
    contents: {
      collection: 'pokemon',
      via: 'box',
      defaultsTo: []
    },
    id: {
      type: 'string',
      unique: true,
      primaryKey: true
    },
    omitPrivateContents () {
      return _.assign(_.clone(this), {contents: _(this.contents).map(pokemon => {
        return pokemon.visibility === 'public' ? pokemon : pokemon.omitPrivateData();
      }).reject(pokemon => pokemon.visibility === 'private').value()});
    }
  }
};
