module.exports = {
  schema: true,
  attributes: {
    id: {
      type: 'string',
      unique: true,
      primaryKey: true
    },
    text: {
      type: 'string',
      required: true
    },
    visibility: {
      enum: Constants.POKEMON_NOTE_VISIBILITIES
    },
    pokemon: {
      model: 'Pokemon'
    },
    _markedForDeletion: {type: 'boolean', defaultsTo: false},
    toJSON () {
      return _.omit(this, (value, key) => key.startsWith('_'));
    }
  },
  beforeCreate (note, next) {
    note.id = Util.generateHexId();
    next(null, note);
  }
};
