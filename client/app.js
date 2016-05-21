// Import libraries
const ng = require('angular');
require('angular-material');
require('angular-messages');
require('angular-route');
require('ng-file-upload');

// Import modules
require('./login/login.module.js');
require('./home/home.module.js');
require('./box/box.module.js');
require('./pokemon/pokemon.module.js');
require('./add/add.module.js');
require('./userMenu/user.module.js');

const porybox = ng.module('porybox', [
  // Porybox modules
  'porybox.login',
  'porybox.home',
  'porybox.add',
  'porybox.userMenu',

  // Third party
  'ngMaterial',
  'ngRoute'
]);

porybox.controller('MainCtrl', function () {
  this.boxes = [];
  this.init = function ({boxes, user, prefs}) {
    this.boxes = boxes;
    this.user = user;
    this.prefs = prefs;
  }
});

porybox.config(['$mdThemingProvider','$routeProvider',function(
  $mdThemingProvider,
  $routeProvider
) {
  $mdThemingProvider.theme('default')
    .primaryPalette('light-blue')
    .accentPalette('pink', {
      default: 'A200'
    })

  $routeProvider.otherwise({ redirectTo: '/' });
}]);

porybox.service('io', function () {
  const socket = require('socket.io-client');
  const io = require('sails.io.js')(socket);
  return io;
});

ng.bootstrap(document, ['porybox']);
