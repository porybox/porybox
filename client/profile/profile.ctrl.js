module.exports = function($scope, $routeParams, io) {
  this.data = this.data || {};
  this.name = this.data.name || $routeParams.username;
  this.errorStatusCode = null;

  this.fetch = () => {
    return io.socket.getAsync(`/user/${this.name}`).then(res => {
      Object.assign(this.data, res);
    }).catch(err => {
      this.errorStatusCode = err.statusCode;
    }).then(() => $scope.$apply());
  };
  this.edit = () => {
    const data = {
      inGameNames: this.editedIgns.split(','),
      friendCodes: this.editedFcs.split(','),
      trainerShinyValues: this.editedTsvs.split(',')
    };
    return io.socket.postAsync('/me', data).then(() => {
      Object.assign(this.data, data);
    }).catch(console.error.bind(console)).then(() => $scope.$apply());
  };
};
