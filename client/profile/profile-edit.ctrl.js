/**
 * Controller for handling the dialog for editing profiles
 */
module.exports = class ProfileEdit {
  constructor ($mdDialog) {
    this.$mdDialog = $mdDialog;

    this.friendCodes = this.data.friendCodes ? this.data.friendCodes.slice(0) : [''];
    this.inGameNames = this.data.inGameNames ? this.data.inGameNames.slice(0) : [''];
    this.tsvs = this.data.trainerShinyValues ? this.data.trainerShinyValues.slice(0) : [''];

    if (this.friendCodes.length === 0) {
      this.friendCodes = [''];
    }
    if (this.inGameNames.length === 0) {
      this.inGameNames = [''];
    }
    if (this.tsvs.length === 0) {
      this.tsvs = [''];
    }
  }
  addFC () {
    this.friendCodes.push('');
  }
  addIGN () {
    this.inGameNames.push('');
  }
  addTSV () {
    this.tsvs.push('');
  }
  cancel () {
    this.$mdDialog.cancel();
  }
  answer () {
    this.$mdDialog.hide({
      inGameNames: this.inGameNames.filter(ign => ign),
      friendCodes: this.friendCodes.filter(fc => fc),
      trainerShinyValues: this.tsvs.filter(tsv => tsv)
    });
  }
};
