const ctrlTest = require('./box.ctrl');

describe('BoxCtrl', function() {
  // beforeEach(module('porygon'));

  let $controller;

  beforeEach(inject(function(_$controller_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
  }));

  describe('controller variables', function() {
    it('are correctly taken from the box input', function() {
      const controller = $controller(ctrlTest, {}, {box: {
        name: 'nameTest',
        description: 'descriptionTest',
        user: 'userTest'
      }});
      expect(controller.name).to.equal('nameTest');
      expect(controller.user).to.equal('userTest');
      expect(controller.description).to.equal('descriptionTest');
    });
  });
});
