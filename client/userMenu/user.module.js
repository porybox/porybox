const ng = require('angular');
const controller = require('./user.ctrl');

/**
 * [module description]
 * @param  {[type]} "porybox.add" [description]
 * @param  {[type]} []             [description]
 * @return {[type]}                [description]
 */
ng.module('porybox.userMenu', [])
  .component('userMenu',
  {
    bindings: {
      name: '='
    },
    templateUrl: 'userMenu/user.view.html',
    controller: ['io', 'errorHandler', controller],
    controllerAs: 'userMenu'
  });
