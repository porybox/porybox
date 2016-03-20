exports.BOX_VISIBILITIES = ['listed', 'unlisted'];
exports.DEFAULT_BOX_VISIBILITY_SETTING = 'listed';
exports.POKEMON_VISIBILITIES = ['private', 'public', 'readonly'];
exports.DEFAULT_POKEMON_VISIBILITY_SETTING = 'readonly';
exports.POKEMON_NOTE_VISIBILITIES = ['private', 'public'];
exports.DEFAULT_POKEMON_NOTE_VISIBILITY_SETTING = 'public';

/* This defines the preferences that are allowed to be changed by the user. Having them here is
* better than simply referencing the UserPreferences model, because that model also contains
* attributes which should not be modifyable by the user (e.g. the `user` attribute of a
* UserPreferences record). */
exports.CHANGEABLE_PREFERENCES = {
  defaultBoxVisibility: {
    enum: exports.BOX_VISIBILITIES,
    defaultsTo: exports.DEFAULT_BOX_VISIBILITY_SETTING
  },
  defaultPokemonVisibility: {
    enum: exports.POKEMON_VISIBILITIES,
    defaultsTo: exports.DEFAULT_POKEMON_VISIBILITY_SETTING
  },
  defaultPokemonNoteVisibility: {
    enum: exports.POKEMON_NOTE_VISIBILITIES,
    defaultsTo: exports.DEFAULT_POKEMON_NOTE_VISIBILITY_SETTING
  }
};

// The number of milliseconds for which deleted boxes/pokemon should be cached before they are permanently deleted.
exports.BOX_DELETION_DELAY = 300000; // (i.e. 5 minutes)
exports.POKEMON_DELETION_DELAY = 300000;

exports.VALID_USERNAME_REGEX = /^[a-zA-Z0-9_-]{1,20}$/;
