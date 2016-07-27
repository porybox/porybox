'use strict';
const ng = require('angular');
const forgotPasswordCtrl = require('./forgotPassword.ctrl');

ng.module('porybox.forgotPassword', ['ngRoute'])
  .config(['$routeProvider', $routeProvider => {
    $routeProvider.when('/forgotPassword', {
      bindings: {user: '='},
      templateUrl: '/forgotPassword/forgotPassword.view.html',
      controller: ['$scope', '$http', '$mdToast', 'errorHandler', forgotPasswordCtrl],
      controllerAs: 'forgotPassword'
    });
  }]);
