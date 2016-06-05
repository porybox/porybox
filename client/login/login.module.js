const ng = require('angular');
const controller = require('./login.ctrl');

/**
 * [module description]
 * @param  {[type]} "porybox.home" [description]
 * @param  {[type]} []             [description]
 * @return {[type]}                [description]
 */
ng.module('porybox.login', ['ngRoute'])
  .component('loginForm',
  {
    bindings: {},
    templateUrl: 'login/login.view.html',
    controller: controller,
    controllerAs: 'auth'
  })
  .component('registrationForm',
  {
    bindings: {},
    templateUrl: 'login/register.view.html',
    controller: controller,
    controllerAs: 'auth'
  }).config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/login', {
      templateUrl: '/login/login-page.view.html'
    })
  }]);
