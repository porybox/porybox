module.exports = function($scope, $routeParams, io) {
  this.data = this.data || {contents: []};
  this.id = $routeParams.boxid || this.data.id;
  this.isDeleted = false;

  this.fetch = () => {
    io.socket.getAsync('/b/' + this.id).then(data => {
      Object.assign(this.data, data);
      this.editedName = this.data.name;
      this.editedDescription = this.data.description;
      this.editedVisibility = this.data.visibility;
      this.hasFullData = true;
      $scope.$apply();
    }).catch(console.error.bind(console));
  };
  this.saveEdits = () => {
    const postData = {
      name: this.editedName,
      description: this.editedDescription,
      visibility: this.editedVisibility
    };
    io.socket.postAsync('/b/' + this.id + '/edit', postData).then(() => {
      Object.assign(this.data, postData);
      $scope.$apply();
    }).catch(console.error.bind(console));
  };
  this.delete = () => {
    io.socket.deleteAsync('/b/' + this.id).then(() => {
      this.isDeleted = true;
      $scope.$apply();
    }).catch(console.error.bind(console));
  };
  this.undelete = () => {
    io.socket.postAsync('/b/' + this.id + '/undelete').then(() => {
      this.isDeleted = false;
      $scope.$apply();
    }).catch(console.error.bind(console));
  };
};
