/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function(io) {
  this.logout = function() {
    io.socket.post('/logout', {}, function (data, res) {
      if (res.statusCode === 200) {
        window.location = '/';
      } else {
        console.error(data);
      }
    });
  };
}
