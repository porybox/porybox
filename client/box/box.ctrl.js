module.exports = function($scope, $routeParams, io) {
  this.data = this.data || {};
  this.id = $routeParams.boxid || this.data.id;

  this.fetch = () => {
    io.socket.getAsync('/b/' + this.id).then(data => {
      Object.assign(this.data, data);
      $scope.$apply();
    }).catch(console.error.bind(console));
  };
};
