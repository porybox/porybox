const editCtrl = require('./profile-edit.ctrl.js');
const angular = require('angular');

module.exports = class Profile {
  constructor ($scope, $routeParams, io, $mdMedia, $mdDialog, errorHandler) {
    this.$scope = $scope;
    this.$routeParams = $routeParams;
    this.io = io;
    this.$mdMedia = $mdMedia;
    this.$mdDialog = $mdDialog;
    this.errorHandler = errorHandler;
    this.data = this.data || {};
    this.name = this.data.name || $routeParams.username;
    this.errorStatusCode = null;
  }
  fetch () {
    return Promise.all([this.fetchInfo(), this.fetchBoxes()]);
  }
  fetchInfo () {
    return this.io.socket.getAsync(`/api/v1/user/${this.name}`).then(res => {
      Object.assign(this.data, res);
    }).catch(err => {
      this.errorStatusCode = err.statusCode;
    }).then(() => this.$scope.$apply());
  }
  fetchBoxes () {
    return this.io.socket.getAsync(`/api/v1/user/${this.name}/boxes`).then(res => {
      this.data.boxes = res;
    }).catch(err => {
      this.errorStatusCode = err.statusCode;
    }).then(() => this.$scope.$apply());
  }
  edit (event) {
    const useFullScreen
      = (this.$mdMedia('sm') || this.$mdMedia('xs')) && this.$scope.customFullscreen;
    this.$scope.$watch(() => {
      return this.$mdMedia('xs') || this.$mdMedia('sm');
    }, wantsFullScreen => {
      this.$scope.customFullscreen = (wantsFullScreen === true);
    });
    return Promise.resolve(this.$mdDialog.show({
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
      return this.io.socket.patchAsync('/api/v1/me', editedData).then(() => {
        Object.assign(this.data, editedData);
        this.$scope.$apply();
      });
    })).catch(this.errorHandler);
  }
};
