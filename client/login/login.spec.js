const loginCtrl = require('./login.ctrl');
const Promise = require('bluebird');
Promise.config({warnings: false});

describe('LoginCtrl', function() {
  // beforeEach(module('porygon'));

  let $controller;
  const $scope = {};
  const $http1 = () => Promise.reject({status: 401, data: 'Error.Passport.Password.Wrong'});
  const $http2 = () => Promise.reject({status: 401, data: 'Error.Passport.Email.Missing'});

  beforeEach(inject(function(_$controller_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
  }));

  describe('controller.login', function() {
    it('is instantiated correctly', () => {
      const controller = $controller(loginCtrl, {$scope, $http: $http1});
      expect(controller.login).to.be.a('function');
      return controller.login().then(() => {
        expect(controller.loginError).to.equal('incorrect username/password combination');
        expect(controller.registerError).to.not.be.ok();
      });
    });
  });

  describe('controller.register', function() {
    it('is instantiated correctly', () => {
      const controller = $controller(loginCtrl, {$scope, $http: $http2});
      expect(controller.register).to.be.a('function');
      return controller.register().then(() => {
        expect(controller.registerError).to.equal('invalid email address');
        expect(controller.loginError).to.not.be.ok();
      });
    });
  });
});
