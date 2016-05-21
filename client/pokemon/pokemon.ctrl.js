/**
 *
 */
module.exports = function($routeParams, $http, $scope) {
  const self = this;
  self.pokemon = self.pokemon || {};
  self.name = self.pokemon.speciesName;
  self.nickname = self.pokemon.nickname;
  self.user = self.pokemon.user;
  self.id = $routeParams.pokemonid || self.pokemon.id;
  self.dexNo = self.pokemon.dexNo;
  self.ball;
  self.item;
  self.level = self.pokemon.level;
  self.nature = self.pokemon.natureName;
  self.ability = self.pokemon.abilityName;
  self.ot = self.pokemon.ot;
  self.tid = self.pokemon.tid;
  self.ivs = self.pokemon.ivHp + '/' +
              self.pokemon.ivAtk + '/' +
              self.pokemon.ivDef + '/' +
              self.pokemon.ivSpe + '/' +
              self.pokemon.ivSpAtk + '/' +
              self.pokemon.ivSpDef;

  self.language = self.pokemon.language;
  // self.ballNameUrl = self.ballName.replace(' ', '-').toLowerCase();
  self.heldItemUrl = self.pokemon.heldItemName.replace(' ', '-').toLowerCase();

  self.tsv = function () {
    return (self.pokemon.tid ^ self.pokemon.sid) >>> 4;
  }

  self.esv = function () {
    return ((self.pokemon.pid & 0xffff) ^ (self.pokemon.pid >>> 16)) >>> 4;
  }

  self.isShiny = function () {
    return self.tsv() === self.esv();
  }

  self.isKB = function () {
    return self.pokemon.otGameId >= 24 && self.pokemon.otGameId <= 29;
  }


  // This will be replaced when I get the ball name
  $http({
    method: 'GET',
    url: 'https://pokeapi.co/api/v2/item/' + self.pokemon.ballId,
    cache: true
  }).then(function (res) {
    self.ball = res.data;
  }, function (errRes) {
    console.log(errRes);
  });

}
