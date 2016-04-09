const ctrlTest = require('./box.ctrl');
const sinon = require('sinon');

describe('BoxCtrl', function() {
  // beforeEach(module('porygon'));

  let $mdDialog = {},
    $controller = {},
    tested, cancelSpy, hideSpy;

  beforeEach(inject(function(_$controller_){
    $mdDialog = {
      cancel: function () {},
      hide: function () {}
    };
    $controller = _$controller_;
    tested = $controller(ctrlTest, {$mdDialog: $mdDialog}, {boxes: []});
    cancelSpy = sinon.spy($mdDialog, 'cancel');
    hideSpy = sinon.spy($mdDialog, 'hide');
  }));

  describe('controller.cancel', function() {

    it('calls $mdDialog.cancel', function() {
      tested.cancel();
      expect(cancelSpy.called).to.equal(true);
    });

  });

  describe('controller.answer', function() {

    it('doesn\'t call $mdDialog.hide when no name set', function() {
      tested.name = '';
      tested.answer();
      expect(hideSpy.called).to.equal(false);
    });

    it('calls $mdDialog.hide when name is set', function() {
      tested.name = 'name';
      tested.answer();
      expect(hideSpy.called).to.equal(true);
    });

    it('calls $mdDialog.hide with name and description when name is set', function() {
      tested.name = 'name';
      tested.name = 'description';
      tested.answer();
      expect(hideSpy.called).to.equal(true);
      expect(hideSpy.calledWith({name: 'name', description: 'description'}));
    });

  });
});
