const angular = require('angular');
const Promise = require('bluebird');
const boxCtrl = require('./box.ctrl.js');
const pokemonCtrl = require('./pokemon.ctrl.js');

/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function($scope, io, $mdDialog, $mdMedia, $mdBottomSheet) {
  this.box = event => {
    const useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
    $scope.$watch(function() {
      return $mdMedia('xs') || $mdMedia('sm');
    }, function(wantsFullScreen) {
      $scope.customFullscreen = (wantsFullScreen === true);
    });
    return Promise.resolve($mdDialog.show({
      controller: ['$mdDialog', boxCtrl],
      controllerAs: 'dialog',
      templateUrl: 'add/box.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen
    }).then(({name, description}) => {
      return io.socket.postAsync('/box', {name, description});
    })).then(res => {
      this.boxes.push(res);
    }).catch(console.error.bind(console));
  };

  this.pokemon = function (event) {
    return $mdBottomSheet.show({
      templateUrl: 'add/pokemon.view.html',
      controller: ['$mdBottomSheet', '$routeParams', 'Upload', pokemonCtrl],
      locals: {
        boxes: this.boxes,
        defaultPokemonVisibility: this.prefs.defaultPokemonVisibility
      },
      controllerAs: 'pkmDialog',
      bindToController: true,
      parent: angular.element(document.body),
      targetEvent: event
    });
  };

};
