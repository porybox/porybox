module.exports = class Prefs {
  constructor (io, $mdToast, errorHandler) {
    this.pokemonVisibilities = require('../../api/services/Constants.js').POKEMON_VISIBILITIES;
    this.boxVisibilities = require('../../api/services/Constants.js').BOX_VISIBILITIES;
    this.defaultBoxVisibility = this.prefs.defaultBoxVisibility;
    this.defaultPokemonVisibility = this.prefs.defaultPokemonVisibility;

    this.io = io;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
  }
  updatePrefs () {
    const editedData = {
      defaultBoxVisibility: this.defaultBoxVisibility,
      defaultPokemonVisibility: this.defaultPokemonVisibility
    };
    return this.io.socket.patchAsync('/api/v1/me/preferences', editedData).then(() => {
      Object.assign(this.prefs, editedData);
      return this.$mdToast.simple()
        .position('bottom right')
        .textContent('Preferences updated successfully');
    }).then(toast => {
      this.$mdToast.show(toast);
    }).catch(this.errorHandler);
  }
};
