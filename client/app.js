// Import libraries
const ng = require('angular');
require('angular-material');

// Import modules
require('./login/login.module.js');
require('./home/home.module.js');
require('./box/box.module.js');
require('./add/add.module.js');
require('./userMenu/user.module.js');

const porybox = ng.module('porybox', [
  // Porybox modules
  'porybox.login',
  'porybox.home',
  'porybox.add',
  'porybox.userMenu',

  // Third party
  'ngMaterial'
]);

porybox.controller('MainCtrl', function () {
  this.boxes = [];
  this.init = function ({boxes}) {
    this.boxes = boxes;
  }
});

porybox.service('io', function () {
  const socket = require('socket.io-client');
  const io = require('sails.io.js')(socket);
  return io;
});

ng.bootstrap(document, ['porybox']);
