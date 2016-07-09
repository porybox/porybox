const ng = require('angular');
const profileController = require('./prefs.ctrl');

ng.module('porybox.prefs', ['ngRoute']).config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/prefs', {
    templateUrl: '/prefs/prefs.view.html',
    controller: ['io', '$mdToast', profileController],
    controllerAs: 'prefs'
  });
}]);
