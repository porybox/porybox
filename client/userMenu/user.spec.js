const ctrlTest = require('./user.ctrl');

describe('HomeCtrl', function() {
  // beforeEach(module('porygon'));

  let $controller = {},
    tested;

  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
    tested = $controller(ctrlTest);
    tested.name = 'test';
  }));

  describe('controller.name', function() {
    it('is instansiated correctly', function() {
      expect(tested.name).to.equal('test');
    });
  });
});
