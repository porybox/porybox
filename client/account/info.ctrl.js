module.exports = class Info {
  constructor (io, $mdToast, errorHandler) {
    this.email = this.email || '';
    this.io = io;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
  }
  saveInfo () {
    // Do something to change email address (tbd)
  }
};


// foobar
