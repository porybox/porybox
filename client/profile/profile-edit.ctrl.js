/**
 * Controller for handling the dialog for editing profiles
 */
module.exports = function ($mdDialog) {

  this.inGameNames = this.data.inGameNames;
  this.friendCodes = this.data.friendCodes;
  this.trainerShinyValues = this.data.trainerShinyValues;

  this.cancel = function() {
    $mdDialog.cancel();
  };

  this.answer = function() {
    $mdDialog.hide({
      inGameNames: `${this.inGameNames}`.split(','),
      friendCodes: `${this.friendCodes}`.split(','),
      trainerShinyValues: `${this.trainerShinyValues}`.split(',')
    });
  };
};
