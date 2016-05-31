const ng = require('angular');
const pokemonController = require('./pokemon.ctrl');

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
      'pokemon': '='
    },
    templateUrl: 'pokemon/pokemon-card.view.html',
    controller: ['$routeParams', '$http', '$scope', pokemonController],
    controllerAs: 'pokemon'
  }).config(['$routeProvider', function($routeProvider) {
    $routeProvider.
      when('/pokemon/:pokemonid', {
        templateUrl: '/pokemon/pokemon-list.view.html',
        controller: ['$routeParams', '$http', '$scope', pokemonController],
        controllerAs: 'pokemon'
      });
  }]);
