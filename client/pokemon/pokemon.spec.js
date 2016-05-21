const ctrlTest = require('./pokemon.ctrl');

describe('PokemonCtrl', function() {

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
      }, {pokemon: {
        nickname: 'pokemondNickname',
        dexNo: 'pokemonDexNo',
        user: 'boxUser',
        id: 'pokemonId'
      }});
      expect(tested.nickname).to.equal('pokemondNickname');
      expect(tested.user).to.equal('boxUser');
      expect(tested.dexNo).to.equal('pokemonDexNo');
      expect(tested.id).to.equal('pokemonId');
    });

    it('are correctly instantiated when not provided at construction', function() {
      $routeParams.pokemonid = 'routeParamId';
      tested = $controller(ctrlTest, {
        $scope: $scope,
        io: io, $routeParams:
        $routeParams
      }, {});
      expect(tested.id).to.equal('routeParamId');
      expect(Object.keys(tested.pokemon).length).to.equal(0);
    });
  });
});
