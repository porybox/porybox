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
    controller: [
      '$scope', '$location', 'io', '$mdDialog', '$mdMedia', '$mdToast', 'errorHandler', controller
    ],
    controllerAs: 'add'
  })
  .component('addPokemon',
  {
    bindings: {
      boxes: '=',
      prefs: '=',
      selected: '='
    },
    template: '<md-button class="md-raised md-primary" ng-click="add.pokemon($event)">Add Pokémon</md-button>',
    controller: [
      '$scope', '$location', 'io', '$mdDialog', '$mdMedia', '$mdToast', 'errorHandler', controller
    ],
    controllerAs: 'add'
  });
