/**
 * Controller for handling the dialog for editing a pokemon
 */

module.exports = class PokemonEdit {
  constructor ($mdDialog) {
    this.$mdDialog = $mdDialog;
    this.visibilities = require('../../api/services/Constants').POKEMON_VISIBILITIES;
    this.visibility = this.data.visibility;
    this.publicNotes = this.data.publicNotes;
    this.privateNotes = this.data.privateNotes;
  }
  cancel () {
    this.$mdDialog.cancel();
  }
  canAdd () {
    return !!this.visibility;
  }
  answer () {
    if (!this.visibility) return;
    this.$mdDialog.hide({
      visibility: this.visibility,
      publicNotes: this.publicNotes,
      privateNotes: this.privateNotes
    });
  }
};
