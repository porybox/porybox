import {maxBy} from 'lodash';
import Promise from 'bluebird';
import parseSaveFile from './parseSaveFile.js';

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

  hasPublicPokemon () {
    return this.lines.some((line) => line.visibility === 'public');
  }

  addLine (line) {
    this.lines.push(line);
  }

  addFiles (files) {
    files.forEach(file => this.addFile(file));
    this.draggedFiles = [];
    this.manualFiles = [];
  }

  addFile (file) {
    const bufferPromise = fileToBuffer(file);
    const filesPromise = bufferPromise.then(buffer => {
      if (buffer.length === 232 || buffer.length === 260) return [bufferToBase64(buffer)];
      return parseSaveFile.getPokemon(buffer).map(bufferToBase64);
    });
    this.addLine({
      filename: file.name,
      data: filesPromise,
      visibility: this.defaultPokemonVisibility,
      box: this.defaultBox,
      gen: this.getGen(file) || bufferPromise.then(parseSaveFile.getGen)
    });
  }

  fileIsValid(file) {
    return this.isPk6(file) || this.isPk7(file) || this.isPkx(file) || !file.name.includes('.');
  }

  isPk6(file) {
    return file.name.endsWith('pk6');
  }

  isPk7(file) {
    return file.name.endsWith('pk7');
  }

  isPkx(file) {
    return file.name.endsWith('.pkx');
  }

  getGen(file) {
    if (this.isPk6(file) || this.isPkx(file)) {
      return 6;
    } else if (this.isPk7(file)) {
      return 7;
    }
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

function fileToBuffer (file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = evt => resolve(new Uint8Array(evt.target.result));
    fr.onerror = reject;
    fr.readAsArrayBuffer(file);
  });
}

function bufferToBase64(buf) {
  return btoa(buf.reduce((acc, next) => acc + String.fromCharCode(next), ''));
}
