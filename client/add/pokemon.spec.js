const ctrlTest = require('./pokemon.ctrl');
const sinon = require('sinon');
const angular = require('angular');

describe('PokemonCtrl', function() {
  // beforeEach(module('porygon'));

  let $mdDialog = {},
    $controller = {},
    $routeParams = {},
    tested, cancelSpy, hideSpy;

  beforeEach(function(){
    $mdDialog = {
      cancel: function () {},
      hide: function () {}
    };
    angular.mock.module(function($compileProvider) {
      $compileProvider.preAssignBindingsEnabled(true);
    });
    inject(function (_$controller_) {
      $controller = _$controller_;
      tested = $controller(ctrlTest, {$mdDialog, $routeParams}, {boxes: []});
    });
    cancelSpy = sinon.spy($mdDialog, 'cancel');
    hideSpy = sinon.spy($mdDialog, 'hide');
  });

  describe('controller.cancel', function() {

    it('calls $mdDialog.cancel', function() {
      tested.cancel();
      expect(cancelSpy.called).to.equal(true);
    });

  });

  describe('controller.answer', function() {

    it('calls upload.upload', function() {
      tested.answer();
      expect(hideSpy.called).to.equal(true);
    });

  });

  describe('default box', function() {
    it('uses the most-recently-edited box if not on a box page', function() {
      tested = $controller(ctrlTest, {$mdDialog, $routeParams}, {boxes: [
        {updatedAt: 0, id: 'foo'},
        {updatedAt: 1, id: 'bar'}
      ]});
      expect(tested.defaultBox).to.equal('bar');
    });
    it('uses the most-recently-edited box if on a box page not belonging to the user', function() {
      $routeParams = {boxid: 'baz'};
      tested = $controller(ctrlTest, {$mdDialog, $routeParams}, {boxes: [
        {updatedAt: 0, id: 'foo'},
        {updatedAt: 1, id: 'bar'}
      ]});
      expect(tested.defaultBox).to.equal('bar');
    });
    it('uses the current box if on a box page belonging to the user', function() {
      $routeParams = {boxid: 'foo'};
      tested = $controller(ctrlTest, {$mdDialog, $routeParams}, {boxes: [
        {updatedAt: 0, id: 'foo'},
        {updatedAt: 1, id: 'bar'}
      ]});
      expect(tested.defaultBox).to.equal('foo');
    });
  });
});
