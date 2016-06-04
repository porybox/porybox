'use strict';
const statIndex = {'Hp': 0, 'Atk': 1, 'Def': 2, 'SpAtk': 3, 'SpDef': 4, 'Spe': 5};

module.exports = function($routeParams, $scope, io) {
  this.data = this.data || {};
  this.id = $routeParams.pokemonid || this.data.id;
  this.parseProps = () => {
    this.paddedTid = ('00000' + this.data.tid).slice(-5);
    this.ivs = [
      this.data.ivHp,
      this.data.ivAtk,
      this.data.ivDef,
      this.data.ivSpAtk,
      this.data.ivSpDef,
      this.data.ivSpe
    ];

    this.isKB = this.data.otGameId >= 24 && this.data.otGameId <= 29;
    this.hasHA = this.data.abilityNum === 4;

    this.iconUrl = `pokemon/${this.data.isShiny ? 'shiny' : 'regular'}/${
      this.data.speciesName && this.data.speciesName.toLowerCase()}`;
    this.ballNameUrl = this.data.ballName
      ? this.data.ballName.replace(' ', '-').replace('é', 'e').toLowerCase()
      : null;

    this.heldItemUrl = this.data.heldItemName
      ? this.data.heldItemName.replace(' ', '-').replace('é', 'e').toLowerCase()
      : null;

    this.natureStats = [statIndex[this.data.increasedStat], statIndex[this.data.decreasedStat]];

    this.hasFullData = true;
    return this;
  }

  this.fetch = () => {
    return io.socket.getAsync(`/p/${this.id}`).then(data => {
      Object.assign(this.data, data);
    }).then(this.parseProps).then(() => $scope.$apply());
  };
};
