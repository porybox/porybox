const ng = require('angular');
const accountCtrl = require('./account.ctrl');
const passwordCtrl = require('./password.ctrl');
const prefsCtrl = require('./prefs.ctrl');
const emailCtrl = require('./email.ctrl');

ng.module('porybox.account', ['ngRoute', 'ngMessages'])
  .config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/account', {
      templateUrl: '/account/account.view.html',
      controller: [accountCtrl],
      controllerAs: 'account'
    });
  }])
  .component('editPassword', {
    templateUrl: 'account/password.view.html',
    controller: ['$scope', 'io', '$mdToast', 'errorHandler', 'escapeRegExp', passwordCtrl],
    controllerAs: 'password'
  })
  .component('editPrefs',{
    bindings: {
      prefs: '='
    },
    templateUrl: 'account/prefs.view.html',
    controller: ['io', '$mdToast', 'errorHandler', prefsCtrl],
    controllerAs: 'prefs'
  })
  .component('editEmail', {
    templateUrl: 'account/email.view.html',
    controller: ['$scope', 'io', '$mdToast', 'errorHandler', emailCtrl],
    controllerAs: 'email'
  });
