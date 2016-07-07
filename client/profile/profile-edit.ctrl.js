/**
 * Controller for handling the dialog for editing profiles
 */
module.exports = function ($mdDialog) {

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

  this.addFC = () => this.friendCodes.push('');
  this.addIGN = () => this.inGameNames.push('');
  this.addTSV = () => this.tsvs.push('');

  this.cancel = () => {
    $mdDialog.cancel();
  };

  this.answer = () => {
    $mdDialog.hide({
      inGameNames: this.inGameNames.filter(removeEmpty),
      friendCodes: this.friendCodes.filter(removeEmpty),
      trainerShinyValues: this.tsvs.filter(removeEmpty)
    });
  };

  const removeEmpty = (el) => el !== '';
};
