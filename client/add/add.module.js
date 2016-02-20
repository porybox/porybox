const ng = require('angular');
const controller = require('./add.ctrl');

/**
 * [module description]
 * @param  {[type]} "porybox.add" [description]
 * @param  {[type]} []             [description]
 * @return {[type]}                [description]
 */
ng.module('porybox.add', ['porybox.box'])
  .component('addMenu',
  {
    bindings: {
      boxes: '='
    },
    templateUrl: 'add/add.view.html',
    controller: ['$scope', 'io', controller],
    controllerAs: 'add'
  });
