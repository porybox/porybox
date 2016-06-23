/**
 * Controller for handling the dialog to add a new box
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function ($mdDialog) {

  this.name = this.data.name;
  this.description = this.data.description;
  this.visibility = this.data.visibility;

  this.cancel = function() {
    $mdDialog.cancel();
  };
  this.canAdd = function () {
    return Boolean(this.name);
  };
  this.answer = function() {
    if (!this.name) {
      return;
    }
    $mdDialog.hide({
      name: this.name,
      description: this.description,
      visibility: this.visibility
    });
  };
};
