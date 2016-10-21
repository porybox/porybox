const editCtrl = require('./box-edit.ctrl.js');
const angular = require('angular');
import {throttle} from 'lodash';

const POKEMON_FIELDS_FOR_CARD = [
  'dexNo',
  'formId',
  'isEgg',
  'isShiny',
  'gender'
];
const POKEMON_FIELDS_USED = [
  'abilityName',
  'abilityNum',
  'ballId',
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
  'idNo',
  'tid',
  'visibility'
].join(',');

module.exports = class Box {
  constructor($scope, $routeParams, io, $mdMedia, $mdDialog, $mdToast, errorHandler) {
    this.$scope = $scope;
    this.io = io;
    this.$mdMedia = $mdMedia;
    this.$mdDialog = $mdDialog;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
    this.data = this.data || {contents: []};
    this.id = $routeParams.boxid || this.data.id;
    this.selected = this.selected || ($scope.$parent.main ? $scope.$parent.main.selected : {});
    if ($routeParams.boxid) {
      this.selected.selectedBox = this;
    }
    this.errorStatusCode = null;
    this.indexInMain = null;
    this.isDeleted = false;
    this.isLoading = true;
    this.isFinished = false;
    this.bulkEdit = false;
    this.selectedPokemon = [];
    const scrollElement = document.getElementById('scroll-container');
    if ($routeParams.boxid) {
      this.onscroll = throttle(() => {
        if (!this.isLoading && !this.isFinished &&
            scrollElement.scrollTop + window.innerHeight >= scrollElement.scrollHeight - 100) {
          this.fetchMore();
        }
      }, 150);
      scrollElement.addEventListener('scroll', this.onscroll);
      // Clean up the event listener when this controller is destroyed
      this.$scope.$on('$destroy', () => scrollElement.removeEventListener('scroll', this.onscroll));
    }
  }
  fetch () {
    return this.io.socket.getAsync(
      `/api/v1/box/${this.id}?pokemonFields=${POKEMON_FIELDS_USED}`
    ).then(data => {
      Object.assign(this.data, data);
      this.hasFullData = true;
    }).catch(err => {
      this.errorStatusCode = err.statusCode;
    }).tap(() => this.isLoading = false)
      .tap(() => this.onscroll())
      .then(() => this.$scope.$apply());
  }
  fetchIcons () {
    return this.io.socket.getAsync(
      `/api/v1/box/${this.id}?pokemonFields=${POKEMON_FIELDS_FOR_CARD}`
    ).then(data => {
      Object.assign(this.data, data);
    }).then(() => this.$scope.$apply());
  }
  fetchMore () {
    if (!this.data.contents.length) return Promise.resolve();
    this.isLoading = true;
    this.$scope.$apply();
    const lastId = this.data.contents[this.data.contents.length - 1].id;
    return this.io.socket.getAsync(
      `/api/v1/box/${this.id}?pokemonFields=${POKEMON_FIELDS_USED}&after=${lastId}`
    ).tap(data => this.data.contents.push(...data.contents))
      .tap(data => {
        this.isLoading = false;
        this.isFinished = !data.contents.length;
      })
      .tap(() => this.onscroll())
      .then(() => this.$scope.$apply())
      .catch(this.errorHandler);
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
        this.$mdToast.show(
          this.$mdToast.simple()
            .textContent(`'${this.data.name}' edited successfully`)
            .position('bottom right'));
        this.$scope.$apply();
      });
    })).catch(this.errorHandler);
  }
  delete () {
    return this.io.socket.deleteAsync(`/api/v1/box/${this.id}`).then(() => {
      this.isDeleted = true;
      this.$scope.$apply();
      if (this.$scope.$parent && this.$scope.$parent.main && this.$scope.$parent.main.boxes) {
        const thisBoxIndex = this.$scope.$parent.main.boxes.findIndex(box => box.id === this.id);
        if (thisBoxIndex !== -1) {
          this.indexInMain = thisBoxIndex;
          this.$scope.$parent.main.boxes.splice(thisBoxIndex, 1);
        }
      }
      this.$mdToast.show(
        this.$mdToast
          .simple()
          .hideDelay(10000)
          .textContent(`'${this.data.name}' deleted`)
          .action('Undo')
          .highlightAction(true)
          .position('bottom right')
      ).then(response => {
        if (response === 'ok') {
          this.undelete();
        }
      });
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
      this.$mdToast.show(
        this.$mdToast.simple()
          .textContent(`'${this.data.name}' undeleted`)
          .position('bottom right'));
    }).catch(this.errorHandler);
  }
  movePkmn (pkmn, index) {
    return this.io.socket.postAsync(`/api/v1/pokemon/${pkmn.id}/move`, {box: this.id, index})
      .catch(this.errorHandler);
  }
  select (pkmn) {
    if (this.selectedPokemon.indexOf(pkmn) > -1) {
      this.selectedPokemon.splice(this.selectedPokemon.indexOf(pkmn), 1);
    } else {
      this.selectedPokemon.push(pkmn);
    }
  }
  selectAll () {
    this.selectedPokemon = this.data.contents.map((pkmn) => pkmn.id);
  }
  selectNone () {
    this.selectedPokemon = [];
  }
  bulkDelete () {
    if (!this.selectedPokemon) {
      return;
    }
    const selected = this.selectedPokemon.slice(0); // Caching, for async stuff
    this.selectedPokemon = [];
    return this.io.socket.deleteAsync(`/api/v1/pokemon/${selected}`).then(() => {
      const toast = this.$mdToast.simple()
        .hideDelay(10000)
        .textContent('Pokémon deleted')
        .action('Undo')
        .highlightAction(true)
        .position('bottom right');
      this.$mdToast.show(toast).then((response) => {
        if ( response === 'ok' ) {
          this.bulkUnDelete(selected);
        }
      });
      this.$scope.$apply();
    }).then(() => {
      const indexesToRemove = [];
      this.data.contents.forEach((pokemon, i) => {
        if (selected.indexOf(pokemon.id) > -1) {
          indexesToRemove.push(i);
        }
      });
      indexesToRemove.reverse().forEach((i) => this.data.contents.splice(i, 1));
    }).catch(this.errorHandler);
  }
  bulkUnDelete (selected) {
    return this.io.socket.postAsync(`/api/v1/pokemon/${selected}/undelete`)
      .then(this.data.contents.push(...selected))
      .then(() => {
        this.$mdToast.show(
          this.$mdToast.simple()
            .textContent(this.parsedNickname + ' undeleted.')
            .position('bottom right'));
        this.$scope.$apply();
      })
      .catch(this.errorHandler);
  }
  bulkMove () {
    // TODO: need a call for multiple move
  }
  bulkVisibility () {
    // TODO: need a call for multiple visibility modification
  }
};
