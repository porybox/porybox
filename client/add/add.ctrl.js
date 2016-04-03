const angular = require('angular');
const controller = require('./box.ctrl.js');

/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function($scope, io, $mdDialog, $mdMedia) {
  const self = this;

  this.box = function (event) {
    const useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
    $mdDialog.show({
      controller: ['$mdDialog', controller],
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

}
