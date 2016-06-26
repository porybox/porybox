const angular = require('angular');
const Promise = require('bluebird');
const boxCtrl = require('./box.ctrl.js');
const pokemonCtrl = require('./pokemon.ctrl.js');

/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function($scope, io, $mdDialog, $mdMedia, Upload) {
  this.box = (event) => {
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
    })
    .then((boxInfo) => io.socket.postAsync('/box', boxInfo)))
    .then(res => $scope.$apply(this.boxes.push(res)))
    .catch(console.error.bind(console));
  };

  this.pokemon = (event) => {
    const useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
    return $mdDialog.show({
      controller: ['$mdDialog', '$routeParams', pokemonCtrl],
      controllerAs: 'pkmDialog',
      templateUrl: 'add/pokemon.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen,
      bindToController: true,
      locals: {
        boxes: this.boxes,
        defaultPokemonVisibility: this.prefs.defaultPokemonVisibility
      }
    }).then((files) => {
      files.forEach(({file, visibility, box}) => {
        Upload.upload({
          url: '/uploadpk6',
          data: {pk6: file, visibility, box}
        })
        .then((res) => {
          if (this.selected.selectedBox.id === res.data.box){
            return this.selected.selectedBox.contents.push(res.data);
          }
        });
      });
    })
    .catch(console.log.bind(console));
  };

};
