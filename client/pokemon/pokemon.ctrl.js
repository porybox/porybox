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
  this.isShiny = this.tsv === this.esv && !this.data.isEgg;
  this.isKB = this.data.otGameId >= 24 && this.data.otGameId <= 29;

  this.iconUrl = `pokemon/${this.isShiny ? 'shiny' : 'regular'}/${this.data.speciesName.toLowerCase()}`;

  this.ballNameUrl = this.data.ballName
    ? this.data.ballName.replace(' ', '-').replace('é', 'e').toLowerCase()
    : null;

  this.heldItemUrl = this.data.heldItemName
    ? this.data.heldItemName.replace(' ', '-').replace('é', 'e').toLowerCase()
    : null;

};
