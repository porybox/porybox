const ng = require('angular');
const controller = require('./home.ctrl');

/**
 * [module description]
 * @param  {[type]} "porybox.home" [description]
 * @param  {[type]} []             [description]
 * @return {[type]}                [description]
 */
ng.module('porybox.home', ['porybox.box', 'porybox.pokemon'])
  .component('homepage',
  {
    bindings: {
      boxes: '='
    },
    templateUrl: 'home/home.view.html',
    controller: controller,
    controllerAs: 'home'
  }).component('index',
  {
    bindings: {},
    templateUrl: 'home/index.view.html',
    controller: controller,
    controllerAs: 'home'
  }).config(['$routeProvider', function ($routeProvider) {
    $routeProvider.
      when('/', {
        templateUrl: '/home/main.view.html'
      });
  }]);
