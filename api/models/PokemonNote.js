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
    destroy () {
      return PokemonNote.destroy({id: this.id});
    }
  }
};
