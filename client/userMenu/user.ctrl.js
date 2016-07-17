/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = class User {
  constructor (io, errorHandler) {
    this.io = io;
    this.errorHandler = errorHandler;
  }
  logout () {
    return this.io.socket.postAsync('/api/v1/logout', {}).then(() => {
      window.location = '/';
    }).catch(this.errorHandler);
  }
};
