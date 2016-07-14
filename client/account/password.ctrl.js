module.exports = class Password {
  constructor (io, $mdToast, errorHandler) {
    this.io = io;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;

    this.oldPassword = '';
    this.newPassword1 = '';
    this.newPassword2 = '';
  }
  changePassword () {
    if (this.newPassword1 !== this.newPassword2) {
      return this.$mdToast.show(
        this.$mdToast.simple()
          .position('bottom right')
          .textContent('Error: New passwords do not match')
      );
    }
    if (this.newPassword1.length < 8) {
      return this.$mdToast.show(
        this.$mdToast.simple()
          .position('bottom right')
          .textContent('Error: Passwords must be at least 8 characters long.')
      );
    }
    if (this.newPassword1.length > 72) {
      return this.$mdToast.show(
        this.$mdToast.simple()
          .position('bottom right')
          .textContent('Error: Passwords may not be longer than 72 characters.')
      );
    }
    return this.io.socket.postAsync('/api/v1/changePassword', {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword1
    }).then(() => {
      this.oldPassword = '';
      this.newPassword1 = '';
      this.newPassword2 = '';
      return this.$mdToast.simple()
        .position('bottom right')
        .textContent('Password updated successfully');
    }).catch({statusCode: 403, body: 'Incorrect password'}, () => {
      return this.$mdToast.simple().position('bottom right').textContent('Incorrect password');
    }).then(toast => {
      this.$mdToast.show(toast);
    }).catch(this.errorHandler);
  }
};
