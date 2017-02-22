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

  useFullScreen() {
    return (this.$mdMedia('sm') || this.$mdMedia('xs')) && this.$scope.customFullscreen;
  }

  watchFullScreen() {
    this.$scope.$watch(() => {
      return this.$mdMedia('xs') || this.$mdMedia('sm');
    }, wantsFullScreen => {
      this.$scope.customFullscreen = (wantsFullScreen === true);
    });
  }

  dialog(controller, view, locals, event) {
    return Promise.resolve(this.$mdDialog.show({
      controller: controller,
      controllerAs: 'dialog',
      templateUrl: view,
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: this.useFullScreen(),
      bindToController: true,
      locals
    }));
  }

  toast(message, action) {
    const toast = this.$mdToast
      .simple()
      .position('bottom right')
      .hideDelay(4000)
      .textContent(message)
      .action(action);
    return this.$mdToast.show(toast);
  }

  toastNoHide(message, action) {
    return this.$mdToast
      .simple()
      .position('bottom right')
      .hideDelay(false)
      .textContent(message)
      .action(action);
  }

  addedToast(message, action, location) {
    this.toast(message, action)
      .then(checkOk)
      .then(() => this.$location.path(location))
      .catch(this.errorHandler);
  }

  box (event) {
    this.watchFullScreen();
    const locals = {
      defaultBoxVisibility: this.prefs.defaultBoxVisibility
    };
    return this.dialog(['$mdDialog', boxCtrl], 'add/box.view.html', locals, event)
      .then(boxInfo => {
        const toast = this.toastNoHide('Creating box');
        this.$mdToast.show(toast);
        return this.io.socket.postAsync('/api/v1/box', boxInfo)
          .finally(() => this.$mdToast.hide(toast));
      })
      .tap(box => {
        this.addedToast(`Box '${box.name}' created successfully`, 'View', `/box/${box.id}`);
      })
      .then(res => this.$scope.$apply(this.boxes.push(res)))
      .catch(this.errorHandler);
  }

  pokemon (event) {
    this.watchFullScreen();
    const box = this.selected.selectedBox;
    const locals = {
      boxes: this.boxes,
      defaultPokemonVisibility: this.prefs.defaultPokemonVisibility
    };
    return this
      .dialog(['$mdDialog', '$routeParams', pokemonCtrl], 'add/pokemon.view.html', locals, event)
      .map(Promise.props)
      .map(line => ({data: line.data, box: line.box, visibility: line.visibility, gen: line.gen}))
      .map(line => line.data.map(data => (
        {data, box: line.box, visibility: line.visibility, gen: line.gen}
      )))
      .then(flatten)
      .then(chunk(MAX_MULTI_UPLOAD_SIZE))
      .mapSeries(files => {
        const toast = this.toastNoHide('Uploading Pokémon');
        this.$mdToast.show(toast);
        return this.io.socket.postAsync('/api/v1/pokemon/multi', {files})
          .finally(() => this.$mdToast.hide(toast));
      })
      .then(flatten)
      .tap(lines => {
        const successfulUploads = lines.filter(line => line.success);
        const toastMessage = getPokemonMessage(lines, successfulUploads);
        const toastAction = successfulUploads.length === 1 ? 'View' : undefined;
        this.addedToast(
          toastMessage,
           toastAction,
           toastAction ? `/pokemon/${successfulUploads[0].created.id}` : undefined);
      })
      .filter(line => line.success)
      .map(line => line.created)
      .reduce((overall, line) => {
        if (overall[line.box]) {
          overall[line.box].push(line);
        } else {
          overall[line.box] = [line];
        }
        return overall;
      }, {})
      .then(lines => {
        Object.keys(lines).forEach(
          (line) => line.slice(0, BOX_PAGE_SIZE - (box.data.contents.length % BOX_PAGE_SIZE))
        );
        return lines;
      })
      .then(lines => this.boxes.forEach((box) => {
        if (lines[box.id]) {
          box.contents.push(...lines[box.id]);
        }
      }))
      .tap(box.onscroll)
      .catch(this.errorHandler)
      .then(() => this.$scope.$apply());
  }
};

const getPokemonMessage = (lines, successfulUploads) => {
  const failedUploadCount = lines.length - successfulUploads.length;
  const successfulUploadCount = successfulUploads.length;
  if (successfulUploadCount === lines.length) {
    return `${successfulUploads.length} Pokémon uploaded successfully`;
  } else if (successfulUploadCount === 0) {
    return 'Upload failed; no Pokémon uploaded';
  } else {
    return `${successfulUploadCount} Pokémon uploaded successfully (${failedUploadCount} failed)`;
  }
};

const checkOk = (response) => {
  if (response !== 'ok') {
    return Promise.reject();
  }
};
