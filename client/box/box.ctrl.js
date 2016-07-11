const editCtrl = require('./box-edit.ctrl.js');
const angular = require('angular');
const boxPageSize = require('../../api/services/Constants').BOX_PAGE_SIZE;

const POKEMON_FIELDS_USED = [
  'abilityName',
  'abilityNum',
  'ballName',
  'decreasedStat',
  'dexNo',
  'esv',
  'formId',
  'formName',
  'gender',
  'heldItemId',
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
  'visibility'
].join(',');

module.exports = function(
    $scope, $ngSilentLocation, $routeParams, io, $mdMedia, $mdDialog, errorHandler
) {
  this.data = this.data || {contents: []};
  this.id = $routeParams.boxid || this.data.id;
  this.selected = this.selected || ($scope.$parent.main ? $scope.$parent.main.selected : {});
  this.selected.selectedBox = this.data;
  this.errorStatusCode = null;
  this.indexInMain = null;
  this.isDeleted = false;
  this.currentPageNum = +$routeParams.pageNum || this.data.pageNum || 1;

  this.fetch = () => {
    return io.socket.getAsync(`/box/${this.id}`, {
      pokemonFields: POKEMON_FIELDS_USED,
      page: this.currentPageNum
    }).then(data => {
      Object.assign(this.data, data);
      this.hasFullData = true;
    }).catch(err => {
      this.errorStatusCode = err.statusCode;
    }).then(() => $scope.$apply());
  };

  this.isLoading = () => this.currentPageNum !== this.data.pageNum;
  this.hasPrevPage = () => this.currentPageNum > 1;
  this.hasNextPage = () => this.currentPageNum < this.data.totalPageCount;

  this.prevPage = () => {
    if (this.hasPrevPage()) {
      // Update the location hash without reloading the controller
      // Unfortunately it doesn't seem to be possible to do this natively with angular.
      // https://github.com/angular/angular.js/issues/1699
      $ngSilentLocation.silent(`/box/${this.id}/${--this.currentPageNum}`);
      return this.fetch();
    }
  };

  this.nextPage = () => {
    if (this.hasNextPage()) {
      $ngSilentLocation.silent(`/box/${this.id}/${++this.currentPageNum}`);
      return this.fetch();
    }
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
      return io.socket.postAsync(`/box/${this.id}`, editedData).then(() => {
        Object.assign(this.data, editedData);
        if ($scope.$parent && $scope.$parent.main && $scope.$parent.main.boxes) {
          const thisBox = $scope.$parent.main.boxes.find(box => box.id === this.id);
          if (thisBox) Object.assign(thisBox, this.data);
        }
        $scope.$apply();
      });
    })).catch(errorHandler);
  };

  this.delete = () => {
    io.socket.deleteAsync(`/box/${this.id}`).then(() => {
      this.isDeleted = true;
      $scope.$apply();
      if ($scope.$parent && $scope.$parent.main && $scope.$parent.main.boxes) {
        const thisBoxIndex = $scope.$parent.main.boxes.findIndex(box => box.id === this.id);
        if (thisBoxIndex !== -1) {
          this.indexInMain = thisBoxIndex;
          $scope.$parent.main.boxes.splice(thisBoxIndex, 1);
        }
      }
      $scope.$apply();
    }).catch(errorHandler);
  };

  this.undelete = () => {
    io.socket.postAsync(`/box/${this.id}/undelete`).then(() => {
      this.isDeleted = false;
      $scope.$apply();
      if ($scope.$parent && $scope.$parent.main && $scope.$parent.main.boxes
          && this.indexInMain !== null) {
        $scope.$parent.main.boxes.splice(this.indexInMain, 0, this.data);
        this.indexInMain = null;
      }
    }).catch(errorHandler);
  };
  this.movePkmn = (pkmn, localIndex) => {
    const absoluteIndex = boxPageSize * (this.data.pageNum - 1) + localIndex;
    return io.socket.postAsync(`/pokemon/${pkmn.id}/move`,{box: this.id, index: absoluteIndex})
      .catch(errorHandler);
  };
};
