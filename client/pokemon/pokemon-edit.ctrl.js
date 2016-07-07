/**
 * Controller for handling the dialog for editing a pokemon
 */
module.exports = function ($mdDialog) {
  this.visibilities = require('../../api/services/Constants.js').POKEMON_VISIBILITIES;

  this.visibility = this.data.visibility;
  this.publicNotes = this.data.publicNotes;
  this.privateNotes = this.data.privateNotes;

  this.cancel = function() {
    $mdDialog.cancel();
  };

  this.canAdd = function () {
    return Boolean(this.visibility);
  };

  this.answer = function() {
    if (!this.visibility) {
      return;
    }
    $mdDialog.hide({
      visibility: this.visibility,
      publicNotes: this.publicNotes,
      privateNotes: this.privateNotes
    });
  };
};
