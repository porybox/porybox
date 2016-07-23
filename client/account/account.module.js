const ng = require('angular');
const accountCtrl = require('./account.ctrl');
const passwordCtrl = require('./password.ctrl');
const infoCtrl = require('./info.ctrl');
const prefsCtrl = require('./prefs.ctrl');

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
    controller: ['$scope', 'io', '$mdToast', 'errorHandler', passwordCtrl],
    controllerAs: 'password'
  })
  .component('editInfo', {
    bindings: {
      email: '='
    },
    templateUrl: 'account/info.view.html',
    controller: ['io', '$mdToast', 'errorHandler', infoCtrl],
    controllerAs: 'info'
  })
  .component('editPrefs',{
    bindings: {
      prefs: '='
    },
    templateUrl: 'account/prefs.view.html',
    controller: ['io', '$mdToast', 'errorHandler', prefsCtrl],
    controllerAs: 'prefs'
  });
