const editCtrl = require('./profile-edit.ctrl.js');
const angular = require('angular');

module.exports = function($scope, $routeParams, io, $mdMedia, $mdDialog) {
  this.data = this.data || {};
  this.data.name = this.data.name || $routeParams.username;
  this.errorStatusCode = null;

  this.fetch = () => {
    return io.socket.getAsync(`/user/${this.data.name}`).then(res => {
      Object.assign(this.data, res);
      console.log(this.data.name);
    }).catch(err => {
      this.errorStatusCode = err.statusCode;
    }).then(() => $scope.$apply());
  };

    this.edit = event => {
    const useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
    $scope.$watch(function() {
      return $mdMedia('xs') || $mdMedia('sm');
    }, function(wantsFullScreen) {
      $scope.customFullscreen = (wantsFullScreen === true);
    });
    return Promise.resolve($mdDialog.show({
      locals: {data: this.data},
      bindToController: true,
      controller: ['$mdDialog', editCtrl],
      controllerAs: 'dialog',
      templateUrl: 'profile/profile-edit.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen
    }).then((editedData) => {
      return io.socket.postAsync('/me', editedData).then(() => {
        Object.assign(this.data, editedData);
        $scope.$apply();
      });
    })).catch(console.error.bind(console));
  };
};
