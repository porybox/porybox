const ng = require('angular');
const controller = require('./add.ctrl');

/**
 * [module description]
 * @param  {[type]} "porybox.add" [description]
 * @param  {[type]} []             [description]
 * @return {[type]}                [description]
 */
ng.module('porybox.add', ['porybox.box', 'porybox.pokemon', 'ngMessages', 'ngFileUpload'])
  .component('addMenu',
  {
    bindings: {
      boxes: '=',
      prefs: '=',
      selected: '='
    },
    templateUrl: 'add/add.view.html',
    controller: ['$scope', 'io', '$mdDialog', '$mdMedia', controller],
    controllerAs: 'add'
  });
