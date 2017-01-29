/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your controllers.
 * You can apply one or more policies to a given controller, or protect
 * its actions individually.
 *
 * Any policy file (e.g. `api/policies/authenticated.js`) can be accessed
 * below by its filename, minus the extension, (e.g. "authenticated")
 *
 * For more information on how policies work, see:
 * http://sailsjs.org/#!/documentation/concepts/Policies
 *
 * For more information on configuring policies, check out:
 * http://sailsjs.org/#!/documentation/reference/sails.config/sails.config.policies.html
 */

const anyone = ['readOnlyMode', 'passport'];
const user = ['readOnlyMode', 'passport', 'sessionAuth'];
const passwordProtected = ['readOnlyMode', 'passport', 'sessionAuth', 'passwordRequired'];
const admin = ['readOnlyMode', 'passport', 'sessionAuth', 'isAdmin'];

module.exports.policies = {

  '*': admin,

  AuthController: {
    logout: user,
    provider: anyone,
    callback: anyone,
    disconnect: anyone
  },

  HomeController: {
    index: anyone
  },

  PokemonController: {
    uploadpk6: user,
    uploadMultipleFiles: user,
    get: anyone,
    delete: user,
    undelete: user,
    mine: user,
    download: anyone,
    move: user,
    addNote: user,
    deleteNote: user,
    editNote: user,
    edit: user,
    getClones: anyone
  },

  BoxController: {
    add: user,
    get: anyone,
    mine: user,
    delete: user,
    undelete: user,
    edit: user
  },

  UserController: {
    get: anyone,
    boxes: anyone,
    me: user,
    getPreferences: user,
    editPreferences: user,
    editAccountInfo: user,
    deleteAccount: passwordProtected,
    changePassword: passwordProtected,
    changeEmail: passwordProtected,
    checkUsernameAvailable: anyone,
    forgotUsername: anyone
  },

  PasswordResetController: {
    create: anyone,
    get: anyone,
    delete: anyone
  }
};
