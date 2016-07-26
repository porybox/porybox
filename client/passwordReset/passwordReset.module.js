const ng = require('angular');
const passwordResetCtrl = require('./passwordReset.ctrl');

ng.module('porybox.passwordReset', ['ngRoute'])
  .config(['$routeProvider', $routeProvider => {
    $routeProvider.when('/passwordReset/:token', {
      templateUrl: '/passwordReset/passwordReset.view.html',
      controller: ['$scope', '$http', 'io', '$routeParams', 'errorHandler', passwordResetCtrl],
      controllerAs: 'passwordReset'
    });
  }]);
