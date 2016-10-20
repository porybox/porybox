const Promise = require('bluebird');
module.exports = class ForgotPassword {
  constructor ($scope, $http, $mdToast, errorHandler) {
    this.$scope = $scope;
    this.$http = $http;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
  }
  sendPasswordRequest () {
    return Promise.resolve(this.$http({
      method: 'POST',
      url: `/api/v1/user/${this.resetName}/passwordReset`
    })).then(() => {
      this.resetName = '';
      this.$scope.forgotForm.$setPristine();
      this.$scope.forgotForm.$setUntouched();
      this.$mdToast.show(this.$mdToast.simple()
        .textContent('Password reset link sent; please check your email.')
        .position('bottom right')
        .hideDelay(4000));
    }).catch({status: 404}, () => this.$scope.forgotForm.user.$setValidity('exists', false))
      .then(() => this.$scope.$apply())
      .catch(this.errorHandler);
  }
  sendUsernameRequest () {
    return Promise.resolve(this.$http({
      method: 'POST',
      url: `/api/v1/user/${window.encodeURIComponent(this.resetEmail)}/forgotUsername`
    })).then(() => {
      this.resetEmail = '';
      this.$scope.forgotForm.$setPristine();
      this.$scope.forgotForm.$setUntouched();
      this.$mdToast.show(this.$mdToast.simple()
        .textContent('If an account exists, we have sent your username; please check your email.')
        .position('bottom right')
        .hideDelay(4000));
    }).then(() => this.$scope.$apply())
      .catch(this.errorHandler);
  }
};
