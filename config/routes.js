/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes map URLs to views and controllers.
 *
 * If Sails receives a URL that doesn't match any of the routes below,
 * it will check for matching files (images, scripts, stylesheets, etc.)
 * in your assets directory.  e.g. `http://localhost:1337/images/foo.jpg`
 * might match an image file: `/assets/images/foo.jpg`
 *
 * Finally, if those don't match either, the default 404 handler is triggered.
 * See `api/responses/notFound.js` to adjust your app's 404 logic.
 *
 * Note: Sails doesn't ACTUALLY serve stuff from `assets`-- the default Gruntfile in Sails copies
 * flat files from `assets` to `.tmp/public`.  This allows you to do things like compile LESS or
 * CoffeeScript for the front-end.
 *
 * For more information on configuring custom routes, check out:
 * http://sailsjs.org/#!/documentation/concepts/Routes/RouteTargetSyntax.html
 */

module.exports.routes = {

  '/': 'HomeController.index',

  // Boxes

  'post /box': 'BoxController.add',
  'get /b/:id': 'BoxController.get',
  'get /boxes/mine': 'BoxController.mine',
  'delete /b/:id': 'BoxController.delete',
  'post /b/:id/undelete': 'BoxController.undelete',
  'post /b/:id/edit': 'BoxController.edit',

  // Authentication

  'get /login': 'AuthController.login',
  'post /logout': 'AuthController.logout',
  'get /register': 'AuthController.register',

  'post /auth/local': 'AuthController.callback',
  'post /auth/local/:action': 'AuthController.callback',

  'get /auth/:provider': 'AuthController.provider',
  'get /auth/:provider/callback': 'AuthController.callback',
  'get /auth/:provider/:action': 'AuthController.callback',

  // Pokemon

  'get /uploadpk6': 'HomeController.uploadpk6',
  'post /uploadpk6': 'PokemonController.uploadpk6',

  'get /p/:id': 'PokemonController.get',
  'get /p/:id/download': 'PokemonController.download',
  'delete /p/:id': 'PokemonController.delete',
  'post /p/:id/undelete': 'PokemonController.undelete',
  'get /pokemon/mine': 'PokemonController.mine',
  'post /p/:id/move': 'PokemonController.move',
  'post /p/:id/note': 'PokemonController.addNote',
  'delete /p/:id/n/:noteId': 'PokemonController.deleteNote',
  'post /p/:id/n/:noteId/edit': 'PokemonController.editNote',
  'post /p/:id/edit': 'PokemonController.edit',

  // Users
  'get /user/:name': 'UserController.get',
  'get /user/:name/boxes': 'UserController.boxes',
  'get /api/v1/me': 'UserController.me',
  'get /preferences': 'UserController.getPreferences',
  'post /preferences/edit': 'UserController.editPreferences',
  'post /editAccountInfo': 'UserController.editAccountInfo',
  'post /user/:name/grantAdminStatus': 'UserController.grantAdminStatus',
  'post /user/:name/revokeAdminStatus': 'UserController.revokeAdminStatus',
  'post /deleteAccount': 'UserController.deleteAccount',
  'post /changePassword': 'UserController.changePassword',
  'get /checkUsernameAvailable': 'UserController.checkUsernameAvailable'
};
