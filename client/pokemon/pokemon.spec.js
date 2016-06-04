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
      }, {data: {
        speciesName: 'Pelipper',
        nickname: 'pokemondNickname',
        dexNo: 'pokemonDexNo',
        owner: 'boxUser',
        id: 'pokemonId',
        tid: 0,
        sid: 0,
        pid: 0xffff0000
      }});
      expect(tested.data.nickname).to.equal('pokemondNickname');
      expect(tested.data.owner).to.equal('boxUser');
      expect(tested.data.dexNo).to.equal('pokemonDexNo');
      expect(tested.data.id).to.equal('pokemonId');
      expect(tested.iconUrl).to.equal('pokemon/regular/pelipper');
    });

    it('are correctly instantiated when not provided at construction', function() {
      $routeParams.pokemonid = 'routeParamId';
      tested = $controller(ctrlTest, {
        $scope: $scope,
        io: io, $routeParams:
        $routeParams
      }, {});
      expect(tested.id).to.equal('routeParamId');
      expect(Object.keys(tested.data).length).to.equal(0);
    });

    it("pads a Pokémon's TID correctly", function() {
      const tested1 = $controller(ctrlTest, {$scope, io, $routeParams}, {data: {tid: 12345}});
      expect(tested1.paddedTid).to.equal('12345');
      const tested2 = $controller(ctrlTest, {$scope, io, $routeParams}, {data: {tid: 1234}});
      expect(tested2.paddedTid).to.equal('01234');
      const tested3 = $controller(ctrlTest, {$scope, io, $routeParams}, {data: {tid: 123}});
      expect(tested3.paddedTid).to.equal('00123');
      const tested4 = $controller(ctrlTest, {$scope, io, $routeParams}, {data: {tid: 12}});
      expect(tested4.paddedTid).to.equal('00012');
      const tested5 = $controller(ctrlTest, {$scope, io, $routeParams}, {data: {tid: 1}});
      expect(tested5.paddedTid).to.equal('00001');
      const tested6 = $controller(ctrlTest, {$scope, io, $routeParams}, {data: {tid: 0}});
      expect(tested6.paddedTid).to.equal('00000');
    });

    it('determines shininess correctly', function() {
      const tested1 = $controller(ctrlTest, {$scope, io, $routeParams}, {data: {
        pid: 0,
        tid: 0,
        sid: 15}
      });
      expect(tested1.isShiny).to.be.true;
      const tested2 = $controller(ctrlTest, {$scope, io, $routeParams}, {data: {
        pid: 0,
        tid: 0,
        sid: 16}
      });
      expect(tested2.isShiny).to.be.false;
    });
  });
});
