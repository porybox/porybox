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
  self.level = self.pokemon.level;
  self.nature = self.pokemon.natureName;
  self.ability = self.pokemon.abilityName;
  self.ot = self.pokemon.ot;
  self.tid = self.pokemon.tid;
  self.paddedTid = ('00000' + self.tid).slice(-5);
  self.ivs = self.pokemon.ivHp + '/' +
              self.pokemon.ivAtk + '/' +
              self.pokemon.ivDef + '/' +
              self.pokemon.ivSpe + '/' +
              self.pokemon.ivSpAtk + '/' +
              self.pokemon.ivSpDef;

  self.language = self.pokemon.language;
  self.ballName = self.pokemon.ballName;
  self.heldItemName = self.pokemon.heldItemName;
  self.ballNameUrl = self.pokemon.ballName
    ? self.pokemon.ballName.replace(' ', '-').replace('é', 'e').toLowerCase()
    : null;

  self.heldItemUrl = self.pokemon.heldItemName
    ? self.pokemon.heldItemName.replace(' ', '-').replace('é', 'e').toLowerCase()
    : null;

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
}
