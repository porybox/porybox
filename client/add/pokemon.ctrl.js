import {maxBy} from 'lodash';

/**
 * Controller for handling the dialog to add a new pokemon
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function ($mdDialog, $routeParams) {
  this.visibilities = require('../../api/services/Constants.js').POKEMON_VISIBILITIES;
  this.defaultBox = undefined;

  if (this.boxes.length) {
    this.defaultBox =
      $routeParams.boxid && this.boxes.map(box => box.id).includes($routeParams.boxid)
        ? $routeParams.boxid
        : maxBy(this.boxes, box => +new Date(box.updatedAt)).id;
  }

  this.lines = [];

  this.addLine = (line) => this.lines.push(line);

  this.addFiles = (files) => {
    files = files || this.files;
    files.forEach((file) => this.addLine({
      file,
      visibility: this.defaultPokemonVisibility,
      box: this.defaultBox
    }));
    this.files = [];
  };

  this.addFile = () => {
    if (this.file && this.file !== {}) {
      this.addLine({
        file: this.file,
        visibility: this.defaultPokemonVisibility,
        box: this.defaultBox
      });
      this.file = undefined;
    }
  };

  this.cancel = function() {
    return $mdDialog.cancel();
  };

  this.canAdd = function () {
    return this.lines.every((line) => line.visibility && line.file && line.file.size && line.box);
  };

  this.answer = function() {
    return $mdDialog.hide(this.lines);
  };
};
