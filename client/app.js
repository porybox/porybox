// Import libraries
require('babel-polyfill');
const ng = require('angular');
require('angular-material');
require('angular-messages');
require('angular-route');
require('ng-file-upload');
require('ngsilent');
require('angular-sortable-views');
const Promise = require('bluebird');
Promise.config({warnings: false});

const CSRF_TOKEN = document.getElementById('csrf-token').innerHTML;

// Import modules
require('./login/login.module.js');
require('./home/home.module.js');
require('./box/box.module.js');
require('./pokemon/pokemon.module.js');
require('./add/add.module.js');
require('./userMenu/user.module.js');
require('./profile/profile.module.js');

const porybox = ng.module('porybox', [
  // Porybox modules
  'porybox.login',
  'porybox.home',
  'porybox.add',
  'porybox.profile',
  'porybox.userMenu',

  // Third party
  'ngMaterial',
  'ngSilent',
  'ngRoute',
  'angular-sortable-view'
]);

porybox.controller('MainCtrl', ['$rootScope', function ($rootScope) {
  $rootScope.location = location;
  this.boxes = [];
  this.selected = {};
  this.init = function ({boxes, user, prefs, selectedBox}) {
    this.boxes = boxes;
    this.user = user;
    if (!this.user && location.pathname === '/' && ['', '#/'].indexOf(location.hash) !== -1) {
      location.hash = 'home';
    }
    this.prefs = prefs;
    this.selected.box = selectedBox;
  };
}]);

porybox.config(['$mdThemingProvider','$routeProvider',function(
  $mdThemingProvider,
  $routeProvider
) {
  $mdThemingProvider.theme('default')
    .primaryPalette('light-blue', {
      'default': '800',
      'hue-1': '600',
      'hue-2': '900'
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
            return /^2/.test(res.statusCode) ? resolve(d) : reject(res);
          });
        });
      };
    }
  });
  return io;
});

porybox.service('errorHandler', ['$mdToast', function ($mdToast) {
  return reason => {
    console.error(reason);
    $mdToast.show(
      $mdToast.simple().textContent('An unexpected error occured.').position('bottom right')
    );
  };
}]);

ng.bootstrap(document, ['porybox'], {strictDi: true});
