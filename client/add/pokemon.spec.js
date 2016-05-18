const ctrlTest = require('./pokemon.ctrl');
const sinon = require('sinon');

describe('PokemonCtrl', function() {
  // beforeEach(module('porygon'));

  let $mdBottomSheet = {},
    Upload = {},
    $controller = {},
    tested, cancelSpy, uploadSpy;

  beforeEach(inject(function(_$controller_){
    $mdBottomSheet = {
      cancel: function () {},
      hide: function () {}
    };
    Upload = {
      upload: function () {
        return {
          then: function () {}
        }
      }
    }
    $controller = _$controller_;
    tested = $controller(ctrlTest, {$mdBottomSheet: $mdBottomSheet, Upload: Upload}, {boxes: []});
    cancelSpy = sinon.spy($mdBottomSheet, 'cancel');
    uploadSpy = sinon.spy(Upload, 'upload');
  }));

  describe('controller.cancel', function() {

    it('calls $mdDialog.cancel', function() {
      tested.cancel();
      expect(cancelSpy.called).to.equal(true);
    });

  });

  describe('controller.answer', function() {

    it('calls upload.upload', function() {
      tested.answer();
      expect(uploadSpy.called).to.equal(true);
    });

  });
});
