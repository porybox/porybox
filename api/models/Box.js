module.exports =  {
  // Enforce model schema in the case of schemaless databases
  schema: true,

  attributes: {
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: Constants.BOX_NAME_LENGTH_LIMIT
    },
    owner: {
      model: 'user',
      required: true
    },
    description: {
      type: 'string',
      defaultsTo: '',
      maxLength: Constants.BOX_DESCRIPTION_LENGTH_LIMIT
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
      await Pokemon.update({box: this.id}, {_markedForDeletion: true});
      return Box.update({id: this.id}, {_markedForDeletion: true});
    },

    async unmarkForDeletion () {
      await Pokemon.update({box: this.id}, {_markedForDeletion: false});
      return Box.update({id: this.id}, {_markedForDeletion: false});
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

    addPkmnId (id, position) {
      return Promise.fromCallback(Box.native.bind(Box)).then(collection => {
        const query = {$push: {_orderedIds: {$each: [id]}}};
        if (_.isNumber(position)) {
          query.$push._orderedIds.$position = position;
        }
        return collection.update({_id: this.id}, query);
      });
    },

    removePkmnId (id) {
      return Promise.fromCallback(Box.native.bind(Box)).then(collection => {
        return collection.update({_id: this.id}, {$pull: {_orderedIds: id}});
      });
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
    User.findOne({name: box.owner}).then(user => user.addBoxId(box.id)).asCallback(next);
  },
  afterDestroy (destroyedBoxes, next) {
    Promise.each(destroyedBoxes, box => {
      return User.findOne({name: box.owner}).then(user => user.removeBoxId(box.id)).asCallback(next);
    });
  }
};
