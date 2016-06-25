const ng = require('angular');
const boxController = require('./box.ctrl');

/**
 * [module description]
 * @param  {[type]} "porybox.home" [description]
 * @param  {[type]} []             [description]
 * @return {[type]}                [description]
 */
ng.module('porybox.box', ['ngRoute'])
  .component('boxCard',
  {
    bindings: {
      'data': '=',
      'selected': '='
    },
    templateUrl: 'box/box-card.view.html',
    controller: ['$scope', '$routeParams', 'io', '$mdMedia', '$mdDialog', boxController],
    controllerAs: 'box'
  }).config(['$routeProvider', function($routeProvider) {
    $routeProvider.
      when('/box/:boxid', {
        templateUrl: '/box/box-list.view.html',
        controller: ['$scope', '$routeParams', 'io', '$mdMedia', '$mdDialog', boxController],
        controllerAs: 'box'
      });
  }]);
