// Import libraries
const ng = require('angular');
require('material-design-lite');

// Import modules
require('./login/login.module.js');
require('./home/home.module.js');
require('./box/box.module.js');

const porybox = ng.module('porybox', [
  'porybox.login',
  'porybox.home'
]);

porybox.service('io', function () {
  const socket = require('socket.io-client');
  const io = require('sails.io.js')(socket);
  return io;
});

ng.bootstrap(document, ['porybox']);
