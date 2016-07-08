const editCtrl = require('./box-edit.ctrl.js');
const angular = require('angular');

const POKEMON_FIELDS_USED = [
  'abilityName',
  'abilityNum',
  'ballName',
  'decreasedStat',
  'esv',
  'heldItemName',
  'id',
  'increasedStat',
  'isEgg',
  'isShiny',
  'ivHp',
  'ivAtk',
  'ivDef',
  'ivSpAtk',
  'ivSpDef',
  'ivSpe',
  'language',
  'level',
  'natureName',
  'nickname',
  'ot',
  'otGameId',
  'speciesName',
  'tid',
  'visibility',
].join(',');

module.exports = function($scope, $routeParams, io, $mdMedia, $mdDialog) {
  this.data = this.data || {contents: []};
  this.id = $routeParams.boxid || this.data.id;
  this.selected = this.selected || ($scope.$parent.main ? $scope.$parent.main.selected : {});
  this.selected.selectedBox = this.data;
  this.errorStatusCode = null;
  this.isDeleted = false;

  this.fetch = () => {
    io.socket.getAsync('/b/' + this.id, {pokemonFields: POKEMON_FIELDS_USED}).then(data => {
      Object.assign(this.data, data);
      this.hasFullData = true;
    }).catch(err => {
      this.errorStatusCode = err.statusCode;
    }).then(() => $scope.$apply());
  };

  this.edit = event => {
    const useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
    $scope.$watch(function() {
      return $mdMedia('xs') || $mdMedia('sm');
    }, function(wantsFullScreen) {
      $scope.customFullscreen = (wantsFullScreen === true);
    });
    return Promise.resolve($mdDialog.show({
      locals: {data: this.data},
      bindToController: true,
      controller: ['$mdDialog', editCtrl],
      controllerAs: 'dialog',
      templateUrl: 'box/box-edit.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen
    }).then((editedData) => {
      return io.socket.postAsync('/b/' + this.id + '/edit', editedData).then(() => {
        Object.assign(this.data, editedData);
        $scope.$apply();
      });
    })).catch(console.error.bind(console));
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
  this.movePkmn = (pkmn, newIndex) => {
    return io.socket.postAsync(`/p/${pkmn.id}/move`,{box: this.id, index: newIndex})
      .catch(console.error.bind(console));
  };
};
