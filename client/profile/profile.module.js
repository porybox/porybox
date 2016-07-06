const ng = require('angular');
const profileController = require('./profile.ctrl');

ng.module('porybox.profile', ['ngRoute']).config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/user/:username', {
    templateUrl: '/profile/profile.view.html',
    controller: ['$scope', '$routeParams', 'io', '$mdMedia', '$mdDialog', profileController],
    controllerAs: 'profile'
  });
}]);
