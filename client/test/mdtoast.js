const utils = require('../test/utils');

/**
  * Mock mdtoast class. This is the easiest way to mock it, as it uses the builder class pattern
  */
const toast = class toast{
  simple () {
    return this;
  }

  position () {
    return this;
  }

  hideDelay () {
    return this;
  }

  textContent () {
    return this;
  }

  action () {
    return this;
  }

  show () {
    return utils.promise({});
  }

  hide () {}
};

module.exports = toast;
