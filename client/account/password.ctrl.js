module.exports = class Password {
  constructor ($scope, io, $mdToast, errorHandler, escapeRegExp) {
    this.$scope = $scope;
    this.io = io;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
    this.escapeRegExp = escapeRegExp;
  }
  changePassword () {
    return this.io.socket.postAsync('/api/v1/changePassword', {
      password: this.oldPassword,
      newPassword: this.newPassword1
    }).then(() => {
      this.reset();
      return this.$mdToast.show(this.$mdToast.simple()
        .position('bottom right')
        .textContent('Password updated successfully'));
    }).catch({statusCode: 401, body: 'Incorrect password'}, () => {
      this.$scope.changePassword.oldPassword.$setValidity('correct', false);
      this.$scope.$apply();
    }).catch(this.errorHandler);
  }
  reset () {
    this.oldPassword = '';
    this.newPassword1 = '';
    this.newPassword2 = '';
    this.$scope.changePassword.$setPristine();
    this.$scope.changePassword.$setUntouched();
  }
};
