// Import libraries
const ng = require('angular');
require('angular-material');
require('angular-messages');
require('angular-route');
require('ng-file-upload');
const Promise = require('bluebird');

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
    .primaryPalette('light-blue', {
      'default': '600',
      'hue-1': '900'
    })
    .accentPalette('pink', {
      'default': 'A100'
    });

  $routeProvider.otherwise({ redirectTo: '/' });
}]);

porybox.service('io', function () {
  const socket = require('socket.io-client');
  const io = require('sails.io.js')(socket);
  // create versions of the io.socket functions that return Promises.
  // e.g. io.socket.getAsync('/foo').then(handleResponse).catch(handleErrors)
  Promise.promisifyAll(io.socket, {
    promisifier (fn) {
      return function (...args) {
        return new Promise((resolve, reject) => {
          // Resolve the promise if the status code is 2xx.
          fn.call(this, ...args, (d, res) => /^2/.test(res.statusCode) ? resolve(d) : reject(res));
        });
      }
    }
  })
  return io;
});

ng.bootstrap(document, ['porybox']);
