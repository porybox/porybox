const angular = require('angular');
const Promise = require('bluebird');
const boxCtrl = require('./box.ctrl.js');
const pokemonCtrl = require('./pokemon.ctrl.js');
import {MAX_MULTI_UPLOAD_SIZE, BOX_PAGE_SIZE} from '../../api/services/Constants.js';
import {chunk, flatten} from 'lodash/fp';

/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = class Add {
  constructor ($scope, $location, io, $mdDialog, $mdMedia, $mdToast, errorHandler) {
    this.$scope = $scope;
    this.$location = $location;
    this.io = io;
    this.$mdDialog = $mdDialog;
    this.$mdMedia = $mdMedia;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
  }
  box (event) {
    const useFullScreen
      = (this.$mdMedia('sm') || this.$mdMedia('xs')) && this.$scope.customFullscreen;
    this.$scope.$watch(() => {
      return this.$mdMedia('xs') || this.$mdMedia('sm');
    }, wantsFullScreen => {
      this.$scope.customFullscreen = (wantsFullScreen === true);
    });
    return Promise.resolve(this.$mdDialog.show({
      controller: ['$mdDialog', boxCtrl],
      controllerAs: 'dialog',
      templateUrl: 'add/box.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen,
      bindToController: true,
      locals: {
        defaultBoxVisibility: this.prefs.defaultBoxVisibility
      }
    }).then((boxInfo) => this.io.socket.postAsync('/api/v1/box', boxInfo)))
      .tap(box => {
        const toast = this.$mdToast
          .simple()
          .position('bottom right')
          .hideDelay(4000)
          .textContent(`Box '${box.name}' created successfully`)
          .action('View');
        this.$mdToast.show(toast).then(response => {
          if (response === 'ok') this.$location.path(`box/${box.id}`);
        });
      })
      .then(res => this.$scope.$apply(this.boxes.push(res)))
      .catch(this.errorHandler);
  }
  pokemon (event) {
    const useFullScreen
      = (this.$mdMedia('sm') || this.$mdMedia('xs')) && this.$scope.customFullscreen;
    const box = this.selected.selectedBox;
    return Promise.resolve(this.$mdDialog.show({
      controller: ['$mdDialog', '$routeParams', pokemonCtrl],
      controllerAs: 'pkmDialog',
      templateUrl: 'add/pokemon.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen,
      bindToController: true,
      locals: {
        boxes: this.boxes,
        defaultPokemonVisibility: this.prefs.defaultPokemonVisibility
      }
    })).map(Promise.props)
      .map(line => ({data: line.data, box: line.box, visibility: line.visibility, gen: line.gen}))
      .map(line => line.data.map(data => ({data, box: line.box, visibility: line.visibility, gen: line.gen})))
      .then(flatten)
      .then(chunk(MAX_MULTI_UPLOAD_SIZE))
      .mapSeries(files => this.io.socket.postAsync('/api/v1/pokemon/multi', {files}))
      .then(flatten)
      .tap(lines => {
        const successfulUploads = lines.filter(line => line.success);
        const successfulUploadCount = successfulUploads.length;
        const failedUploadCount = lines.length - successfulUploads.length;
        const toast = this.$mdToast.simple().position('bottom right').hideDelay(4000);
        if (successfulUploadCount === lines.length) {
          toast.textContent(`${successfulUploads.length} Pokémon uploaded successfully`);
        } else if (successfulUploadCount === 0) {
          toast.textContent('Upload failed; no Pokémon uploaded');
        } else {
          toast.textContent(
            `${successfulUploadCount} Pokémon uploaded successfully (${failedUploadCount} failed)`
          );
        }
        if (successfulUploadCount === 1) {
          toast.action('View');
        }
        this.$mdToast.show(toast).then(response => {
          if (response === 'ok') this.$location.path(`pokemon/${successfulUploads[0].created.id}`);
        });
      })
      .filter(line => line.success && line.created.box === box.data.id)
      .then(lines => lines.slice(0, BOX_PAGE_SIZE - (box.data.contents.length % BOX_PAGE_SIZE)))
      .map(line => line.created)
      .then(lines => box.data.contents.push(...lines))
      .tap(box.onscroll)
      .catch(this.errorHandler)
      .then(() => this.$scope.$apply());
  }
};
