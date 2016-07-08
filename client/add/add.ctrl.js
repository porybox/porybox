const angular = require('angular');
const Promise = require('bluebird');
const boxCtrl = require('./box.ctrl.js');
const pokemonCtrl = require('./pokemon.ctrl.js');
const maxMultiUploadSize = require('../../api/services/Constants.js').MAX_MULTI_UPLOAD_SIZE;
const boxPageSize = require('../../api/services/Constants.js').BOX_PAGE_SIZE;
import {chunk} from 'lodash';

/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function($scope, io, $mdDialog, $mdMedia, $mdToast) {
  this.box = (event) => {
    const useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
    $scope.$watch(function() {
      return $mdMedia('xs') || $mdMedia('sm');
    }, function(wantsFullScreen) {
      $scope.customFullscreen = (wantsFullScreen === true);
    });
    return Promise.resolve($mdDialog.show({
      controller: ['$mdDialog', boxCtrl],
      controllerAs: 'dialog',
      templateUrl: 'add/box.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen
    })
    .then((boxInfo) => io.socket.postAsync('/box', boxInfo)))
    .then(res => $scope.$apply(this.boxes.push(res)))
    .catch(console.error.bind(console));
  };

  this.pokemon = (event) => {
    const useFullScreen = ($mdMedia('sm') || $mdMedia('xs'))  && $scope.customFullscreen;
    return Promise.resolve($mdDialog.show({
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
      .map(result => ({data: result.data, box: result.box, visibility: result.visibility}))
      .then(files => chunk(files, maxMultiUploadSize))
      .mapSeries(files => io.socket.postAsync('/pk6/multi', {files}))
      .reduce((acc, nextGroup) => acc.concat(nextGroup), [])
      .filter(line => line.success && line.created.box === this.selected.selectedBox.id)
      .tap(lines => this.selected.selectedBox.totalItemCount += lines.length)
      .tap(lines => this.selected.selectedBox.totalPageCount = Math.ceil(
        (this.selected.selectedBox.contents.length + lines.length) / boxPageSize
      ))
      .then(lines => this.selected.selectedBox.contents.length < boxPageSize ? lines : [])
      .then(lines => lines.slice(0, boxPageSize - this.selected.selectedBox.contents.length))
      .map(line => line.created)
      .each(pkmn => this.selected.selectedBox.contents.push(pkmn))
      .catch(console.error.bind(console))
      .then(() => {
        $mdToast.show(
          $mdToast.simple()
            .textContent('Pokémon uploaded successfully')
            .position('top right'));
        $scope.$apply();
      });
  };

};
