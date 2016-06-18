module.exports =  {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    name: {
      type: 'string',
      required: true
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
      enum: Constants.BOX_VISIBILITIES,
      defaultsTo: 'listed'
    },
    contents: {
      collection: 'pokemon',
      via: 'box',
      defaultsTo: []
    },
    /* Stores the list of Pokémon IDs that this box contains, in the order that they should be displayed to the user.
    Note: This should never be sent to the client (especially to someone other than the box owner), because this
    will contain the IDs of private Pokémon in a box, leaking their existence. (Since this property starts with a '_',
    it is not included in JSON responses anyway -- see the toJSON method in this model.) */
    _orderedIds: {
      type: 'array',
      defaultsTo: []
    },
    id: {
      type: 'string',
      unique: true,
      primaryKey: true
    },
    _markedForDeletion: {
      type: 'boolean',
      defaultsTo: false
    },

    async markForDeletion () {
      const populated = await Box.findOne({id: this.id}).populate('contents');
      populated._markedForDeletion = true;
      await Promise.each(populated.contents, pkmn => pkmn.markForDeletion());
      return populated.save();
    },

    async unmarkForDeletion () {
      const populated = await Box.findOne({id: this.id}).populate('contents');
      populated._markedForDeletion = false;
      await Promise.each(populated.contents, pkmn => pkmn.unmarkForDeletion());
      return populated.save();
    },

    async destroy () {
      /* Find all the pokemon and note IDs rather than calling pokemon.destroy() on each pokemon. This
      allows all the notes to be deleted with one database query. */
      const contents = (await Box.findOne({id: this.id}).populate('contents')).contents;
      const allContentIds = _.map(contents, 'id');
      const allNoteIds = _.flatten(_.map(contents, 'notes'));
      return Promise.all([
        Box.destroy({id: this.id}),
        Pokemon.destroy({id: allContentIds}),
        PokemonNote.destroy({id: allNoteIds})
      ]).get(0);
    },

    /* Omit internal properties (i.e. properties that start with '_') when converting to JSON.
    Conveniently, this means that the internal properties are never sent to the client.
    (Not to be confused with the omitPrivateContents function, which removes *confidential* data.) */
    toJSON () {
      return _.omit(this, (value, key) => key.startsWith('_'));
    }
  },
  beforeCreate (box, next) {
    box.id = Util.generateHexId();
    next(null, box);
  },
  afterCreate (box, next) {
    User.findOne({name: box.owner}).then(user => {
      user._orderedBoxIds.push(box.id);
      return user.save();
    }).asCallback(next);
  },
  afterDestroy (destroyedBoxes, next) {
    Promise.each(destroyedBoxes, box => {
      return User.findOne({name: box.owner}).then(user => {
        _.remove(user._orderedBoxIds, id => id === box.id);
        return user.save();
      });
    }).asCallback(next);
  }
};
