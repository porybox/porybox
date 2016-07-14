module.exports = class Info {
  constructor (io, $mdToast, errorHandler) {
    this.email = this.email || '';
    this.io = io;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
  }
  saveInfo () {
    console.log(this.email);
    // Do something to change email address (tbd)
  }
};
