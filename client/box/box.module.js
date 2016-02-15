const ng = require('angular');
const boxController = require('./box.ctrl');

/**
 * [module description]
 * @param  {[type]} "porybox.home" [description]
 * @param  {[type]} []             [description]
 * @return {[type]}                [description]
 */
ng.module('porybox.box', [])
  .component('boxCard',
  {
    bindings: {
      'box': '='
    },
    templateUrl: 'box/box-card.view.html',
    controller: boxController,
    controllerAs: 'box'
  });
