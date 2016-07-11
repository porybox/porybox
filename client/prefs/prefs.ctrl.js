module.exports = function (io, $mdToast, errorHandler) {
  this.changePassword = () => {
    if (this.newPassword1 !== this.newPassword2) {
      return $mdToast.show(
        $mdToast.simple().position('bottom right').textContent('Error: New passwords do not match')
      );
    }
    if (this.newPassword1.length < 8) {
      return $mdToast.show(
        $mdToast.simple().position('bottom right')
          .textContent('Error: Passwords must be at least 8 characters long.')
      );
    }
    if (this.newPassword1.length > 72) {
      return $mdToast.show(
        $mdToast.simple().position('bottom right')
          .textContent('Error: Passwords may not be longer than 72 characters.')
      );
    }
    return io.socket.postAsync('/api/v1/changePassword', {
      oldPassword: this.oldPassword,
      newPassword: this.newPassword1
    }).then(() => {
      this.oldPassword = '';
      this.newPassword1 = '';
      this.newPassword2 = '';
      return $mdToast.simple()
        .position('bottom right').textContent('Password updated successfully');
    }).catch({statusCode: 403, body: 'Incorrect password'}, () => {
      return $mdToast.simple().position('bottom right').textContent('Incorrect password');
    }).then(toast => {
      $mdToast.show(toast);
    }).catch(errorHandler);
  };
};
