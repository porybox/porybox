const editCtrl = require('./box-edit.ctrl.js');
const angular = require('angular');

module.exports = function($scope, $routeParams, io, $mdMedia, $mdDialog) {
  this.data = this.data || {contents: []};
  this.id = $routeParams.boxid || this.data.id;
  this.isDeleted = false;

  this.fetch = () => {
    io.socket.getAsync('/b/' + this.id).then(data => {
      Object.assign(this.data, data);
      this.hasFullData = true;
      $scope.$apply();
    }).catch(console.error.bind(console));
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
      templateUrl: 'box/box-edit.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen
    }).then((editedData) => {
      return io.socket.postAsync('/b/' + this.id + '/edit', editedData).then(() => {
        Object.assign(this.data, editedData);
        $scope.$apply();
      });
    })).catch(console.error.bind(console));
  };

  this.delete = () => {
    io.socket.deleteAsync('/b/' + this.id).then(() => {
      this.isDeleted = true;
      $scope.$apply();
    }).catch(console.error.bind(console));
  };

  this.undelete = () => {
    io.socket.postAsync('/b/' + this.id + '/undelete').then(() => {
      this.isDeleted = false;
      $scope.$apply();
    }).catch(console.error.bind(console));
  };
};
