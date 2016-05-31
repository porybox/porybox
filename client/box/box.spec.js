const ctrlTest = require('./box.ctrl');

describe('BoxCtrl', function() {

  let $controller, $scope, $routeParams, io, tested;

  beforeEach(inject(function(_$controller_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
    $scope = {};
    $routeParams = {};
    io = {
      socket: {
        get: function () {}
      }
    };
  }));

  describe('controller variables', function() {
    it('are correctly taken from the box input', function() {
      tested = $controller(ctrlTest, {
        $scope: $scope,
        io: io, $routeParams:
        $routeParams
      }, {box: {
        name: 'boxName',
        description: 'boxDescription',
        user: 'boxUser',
        id: 'boxId'
      }});
      expect(tested.name).to.equal('boxName');
      expect(tested.user).to.equal('boxUser');
      expect(tested.description).to.equal('boxDescription');
      expect(tested.id).to.equal('boxId');
    });

    it('are correctly instantiated when not provided at construction', function() {
      $routeParams.boxid = 'routeParamId';

      tested = $controller(ctrlTest, {
        $scope: $scope,
        io: io, $routeParams:
        $routeParams
      }, {});
      expect(tested.id).to.equal('routeParamId');
      expect(tested.pokemon.length).to.equal(0);
      expect(Object.keys(tested.box).length).to.equal(0);
    });
  });
});
