const Promise = require('bluebird');
module.exports = class ForgotPassword {
  constructor ($scope, $http, $mdToast, errorHandler) {
    this.$scope = $scope;
    this.$http = $http;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
  }
  sendRequest () {
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
    })
    .catch({status: 404}, () => this.$scope.forgotForm.user.$setValidity('exists', false))
    .then(() => this.$scope.$apply())
    .catch(this.errorHandler);
  }
};
