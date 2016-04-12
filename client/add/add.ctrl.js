const angular = require('angular');
const boxCtrl = require('./box.ctrl.js');
const pokemonCtrl = require('./pokemon.ctrl.js');

/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function($scope, io, $mdDialog, $mdMedia, $mdBottomSheet) {
  const self = this;

  this.box = function (event) {
    const useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
    $mdDialog.show({
      controller: ['$mdDialog', boxCtrl],
      controllerAs: 'dialog',
      templateUrl: 'add/box.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen
    })
    .then(function({name, description}) {
      io.socket.post('/box', {
        name: name,
        description: description
      }, function (data, res) {
        if (res.statusCode === 200 || res.statusCode === 201) {
          self.boxes.push(data);
        } else {
          console.log(data);
        }
        $scope.$apply();
      });
    });

    $scope.$watch(function() {
      return $mdMedia('xs') || $mdMedia('sm');
    }, function(wantsFullScreen) {
      $scope.customFullscreen = (wantsFullScreen === true);
    });
  }

  this.pokemon = function (event) {
    $mdBottomSheet.show({
      templateUrl: 'add/pokemon.view.html',
      controller: ['$mdBottomSheet', 'Upload', pokemonCtrl],
      locals: {
        boxes: this.boxes,
        defaultPokemonVisibility: this.prefs[0].defaultPokemonVisibility
      },
      controllerAs: 'pkmDialog',
      bindToController: true,
      parent: angular.element(document.body),
      targetEvent: event
    }).then(function({pokemon}) {
      console.log(pokemon);
    });
  }

}
