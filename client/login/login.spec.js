const loginCtrl = require('./login.ctrl');
const Promise = require('bluebird');
Promise.config({warnings: false});

describe('LoginCtrl', function() {
  // beforeEach(module('porygon'));

  let $controller;
  const $scope = {};
  let errorHandler = {}, escapeRegExp = {};
  const $http1 = () => Promise.reject({status: 401, data: 'Error.Passport.Password.Wrong'});
  const $http2 = () => Promise.reject({status: 401, data: 'Error.Passport.Email.Missing'});

  beforeEach(inject(function(_$controller_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
  }));

  describe('controller.login', function() {
    it('is instantiated correctly', () => {
      const controller = $controller(
        loginCtrl,
        {$scope, $http: $http1, errorHandler, escapeRegExp}
      );
      expect(controller.login).to.be.a('function');
    });
  });

  describe('controller.register', function() {
    it('is instantiated correctly', () => {
      const controller = $controller(
        loginCtrl,
        {$scope, $http: $http2, errorHandler, escapeRegExp}
      );
      expect(controller.register).to.be.a('function');
    });
  });
});
