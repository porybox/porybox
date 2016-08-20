const ctrlTest = require('./pokemon.ctrl');

describe('PokemonCtrl', function() {

  let $controller, $scope, $routeParams, io, tested, $mdMedia, $mdDialog, $mdToast, deps;
  let errorHandler;

  beforeEach(inject(function(_$controller_){
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
    $scope = {};
    $routeParams = {};
    $mdMedia = {};
    $mdDialog = {};
    $mdToast = {};
    errorHandler = {};
    io = {
      socket: {
        get: function () {}
      }
    };
    deps = {$scope, io, $routeParams, $mdMedia, $mdDialog, $mdToast, errorHandler};
  }));

  describe('controller variables', function() {
    it('are correctly taken from the box input', function() {
      tested = $controller(ctrlTest, deps, {data: {
        speciesName: 'Pelipper',
        nickname: 'pokemondNickname',
        dexNo: 279,
        owner: 'boxUser',
        id: 'pokemonId',
        isShiny: false,
        tid: 1, sid: 1, esv: 1, tsv: 1
      }});
      tested.parseAllProps();
      expect(tested.data.nickname).to.equal('pokemondNickname');
      expect(tested.data.owner).to.equal('boxUser');
      expect(tested.data.dexNo).to.equal(279);
      expect(tested.data.id).to.equal('pokemonId');
      expect(tested.spriteUrl).to.equal('pokemon/regular/279');
    });

    it('are correctly instantiated when not provided at construction', function() {
      $routeParams.pokemonid = 'routeParamId';
      tested = $controller(ctrlTest, deps, {data: {tid: 1, sid: 1, esv: 1, tsv: 1}});
      tested.parseAllProps();
      expect(tested.id).to.equal('routeParamId');
      expect(Object.keys(tested.data).length).to.equal(4);
    });

    it("pads a Pokémon's TID correctly", function() {
      const tested1 = $controller(ctrlTest, deps,
        {data: {tid: 12345, sid: 1, esv: 1, tsv: 1}});
      tested1.parseAllProps();
      expect(tested1.paddedTid).to.equal('12345');
      const tested2 = $controller(ctrlTest, deps,
        {data: {tid: 1234, sid: 1, esv: 1, tsv: 1}});
      tested2.parseAllProps();
      expect(tested2.paddedTid).to.equal('01234');
      const tested3 = $controller(ctrlTest, deps,
        {data: {tid: 123, sid: 1, esv: 1, tsv: 1}});
      tested3.parseAllProps();
      expect(tested3.paddedTid).to.equal('00123');
      const tested4 = $controller(ctrlTest, deps,
        {data: {tid: 12, sid: 1, esv: 1, tsv: 1}});
      tested4.parseAllProps();
      expect(tested4.paddedTid).to.equal('00012');
      const tested5 = $controller(ctrlTest, deps,
        {data: {tid: 1, sid: 1, esv: 1, tsv: 1}});
      tested5.parseAllProps();
      expect(tested5.paddedTid).to.equal('00001');
      const tested6 = $controller(ctrlTest, deps,
        {data: {tid: 0, sid: 1, esv: 1, tsv: 1}});
      tested6.parseAllProps();
      expect(tested6.paddedTid).to.equal('00000');
    });
  });
  it('parses unicode characters correctly', function() {
    const dangerbug = $controller(ctrlTest, deps,
      {data: {tid: 12345, sid: 1, esv: 1, tsv: 1, ot: 'Filthy'}});
    dangerbug.parseAllProps();
    expect(dangerbug.parsedOt).to.equal('♥︎Filthy♥︎');
  });
});
