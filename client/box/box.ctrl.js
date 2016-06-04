/**
 *
 */
module.exports = function($scope, $routeParams, io) {
  const self = this;
  self.box = self.box || {};
  self.name = self.box.name;
  self.user = self.box.user;
  self.id = $routeParams.boxid || self.box.id;
  self.description = self.box.description;
  self.pokemon = [];

  self.fetch = function () {
    io.socket.get('/b/' + self.id, function (data, res) {
      if (res.statusCode === 200) {
        self.name = data.name;
        self.description = data.description;
        self.pokemon = data.contents;
      } else {
        console.error(res);
      }
      $scope.$apply();
    });
  }
};
