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

  'post /api/v1/box': 'BoxController.add',
  'get /api/v1/box/:id': 'BoxController.get',
  'get /api/v1/me/boxes': 'BoxController.mine',
  'delete /api/v1/box/:id': 'BoxController.delete',
  'post /api/v1/box/:id/undelete': 'BoxController.undelete',
  'patch /api/v1/box/:id': 'BoxController.edit',

  // Authentication

  'post /api/v1/logout': 'AuthController.logout',

  'post /api/v1/auth/local': 'AuthController.callback',
  'post /api/v1/auth/local/:action': 'AuthController.callback',

  'get /api/v1/auth/:provider': 'AuthController.provider',
  'get /api/v1/auth/:provider/callback': 'AuthController.callback',
  'get /api/v1/auth/:provider/:action': 'AuthController.callback',

  // Pokemon

  'post /api/v1/pokemon': 'PokemonController.uploadpk6',
  'post /api/v1/pokemon/multi': 'PokemonController.uploadMultiPk6',

  'get /api/v1/pokemon/:id': 'PokemonController.get',
  'get /api/v1/pokemon/:id/pk6': 'PokemonController.download',
  'delete /api/v1/pokemon/:id': 'PokemonController.delete',
  'post /api/v1/pokemon/:id/undelete': 'PokemonController.undelete',
  'post /api/v1/pokemon/:id/move': 'PokemonController.move',
  'patch /api/v1/pokemon/:id': 'PokemonController.edit',

  // Users
  'get /api/v1/user/:name': 'UserController.get',
  'get /api/v1/user/:name/boxes': 'UserController.boxes',
  'get /api/v1/me': 'UserController.me',
  'get /api/v1/me/preferences': 'UserController.getPreferences',
  'patch /api/v1/me/preferences': 'UserController.editPreferences',
  'patch /api/v1/me': 'UserController.editAccountInfo',
  'post /api/v1/user/:name/grantAdminStatus': 'UserController.grantAdminStatus',
  'post /api/v1/user/:name/revokeAdminStatus': 'UserController.revokeAdminStatus',
  'delete /api/v1/me': 'UserController.deleteAccount',
  'post /api/v1/changePassword': 'UserController.changePassword',
  'get /api/v1/checkUsernameAvailable': 'UserController.checkUsernameAvailable'
};
