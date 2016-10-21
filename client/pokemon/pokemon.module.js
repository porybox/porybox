const ng = require('angular');
const pokemonController = require('./pokemon.ctrl');
const controllerDeps = [
  '$routeParams',
  '$scope',
  'io',
  '$mdMedia',
  '$mdDialog',
  '$mdToast',
  'errorHandler'
];

/**
 * [module description]
 * @param  {[type]} "porybox.home" [description]
 * @param  {[type]} []             [description]
 * @return {[type]}                [description]
 */
ng.module('porybox.pokemon', ['ngRoute'])
  .component('pokemonCard',
  {
    bindings: {
      data: '=',
      boxes: '=',
      bulkEditMode: '=',
      selectedPokemon: '=',
      selectPokemon: '='
    },
    templateUrl: 'pokemon/pokemon-card.view.html',
    controller: [...controllerDeps, pokemonController],
    controllerAs: 'pokemon'
  }).component('pokemonIcon',
  {
    bindings: {
      data: '=',
      boxes: '='
    },
    templateUrl: 'pokemon/pokemon-icon.view.html',
    controller: [...controllerDeps, pokemonController],
    controllerAs: 'pokemon'
  }).config(['$routeProvider', function($routeProvider) {
    $routeProvider.
      when('/pokemon/:pokemonid', {
        templateUrl: '/pokemon/pokemon-full.view.html',
        controller: [...controllerDeps, pokemonController],
        controllerAs: 'pokemon'
      });
  }]);
