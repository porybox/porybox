/**
 *
 */
module.exports = function($routeParams, $http, $scope) {
  this.data = this.data || {};
  this.id = $routeParams.pokemonid || this.data.id;
  this.paddedTid = ('00000' + this.data.tid).slice(-5);
  this.ivs = [
    this.data.ivHp,
    this.data.ivAtk,
    this.data.ivDef,
    this.data.ivSpAtk,
    this.data.ivSpDef,
    this.data.ivSpe
  ].join('/');

  this.tsv = (this.data.tid ^ this.data.sid) >>> 4;
  this.esv = ((this.data.pid & 0xffff) ^ (this.data.pid >>> 16)) >>> 4;
  this.isShiny = this.tsv === this.esv;
  this.isKB = this.data.otGameId >= 24 && this.data.otGameId <= 29;

  self.tsv = function () {
    return (self.pokemon.tid ^ self.pokemon.sid) >>> 4;
  };

  self.esv = function () {
    return ((self.pokemon.pid & 0xffff) ^ (self.pokemon.pid >>> 16)) >>> 4;
  };

  self.isShiny = function () {
    return self.tsv() === self.esv();
  };

  self.isKB = function () {
    return self.pokemon.otGameId >= 24 && self.pokemon.otGameId <= 29;
  }
};
