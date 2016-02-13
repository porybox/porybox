/**
 * A small controller to explain the syntax we will be using
 * @return {function} A controller that contains 2 test elements
 */
module.exports = function() {
  this.test = 'test';
  this.test2 = function() {
    return this.test + '2';
  };
}
