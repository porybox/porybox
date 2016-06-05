/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function(io) {
  this.logout = function () {
    io.socket.postAsync('/logout', {}).then(() => {
      window.location = '/';
    }).catch(console.error.bind(console));
  };
};
