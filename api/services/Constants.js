exports.BOX_VISIBILITIES = ['listed', 'unlisted'];
exports.DEFAULT_BOX_VISIBILITY_SETTING = 'listed';
exports.POKEMON_VISIBILITIES = ['private', 'public', 'viewable'];
exports.DEFAULT_POKEMON_VISIBILITY_SETTING = 'viewable';
exports.GENERATIONS = [6, 7];

exports.MAX_BOX_SIZE = 3000;

exports.MAX_BOX_NAME_LENGTH = 300;
exports.MAX_BOX_DESCRIPTION_LENGTH = 1000;
exports.MAX_POKEMON_NOTE_LENGTH = 2000;
exports.BOX_PAGE_SIZE = 30;
exports.CLONES_LIST_PAGE_SIZE = 30;

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
  }
};

// The number of milliseconds for which deleted boxes/pokemon should be cached before they are permanently deleted.
exports.BOX_DELETION_DELAY = 300000; // (i.e. 5 minutes)
exports.POKEMON_DELETION_DELAY = 300000;

exports.PASSWORD_RESET_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours

exports.VALID_USERNAME_REGEX = /^[a-zA-Z0-9_-]{1,20}$/;
exports.FRIEND_CODE_REGEX = /^\d{4}-\d{4}-\d{4}$/;
exports.IGN_REGEX = /^.{1,12}$/;
exports.TSV_REGEX = /^([0-3]\d{3}|40([0-8]\d|9[0-5]))$/; // (matches any 4-digit string between 0000 and 4095, inclusive)

exports.PROHIBITED_UPLOADS = [
  {props: {dexNo: 646, formId: 1}, reason: 'Kyurem-White may not be uploaded'},
  {props: {dexNo: 646, formId: 2}, reason: 'Kyurem-Black may not be uploaded'}
];

exports.FIRST_BOX_NAME = 'Box 1';
// eslint-disable-next-line
exports.FIRST_BOX_DESCRIPTION = 'This is your first box! Select it to view/edit its information, or use the + button to add Pokémon.'

exports.MAX_MULTI_UPLOAD_SIZE = 50;
