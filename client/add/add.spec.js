const ctrlTest = require('./add.ctrl');
const sinon = require('sinon');

describe('AddCtrl', function() {
  // beforeEach(module('porygon'));

  let $scope = {},
    io = {},
    $controller = {},
    $mdDialog = {},
    $mdMedia = {},
    $mdBottomSheet = {},
    tested, postSpy;
  beforeEach(inject(function(_$controller_){
    $scope = {
      boxes: [],
      $apply: function () {},
      $watch: function () {}
    };
    io = {
      socket: {
        post: function (url, data, callback) {
          callback(data, {statusCode: 200});
        }
      }
    };
    $mdDialog = {
      show: function () {
        return {
          then: function (fn) {
            fn({name: 'name', description: 'description'});
          }
        }
      }
    };
    $mdBottomSheet = {
      show: function () {
        return {
          then: function (fn) {
            fn({name: 'name', description: 'description'});
          }
        }
      }
    };
    $mdMedia = function () {};
    $controller = _$controller_;
    tested = $controller(ctrlTest, {
      $scope: $scope,
      io: io,
      $mdDialog: $mdDialog,
      $mdMedia: $mdMedia,
      $mdBottomSheet: $mdBottomSheet
    }, {boxes: []});
    postSpy = sinon.spy(io.socket, 'post');
  }));

  describe('controller.addBox', function() {
    it('calls io.socket.post', function() {
      tested.box();
      expect(postSpy.called).to.equal(true);
    });

    it('adds to boxes', function() {
      expect(tested.boxes.length).to.equal(0);
      tested.box();
      expect(tested.boxes.length).to.equal(1);
    });
  });
});
