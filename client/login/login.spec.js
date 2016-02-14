const loginCtrl = require('./login.ctrl');

describe('LoginCtrl', function() {
  // beforeEach(module('porygon'));

  let $controller;

  beforeEach(inject(function(_$controller_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
  }));

  describe('controller.test', function() {
    it('is instansiated correctly', function() {
      const controller = $controller(loginCtrl);
      expect(controller.test).to.equal('test');
    });
  });

  describe('controller.test2', function() {
    it('is instansiated correctly', function() {
      const controller = $controller(loginCtrl);
      expect(controller.test2()).to.equal('test2');
    });

    it('changes with test', function() {
      const controller = $controller(loginCtrl);
      controller.test = 'something';
      expect(controller.test2()).to.equal('something2');
    });
  });
});
