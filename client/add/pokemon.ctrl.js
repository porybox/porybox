import {maxBy} from 'lodash';
import Promise from 'bluebird';

/**
 * Controller for handling the dialog to add a new pokemon
 * @return {function} A controller that contains 2 test elements
 */

module.exports = class PokemonAdd {
  constructor ($mdDialog, $routeParams) {
    this.$mdDialog = $mdDialog;
    this.$routeParams = $routeParams;

    this.visibilities = require('../../api/services/Constants').POKEMON_VISIBILITIES;
    this.defaultBox = undefined;
    if (this.boxes.length) {
      this.defaultBox =
        this.$routeParams.boxid && this.boxes.map(box => box.id).includes(this.$routeParams.boxid)
          ? this.$routeParams.boxid
          : maxBy(this.boxes, box => +new Date(box.updatedAt)).id;
    }
    this.lines = [];
  }

  addLine (line) {
    this.lines.push(line);
  }

  addFiles (files) {
    files.forEach(file => this.addLine({
      filename: file.name,
      data: fileToBase64(file),
      visibility: this.defaultPokemonVisibility,
      box: this.defaultBox
    }));
    this.draggedFiles = [];
    this.manualFiles = [];
  }

  cancel () {
    return this.$mdDialog.cancel();
  }

  canAdd () {
    return this.lines.every((line) => line.visibility && line.data && line.box);
  }
  answer () {
    return this.$mdDialog.hide(this.lines);
  }
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
