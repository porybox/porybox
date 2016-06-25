const ctrlTest = require('./add.ctrl');
const sinon = require('sinon');
const Promise = require('bluebird');
Promise.config({warnings: false});

describe('AddCtrl', function() {
  // beforeEach(module('porygon'));

  let $scope = {},
    io = {},
    $controller = {},
    $mdDialog = {},
    $mdMedia = {},
    $mdBottomSheet = {},
    Upload = {},
    tested, postSpy;
  beforeEach(inject(function(_$controller_){
    $scope = {
      boxes: [],
      $apply: function () {},
      $watch: function () {}
    };
    io = {
      socket: {
        postAsync: function () {
          return Promise.resolve().then(() => ({}));
        }
      }
    };
    $mdDialog = {
      show: function () {
        return {
          then: function (fn) {
            fn({name: 'name', description: 'description'});
          }
        };
      }
    };
    $mdBottomSheet = {
      show: function () {
        return {
          then: function (fn) {
            fn({name: 'name', description: 'description'});
          }
        };
      }
    };
    $mdMedia = function () {};
    $controller = _$controller_;
    tested = $controller(ctrlTest, {
      $scope: $scope,
      io: io,
      $mdDialog: $mdDialog,
      $mdMedia: $mdMedia,
      $mdBottomSheet: $mdBottomSheet,
      Upload: Upload
    }, {boxes: []});
    postSpy = sinon.spy(io.socket, 'postAsync');
  }));

  describe('controller.addBox', function() {
    it('calls io.socket.postAsync', function() {
      tested.box();
      expect(postSpy.called).to.equal(true);
    });

    it('adds to boxes', function () {
      expect(tested.boxes.length).to.equal(0);
      return tested.box().then(() => {
        expect(tested.boxes.length).to.equal(1);
      });
    });
  });
});
