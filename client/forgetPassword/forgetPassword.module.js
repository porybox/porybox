'use strict';
const ng = require('angular');
const forgetPasswordCtrl = require('./forgetPassword.ctrl');

ng.module('porybox.forgetPassword', ['ngRoute'])
  .config(['$routeProvider', $routeProvider => {
    $routeProvider.when('/forgetPassword', {
      bindings: {user: '='},
      templateUrl: '/forgetPassword/forgetPassword.view.html',
      controller: ['$scope', '$http', '$mdToast', 'errorHandler', forgetPasswordCtrl],
      controllerAs: 'forgetPassword'
    });
  }]);
