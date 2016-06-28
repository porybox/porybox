const ctrlTest = require('./pokemon.ctrl');

describe('PokemonCtrl', function() {

  let $controller, $scope, $routeParams, io, tested, $mdMedia, $mdDialog, $mdToast, deps;

  beforeEach(inject(function(_$controller_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
    $scope = {};
    $routeParams = {};
    $mdMedia = {};
    $mdDialog = {};
    $mdToast = {};
    io = {
      socket: {
        get: function () {}
      }
    };
    deps = {$scope, io, $routeParams, $mdMedia, $mdDialog, $mdToast};
  }));

  describe('controller variables', function() {
    it('are correctly taken from the box input', function() {
      tested = $controller(ctrlTest, deps, {data: {
        speciesName: 'Pelipper',
        nickname: 'pokemondNickname',
        dexNo: 'pokemonDexNo',
        owner: 'boxUser',
        id: 'pokemonId',
        isShiny: false,
        tid: 1, sid: 1, esv: 1, tsv: 1
      }});
      tested.parseProps();
      expect(tested.data.nickname).to.equal('pokemondNickname');
      expect(tested.data.owner).to.equal('boxUser');
      expect(tested.data.dexNo).to.equal('pokemonDexNo');
      expect(tested.data.id).to.equal('pokemonId');
      expect(tested.iconUrl).to.equal('pokemon/regular/pelipper');
    });

    it('are correctly instantiated when not provided at construction', function() {
      $routeParams.pokemonid = 'routeParamId';
      tested = $controller(ctrlTest, deps, {data: {tid: 1, sid: 1, esv: 1, tsv: 1}});
      tested.parseProps();
      expect(tested.id).to.equal('routeParamId');
      expect(Object.keys(tested.data).length).to.equal(4);
    });

    it("pads a Pokémon's TID correctly", function() {
      const tested1 = $controller(ctrlTest, deps,
        {data: {tid: 12345, sid: 1, esv: 1, tsv: 1}});
      tested1.parseProps();
      expect(tested1.paddedTid).to.equal('12345');
      const tested2 = $controller(ctrlTest, deps,
        {data: {tid: 1234, sid: 1, esv: 1, tsv: 1}});
      tested2.parseProps();
      expect(tested2.paddedTid).to.equal('01234');
      const tested3 = $controller(ctrlTest, deps,
        {data: {tid: 123, sid: 1, esv: 1, tsv: 1}});
      tested3.parseProps();
      expect(tested3.paddedTid).to.equal('00123');
      const tested4 = $controller(ctrlTest, deps,
        {data: {tid: 12, sid: 1, esv: 1, tsv: 1}});
      tested4.parseProps();
      expect(tested4.paddedTid).to.equal('00012');
      const tested5 = $controller(ctrlTest, deps,
        {data: {tid: 1, sid: 1, esv: 1, tsv: 1}});
      tested5.parseProps();
      expect(tested5.paddedTid).to.equal('00001');
      const tested6 = $controller(ctrlTest, deps,
        {data: {tid: 0, sid: 1, esv: 1, tsv: 1}});
      tested6.parseProps();
      expect(tested6.paddedTid).to.equal('00000');
    });
  });
  it('parses unicode characters correctly', function() {
    const dangerbug = $controller(ctrlTest, deps,
      {data: {tid: 12345, sid: 1, esv: 1, tsv: 1, ot: 'Filthy'}});
    dangerbug.parseProps();
    expect(dangerbug.parsedOt).to.equal('♥︎Filthy♥︎');
  });
});
