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

module.exports = class Box {
  constructor($scope, $ngSilentLocation, $routeParams, io, $mdMedia, $mdDialog, errorHandler) {
    this.$scope = $scope;
    this.$ngSilentLocation = $ngSilentLocation;
    this.$routeParams = $routeParams;
    this.io = io;
    this.$mdMedia = $mdMedia;
    this.$mdDialog = $mdDialog;
    this.errorHandler = errorHandler;
    this.data = this.data || {contents: []};
    this.id = $routeParams.boxid || this.data.id;
    this.selected = this.selected || ($scope.$parent.main ? $scope.$parent.main.selected : {});
    this.selected.selectedBox = this.data;
    this.errorStatusCode = null;
    this.indexInMain = null;
    this.isDeleted = false;
    this.currentPageNum = +$routeParams.pageNum || this.data.pageNum || 1;
  }
  fetch () {
    return this.io.socket.getAsync(`/api/v1/box/${this.id}`, {
      pokemonFields: POKEMON_FIELDS_USED,
      page: this.currentPageNum
    }).then(data => {
      Object.assign(this.data, data);
      this.hasFullData = true;
    }).catch(err => {
      this.errorStatusCode = err.statusCode;
    }).then(() => this.$scope.$apply());
  }
  isLoading () {
    return this.currentPageNum !== this.data.pageNum;
  }
  hasPrevPage () {
    return this.currentPageNum > 1;
  }
  hasNextPage () {
    return this.currentPageNum < this.data.totalPageCount;
  }
  prevPage () {
    if (this.hasPrevPage()) {
      // Update the location hash without reloading the controller
      // Unfortunately it doesn't seem to be possible to do this natively with angular.
      // https://github.com/angular/angular.js/issues/1699
      this.$ngSilentLocation.silent(`/box/${this.id}/${--this.currentPageNum}`);
      return this.fetch();
    }
  }
  nextPage () {
    if (this.hasNextPage()) {
      this.$ngSilentLocation.silent(`/box/${this.id}/${++this.currentPageNum}`);
      return this.fetch();
    }
  }
  edit (event) {
    const useFullScreen =
      (this.$mdMedia('sm') || this.$mdMedia('xs')) && this.$scope.customFullscreen;
    this.$scope.$watch(() => {
      return this.$mdMedia('xs') || this.$mdMedia('sm');
    }, wantsFullScreen => {
      this.$scope.customFullscreen = (wantsFullScreen === true);
    });
    return Promise.resolve(this.$mdDialog.show({
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
      return this.io.socket.patchAsync(`/api/v1/box/${this.id}`, editedData).then(() => {
        Object.assign(this.data, editedData);
        if (this.$scope.$parent && this.$scope.$parent.main && this.$scope.$parent.main.boxes) {
          const thisBox = this.$scope.$parent.main.boxes.find(box => box.id === this.id);
          if (thisBox) Object.assign(thisBox, this.data);
        }
        this.$scope.$apply();
      });
    })).catch(this.errorHandler);
  }
  delete () {
    return this.io.socket.deleteAsync(`/box/${this.id}`).then(() => {
      this.isDeleted = true;
      this.$scope.$apply();
      if (this.$scope.$parent && this.$scope.$parent.main && this.$scope.$parent.main.boxes) {
        const thisBoxIndex = this.$scope.$parent.main.boxes.findIndex(box => box.id === this.id);
        if (thisBoxIndex !== -1) {
          this.indexInMain = thisBoxIndex;
          this.$scope.$parent.main.boxes.splice(thisBoxIndex, 1);
        }
      }
      this.$scope.$apply();
    }).catch(this.errorHandler);
  }
  undelete () {
    return this.io.socket.postAsync(`/api/v1/box/${this.id}/undelete`).then(() => {
      this.isDeleted = false;
      this.$scope.$apply();
      if (this.$scope.$parent && this.$scope.$parent.main && this.$scope.$parent.main.boxes
          && this.indexInMain !== null) {
        this.$scope.$parent.main.boxes.splice(this.indexInMain, 0, this.data);
        this.indexInMain = null;
      }
    }).catch(this.errorHandler);
  }
  movePkmn (pkmn, localIndex) {
    const absoluteIndex = boxPageSize * (this.data.pageNum - 1) + localIndex;
    return this.io.socket.postAsync(
      `/api/v1/pokemon/${pkmn.id}/move`,
      {box: this.id, index: absoluteIndex}
    ).catch(this.errorHandler);
  }
};
