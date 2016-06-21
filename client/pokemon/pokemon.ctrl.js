'use strict';
import moment from 'moment';
const statIndex = {'Hp': 0, 'Atk': 1, 'Def': 2, 'SpAtk': 3, 'SpDef': 4, 'Spe': 5};
const genderDifferences = [3, 12, 19, 20, 25, 26, 41, 42, 44, 45, 64, 65, 85, 97, 111, 112, 118, 119, 123, 129, 130, 154, 165, 166, 185, 186, 190, 194, 198, 202, 203, 207, 208, 212, 214, 215, 221, 224, 229, 232, 255, 256, 257, 267, 269, 272, 274, 275, 307, 308, 315, 316, 317, 322, 323, 332, 350, 369, 396, 397, 398, 399, 400, 401, 402, 405, 407, 415, 417, 419, 424, 443, 444, 445, 449, 450, 453, 454, 456, 457, 459, 460, 461, 464, 465, 473, 521, 592, 593, 668, 678];

module.exports = function($routeParams, $scope, io) {
  this.data = this.data || {};
  this.id = $routeParams.pokemonid || this.data.id;
  this.parseProps = () => {
    this.paddedTid = ('00000' + this.data.tid).slice(-5);
    this.paddedSid = ('00000' + this.data.sid).slice(-5);
    this.paddedEsv = ('0000' + this.data.esv).slice(-4);
    this.paddedTsv = ('0000' + this.data.tsv).slice(-4);
    this.ivs = [
      this.data.ivHp,
      this.data.ivAtk,
      this.data.ivDef,
      this.data.ivSpAtk,
      this.data.ivSpDef,
      this.data.ivSpe
    ];

    this.stats = {
      HP: {
        fullName: 'Hit Points',
        iv: this.data.ivHp,
        ev: this.data.evHp
      },
      Atk: {
        fullName: 'Attack',
        iv: this.data.ivAtk,
        ev: this.data.evAtk
      },
      Def: {
        fullName: 'Defense',
        iv: this.data.ivDef,
        ev: this.data.evDef
      },
      SpAtk: {
        fullName: 'Special Attack',
        iv: this.data.ivSpAtk,
        ev: this.data.evSpAtk
      },
      SpDef: {
        fullName: 'Special Defense',
        iv: this.data.ivSpDef,
        ev: this.data.evSpDef
      },
      Spe: {
        fullName: 'Speed',
        iv: this.data.ivSpe,
        ev: this.data.evSpe
      }
    };

    this.contestStats = {
      cool: this.data.contestStatCool,
      beauty: this.data.contestStatBeauty,
      cute: this.data.contestStatCute,
      clever: this.data.contestStatSmart,
      tough: this.data.contestStatTough,
      sheen: this.data.contestStatSheen
    };

    this.moves = [
      {
        moveName: this.data.move1Name,
        Pp: this.data.move1Pp,
        Ppu: this.data.move1Ppu
      },
      {
        moveName: this.data.move2Name,
        Pp: this.data.move2Pp,
        Ppu: this.data.move2Ppu
      },
      {
        moveName: this.data.move3Name,
        Pp: this.data.move3Pp,
        Ppu: this.data.move3Ppu
      },
      {
        moveName: this.data.move4Name,
        Pp: this.data.move4Pp,
        Ppu: this.data.move4Ppu
      }
    ];

    this.eggMoves = [
      this.data.eggMove1Name,
      this.data.eggMove2Name,
      this.data.eggMove3Name,
      this.data.eggMove4Name
    ];

    this.gameLabel = 'label-' + (this.data.otGameName || '').replace(' ', '-').toLowerCase();

    this.isKB = this.data.otGameId >= 24 && this.data.otGameId <= 29;
    this.hasHA = this.data.abilityNum === 4;

    this.iconUrl = `pokemon/${this.data.isShiny ? 'shiny' : 'regular'}/${
      this.data.speciesName && this.data.speciesName.toLowerCase()}`;
    this.spriteUrl = `pokemon/${this.data.isShiny ? 'shiny' : 'regular'}/${this.data.gender === 'F' &&
      genderDifferences.indexOf(this.data.dexNo) > -1 ? 'female/' : ''}${this.data.dexNo}`;
    this.ballNameUrl = this.data.ballName
      ? this.data.ballName.replace(' ', '-').replace('é', 'e').toLowerCase()
      : null;

    this.heldItemUrl = this.data.heldItemName
      ? this.data.heldItemName.replace(' ', '-').replace('é', 'e').toLowerCase()
      : null;

    this.natureStats = [statIndex[this.data.increasedStat], statIndex[this.data.decreasedStat]];

    this.displayMetDate = parseDate(this.data.metDate);
    this.displayEggDate = parseDate(this.data.eggDate);

    this.hasFullData = true;
    return this;
  };

  this.fetch = () => {
    return io.socket.getAsync(`/p/${this.id}`).then(data => {
      Object.assign(this.data, data);
    }).then(this.parseProps).then(() => $scope.$apply());
  };
};

function parseDate(timestamp) {
  return timestamp && moment.utc(timestamp).format('MMMM Do, YYYY');
}
