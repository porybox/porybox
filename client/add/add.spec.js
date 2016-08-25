const ctrlTest = require('./add.ctrl');
const sinon = require('sinon');
const Promise = require('bluebird');
Promise.config({warnings: false});

describe('AddCtrl', function() {
  let $scope = {},
    io = {},
    $controller = {},
    $mdDialog = {},
    $mdMedia = {};
  const $mdToast = {};
  const errorHandler = {};
  let tested, postSpy;
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
    $mdMedia = function () {};
    $controller = _$controller_;
    tested = $controller(ctrlTest, {
      $scope: $scope,
      io: io,
      $mdDialog: $mdDialog,
      $mdMedia: $mdMedia,
      $mdToast,
      errorHandler
    }, {boxes: []});
    tested.prefs = {defaultBoxVisibility: 'listed', defaultPokemonVisibility: 'private'};
    postSpy = sinon.spy(io.socket, 'postAsync');
  }));

  describe('controller.addBox', function() {
    it('calls io.socket.postAsync', function() {
      tested.box();
      expect(postSpy.called).to.equal(true);
    });
  });
});
