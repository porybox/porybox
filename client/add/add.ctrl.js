/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function($scope, io) {
  const self = this;
  this.count = 0;
  this.box = function () {
    io.socket.post('/box', {
      name: 'Another box' + this.count++,
      description: 'This is another box that I added.'
    }, function (data, res) {
      if (res.statusCode === 200) {
        self.boxes.push(data);
      } else {
        console.log(data);
      }
      $scope.$apply();
    });
  }
}
