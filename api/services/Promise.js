'use strict';
const Promise = require('bluebird');
if (sails.config.environment === 'development') {
  Promise.config({longStackTraces: true});
}
module.exports = Promise;
