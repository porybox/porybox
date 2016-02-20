const ctrlTest = require('./add.ctrl');
const sinon = require('sinon');

describe('AddCtrl', function() {
  // beforeEach(module('porygon'));

  let $scope = {},
    io = {},
    $controller = {},
    tested, postSpy;

  beforeEach(inject(function(_$controller_){
    $scope = {
      $apply: function () {}
    };
    io = {
      socket: {
        post: function (url, data, callback) {
          callback(data, {statusCode: 200});
        }
      }
    }
    $controller = _$controller_;
    tested = $controller(ctrlTest, {$scope: $scope, io: io}, {boxes: []});
    postSpy = sinon.spy(io.socket, 'post');
  }));

  describe('controller.count', function() {
    it('is instansiated correctly', function() {
      expect(tested.count).to.equal(0);
    });
  });

  describe('controller.addBox', function() {
    it('calls io.socket.post', function() {
      tested.box();
      expect(postSpy.called).to.equal(true);
    });

    it('increments count', function() {
      tested.box();
      expect(tested.count).to.equal(1);
    });

    it('adds to boxes', function() {
      tested.box();
      expect(tested.boxes.length).to.equal(1);
    });
  });
});
