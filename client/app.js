// Import libraries
require('babel-polyfill');
const ng = require('angular');
require('angular-material');
require('angular-messages');
require('angular-route');
require('ng-file-upload');
const Promise = require('bluebird');

const CSRF_TOKEN = document.getElementById('csrf-token').innerHTML;

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
    if (!this.user && location.pathname === '/' && ['', '#/'].indexOf(location.hash) !== -1) {
      location.hash = 'home';
    }
    this.prefs = prefs;
  };
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

porybox.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.defaults.headers.common['x-csrf-token'] = CSRF_TOKEN;
}]);

porybox.service('io', function () {
  const socket = require('socket.io-client');
  const io = require('sails.io.js')(socket);
  io.sails.headers = {'x-csrf-token': CSRF_TOKEN};
  // create versions of the io.socket functions that return Promises.
  // e.g. io.socket.getAsync('/foo').then(handleResponse).catch(handleErrors)
  Promise.promisifyAll(io.socket, {
    promisifier (fn) {
      return function (...args) {
        return new Promise((resolve, reject) => {
          // Resolve the promise if the status code is 2xx.
          fn.call(this, ...args, (d, res) => {
            return /^2/.test(res.statusCode) ? resolve(d) : reject(Object.assign(new Error, res));
          });
        });
      };
    }
  });
  return io;
});

ng.bootstrap(document, ['porybox']);
