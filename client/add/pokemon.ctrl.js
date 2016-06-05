import {maxBy} from 'lodash';

/**
 * Controller for handling the dialog to add a new pokemon
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function ($mdBottomSheet, Upload) {
  this.visibilities = require('../../api/services/Constants.js').POKEMON_VISIBILITIES;
  this.visibility = this.defaultPokemonVisibility;
  if (this.boxes.length) {
    this.box = maxBy(this.boxes, box => +new Date(box.updatedAt)).id;
  }
  this.file = {};

  this.cancel = function() {
    $mdBottomSheet.cancel();
  };

  this.canAdd = function () {
    return Boolean(this.visibility && this.file);
  };

  this.answer = function() {
    this.file.upload = Upload.upload({
      url: '/uploadpk6',
      data: {visibility: this.visibility, pk6: this.file, box: this.box}
    }).then(function (response) {
      $mdBottomSheet.hide(response.data);
    }, function (response) {
      console.log(response.status + ': ' + response.data);
    });
  };
};
