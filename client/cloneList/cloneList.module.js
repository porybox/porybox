'use strict';
const ng = require('angular');
const cloneListCtrl = require('./cloneList.ctrl');

ng.module('porybox.cloneList', ['ngRoute'])
  .config(['$routeProvider', $routeProvider => {
    $routeProvider.when('/pokemon/:id/duplicates', {
      templateUrl: 'cloneList/cloneList.view.html',
      controller: [
        '$scope',
        '$routeParams',
        'io',
        'errorHandler',
        cloneListCtrl
      ],
      controllerAs: 'cloneList'
    });
  }]);
