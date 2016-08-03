module.exports = class Email {
  constructor ($scope, io, $mdToast, errorHandler) {
    this.$scope = $scope;
    this.io = io;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
    this.newEmail = this.user.email;
  }
  editEmail () {
    return this.io.socket.postAsync('/api/v1/changeEmail', {
      email: this.newEmail,
      password: this.password
    }).then(() => {
      this.reset();
      this.user.email = this.newEmail;
      return this.$mdToast.show(this.$mdToast.simple()
        .position('bottom right')
        .textContent('Email address updated successfully'));
    }).catch({statusCode: 401, body: 'Incorrect password'}, () => {
      this.$scope.editEmailForm.password.$setValidity('correct', false);
      this.$scope.$apply();
    }).catch(this.errorHandler);
  }
  reset () {
    this.password = '';
    this.$scope.editEmailForm.$setPristine();
    this.$scope.editEmailForm.$setUntouched();
  }
};
