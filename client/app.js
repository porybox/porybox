// Import libraries
const ng = require('angular');
require('material-design-lite');

// Import modules
require('./login/login.module.js');

ng.module('porybox', [
  'porybox.login'
]);

ng.bootstrap(document, ['porybox']);
