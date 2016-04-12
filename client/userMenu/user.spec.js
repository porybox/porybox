const ctrlTest = require('./user.ctrl');

describe('HomeCtrl', function() {
  // beforeEach(module('porygon'));

  let $scope = {},
    io = {},
    $controller = {},
    tested;

  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
    $scope = {};
    io = {
      socket: {
        post: function (url, data, callback) {
          callback(data, {statusCode: 200});
        }
      }
    };
    tested = $controller(ctrlTest, {$scope, io});
    tested.name = 'test';
  }));

  describe('controller.name', function() {
    it('is instantiated correctly', function() {
      expect(tested.name).to.equal('test');
    });
  });
});
