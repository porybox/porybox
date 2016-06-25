import {maxBy} from 'lodash';

/**
 * Controller for handling the dialog to add a new pokemon
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function ($mdBottomSheet, $routeParams) {
  this.visibilities = require('../../api/services/Constants.js').POKEMON_VISIBILITIES;
  this.visibility = this.defaultPokemonVisibility;
  if (this.boxes.length) {
    this.box = $routeParams.boxid && this.boxes.map(box => box.id).includes($routeParams.boxid)
      ? $routeParams.boxid
      : maxBy(this.boxes, box => +new Date(box.updatedAt)).id;
  }
  this.file = {};

  this.cancel = function() {
    return $mdBottomSheet.cancel();
  };

  this.canAdd = function () {
    return Boolean(this.visibility && this.file);
  };

  this.answer = function() {
    return $mdBottomSheet.hide({file: this.file, visibility: this.visibility, box: this.box});
  };
};
