// Import libraries
require('babel-polyfill');
const ng = require('angular');
require('angular-material');
require('angular-messages');
require('angular-route');
require('ng-file-upload');
require('angular-sortable-views');
require('angular-marked');
const Promise = require('bluebird');
Promise.config({warnings: false});
import {unescape as unescapeHTML} from 'lodash';

const CSRF_TOKEN = document.getElementById('csrf-token').innerHTML;
const APP_VERSION = document.getElementById('app-version').innerHTML;
const userData = JSON.parse(unescapeHTML(document.getElementById('user-data').innerHTML));

const SERVER_STATUS = JSON.parse(document.getElementById('server-status').innerHTML);

// Import modules
require('./login/login.module.js');
require('./home/home.module.js');
require('./box/box.module.js');
require('./pokemon/pokemon.module.js');
require('./add/add.module.js');
require('./userMenu/user.module.js');
require('./profile/profile.module.js');
require('./account/account.module.js');
require('./static/static.module.js');
require('./passwordReset/passwordReset.module.js');
require('./forgotPassword/forgotPassword.module.js');
require('./cloneList/cloneList.module.js');

const porybox = ng.module('porybox', [
  // Porybox modules
  'porybox.login',
  'porybox.home',
  'porybox.add',
  'porybox.profile',
  'porybox.account',
  'porybox.userMenu',
  'porybox.static',
  'porybox.passwordReset',
  'porybox.forgotPassword',
  'porybox.cloneList',

  // Third party
  'ngMaterial',
  'ngRoute',
  'angular-sortable-view',
  'hc.marked'
]);

porybox.controller('MainCtrl', ['$mdToast', function ($mdToast) {
  this.selected = {};
  this.serverStatus = SERVER_STATUS;
  Object.assign(this, userData);
  // TODO: Figure out a better way to do this
  const LOGGED_IN_ONLY_ROUTES = ['#/prefs', '#/account', '', '#/'];
  const LOGGED_OUT_ONLY_ROUTES = ['#/login'];
  if (!this.user && location.pathname === '/' && LOGGED_IN_ONLY_ROUTES.includes(location.hash)) {
    location.hash = 'home';
  }
  if (this.user && location.pathname === '/' && LOGGED_OUT_ONLY_ROUTES.includes(location.hash)) {
    location.hash = '/';
  }
  // TODO: Disable some buttons clientside in read-only mode
  if (this.serverStatus.readOnly) {
    $mdToast.show(
      $mdToast.simple()
        .textContent('Porybox is temporarily in read-only mode while we perform maintenance.')
        .position('bottom right')
        .hideDelay(5000)
    );
  }
}]);

// Add a ?v=1.0.0 (e.g.) query to all requests for templates
// This avoids browser cache issues when the version number is bumped
porybox.factory('porybox.versionQuery', ['$templateCache', $templateCache => ({request (config) {
  if (config.url.endsWith('.html') && !$templateCache.get(config.url)) {
    config.params = config.params || {};
    config.params.v = APP_VERSION;
  }
  return config;
}})]);

porybox.config(['$mdThemingProvider', $mdThemingProvider => {
  $mdThemingProvider.theme('default')
    .primaryPalette('light-blue', {
      'default': '800',
      'hue-1': '600',
      'hue-2': '900'
    }).accentPalette('pink', {
      'default': 'A100'
    });
}]);

porybox.config(['$routeProvider', $routeProvider => {
  $routeProvider.otherwise({redirectTo: '/'});
}]);

porybox.config(['$httpProvider', function ($httpProvider) {
  $httpProvider.defaults.headers.common['x-csrf-token'] = CSRF_TOKEN;
  $httpProvider.interceptors.push('porybox.versionQuery');
}]);

porybox.config(['markedProvider', markedProvider => {
  markedProvider.setOptions({gfm: true, sanitize: true});
}]);

porybox.config(['$locationProvider', function($locationProvider) {
  $locationProvider.hashPrefix('');
}]);

porybox.config(['$compileProvider', function($compileProvider) {
  $compileProvider.preAssignBindingsEnabled(true);
}]);

porybox.service('io', function () {
  const socket = require('socket.io-client');
  const io = require('sails.io.js')(socket);
  io.sails.headers = {'x-csrf-token': CSRF_TOKEN};
  io.socket.patch = (url, data, cb) => io.socket.request({method: 'PATCH', url, data}, cb);
  // create versions of the io.socket functions that return Promises.
  // e.g. io.socket.getAsync('/api/v1/foo').then(handleResponse).catch(handleErrors)
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
    if (!reason) return;
    console.error(reason); // eslint-disable-line no-console
    if ((reason.statusCode === 405 && reason.body === 'READONLY') ||
        (reason.status === 405 && reason.data === 'READONLY')
    ) {
      return $mdToast.show(
        $mdToast
          .simple()
          .textContent('Request failed; Porybox is currently in read-only mode.')
          .position('bottom right')
      );
    }
    return $mdToast.show(
      $mdToast.simple()
        .textContent('An unexpected error occured.')
        .position('bottom right')
    );
  };
}]);

porybox.service('escapeRegExp', () => {
  return s => typeof s === 'string' && s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
});

ng.bootstrap(document, ['porybox'], {strictDi: true});
