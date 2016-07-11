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

  'get /': 'HomeController.index',
  'get /faq': 'HomeController.faq',
  'get /about': 'HomeController.about',
  'get /donate': 'HomeController.donate',
  'get /privacy-policy': 'HomeController.privacyPolicy',
  'get /tos': 'HomeController.tos',
  'get /extracting-pk6-files': 'HomeController.extractingPk6Files',
  'get /how-to-pk6-1-bvs': 'HomeController.howToPk6Bvs',
  'get /how-to-pk6-2-homebrew': 'HomeController.howToPk6Homebrew',
  'get /how-to-pk6-3-4-save-files': 'HomeController.howToPk6SaveFiles',
  'get /how-to-pk6-6-decrypted-powersaves': 'HomeController.howToPk6DecryptedPowersaves',

  // Boxes

  'post /box': 'BoxController.add',
  'get /box/:id': 'BoxController.get',
  'get /me/boxes': 'BoxController.mine',
  'delete /box/:id': 'BoxController.delete',
  'post /box/:id/undelete': 'BoxController.undelete',
  'post /box/:id': 'BoxController.edit',

  // Authentication

  'post /logout': 'AuthController.logout',

  'post /auth/local': 'AuthController.callback',
  'post /auth/local/:action': 'AuthController.callback',

  'get /auth/:provider': 'AuthController.provider',
  'get /auth/:provider/callback': 'AuthController.callback',
  'get /auth/:provider/:action': 'AuthController.callback',

  // Pokemon

  'post /pokemon': 'PokemonController.uploadpk6',
  'post /pokemon/multi': 'PokemonController.uploadMultiPk6',

  'get /pokemon/:id': 'PokemonController.get',
  'get /pokemon/:id/pk6': 'PokemonController.download',
  'delete /pokemon/:id': 'PokemonController.delete',
  'post /pokemon/:id/undelete': 'PokemonController.undelete',
  'post /pokemon/:id/move': 'PokemonController.move',
  'post /pokemon/:id': 'PokemonController.edit',

  // Users
  'get /user/:name': 'UserController.get',
  'get /user/:name/boxes': 'UserController.boxes',
  'get /me': 'UserController.me',
  'get /me/preferences': 'UserController.getPreferences',
  'post /me/preferences': 'UserController.editPreferences',
  'post /me': 'UserController.editAccountInfo',
  'post /user/:name/grantAdminStatus': 'UserController.grantAdminStatus',
  'post /user/:name/revokeAdminStatus': 'UserController.revokeAdminStatus',
  'delete /me': 'UserController.deleteAccount',
  'post /changePassword': 'UserController.changePassword',
  'get /checkUsernameAvailable': 'UserController.checkUsernameAvailable'
};
