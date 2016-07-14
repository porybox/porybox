import {maxBy} from 'lodash';
import Promise from 'bluebird';

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
    files.forEach(file => this.addLine({
      filename: file.name,
      data: fileToBase64(file),
      visibility: this.defaultPokemonVisibility,
      box: this.defaultBox
    }));
    this.draggedFiles = [];
    this.manualFiles = [];
  };

  this.cancel = function() {
    return $mdDialog.cancel();
  };

  this.canAdd = function () {
    return this.lines.every((line) => line.visibility && line.data && line.box);
  };

  this.answer = function() {
    return $mdDialog.hide(this.lines);
  };
};

function fileToBase64 (file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = evt => {
      resolve(btoa(
        new Uint8Array(evt.target.result).reduce((acc, next) => acc + String.fromCharCode(next), '')
      ));
    };
    fr.onerror = reject;
    fr.readAsArrayBuffer(file);
  });
}
