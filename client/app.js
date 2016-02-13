const ng = require('angular');
require('./home/home.module');

ng.module('porybox', [
  'porybox.home'
]);

ng.bootstrap(document, ['porybox']);
