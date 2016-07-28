import Promise from 'bluebird';
module.exports = class PasswordReset {
  constructor ($scope, $http, io, $routeParams, $mdToast, errorHandler, escapeRegExp) {
    this.$scope = $scope;
    this.$http = $http;
    this.io = io;
    this.$routeParams = $routeParams;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
    this.escapeRegExp = escapeRegExp;
  }
  verifyToken () {
    return this.io.socket.getAsync(`/api/v1/passwordReset/${this.$routeParams.token}`).then(() => {
      this.isValid = true;
    }).catch({statusCode: 404}, () => {
      this.errorStatusCode = 404;
    }).then(() => this.$scope.$apply()).catch(this.errorHandler);
  }
  resetPassword () {
    // This needs to be sent with $http instead of sockets because it requires updating the current session.
    return Promise.resolve(this.$http({
      method: 'DELETE',
      url: `/api/v1/passwordReset/${this.$routeParams.token}`,
      data: {newPassword: this.newPassword1}
    })).then(() => {
      this.$mdToast.show(this.$mdToast
        .simple()
        .textContent('Password reset successfully')
        .position('bottom right')
        .hideDelay(1000)).then(() => window.location = '/');
    }).catch(this.errorHandler);
  }
};
