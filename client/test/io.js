const Promise = require('bluebird');

/**
  * Mock class for io
  */
module.exports = () => ({
  socket: {
    postAsync: function () {
      return Promise.resolve().then(() => ({}));
    }
  }
});
