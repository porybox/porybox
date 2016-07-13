'use strict';
import moment from 'moment';
import angular from 'angular';
import editCtrl from './pokemon-edit.ctrl';
const statIndex = {'Hp': 0, 'Atk': 1, 'Def': 2, 'SpAtk': 3, 'SpDef': 4, 'Spe': 5};
const genderDifferences = new Set([
  3, 12, 19, 20, 25, 26, 41, 42, 44, 45, 64, 65, 85, 97, 111, 112, 118, 119, 123, 129, 130, 154,
  165, 166, 185, 186, 190, 194, 198, 202, 203, 207, 208, 212, 214, 215, 221, 224, 229, 232, 255,
  256, 257, 267, 269, 272, 274, 275, 307, 308, 315, 316, 317, 322, 323, 332, 350, 369, 396, 397,
  398, 399, 400, 401, 402, 405, 407, 415, 417, 419, 424, 443, 444, 445, 449, 450, 453, 454, 456,
  457, 459, 460, 461, 464, 465, 473, 521, 592, 593, 668, 678
]);

module.exports = class Pokemon {
  constructor ($routeParams, $scope, io, $mdMedia, $mdDialog, $mdToast, errorHandler) {
    this.$scope = $scope;
    this.io = io;
    this.$mdMedia = $mdMedia;
    this.$mdDialog = $mdDialog;
    this.$mdToast = $mdToast;
    this.errorHandler = errorHandler;
    this.data = this.data || {};
    this.id = $routeParams.pokemonid || this.data.id;
    this.errorStatusCode = null;
    this.isDeleted = false;
  }
  fetch () {
    return this.io.socket.getAsync(`/api/v1/pokemon/${this.id}`).then(data => {
      Object.assign(this.data, data);
    }).then(() => this.parseAllProps()).catch(err => {
      this.errorStatusCode = err.statusCode;
    }).then(() => this.$scope.$apply());
  }
  parseBoxViewProps () {
    this.parsedOt = replace3dsUnicodeChars(this.data.ot);
    this.paddedTid = this.data.tid.toString().padStart(5, '0');
    this.paddedEsv = this.data.esv.toString().padStart(4, '0');
    this.parsedNickname = replace3dsUnicodeChars(this.data.nickname);

    this.ballNameUrl = this.data.ballName
      ? this.data.ballName.replace(' ', '-').replace('é', 'e').toLowerCase()
      : null;

    this.heldItemUrl = this.data.heldItemId >= 328 && this.data.heldItemId <= 445 ?
      'tm' : (this.data.heldItemName
      ? this.data.heldItemName.replace(' ', '-').replace('é', 'e').replace('\'', '').toLowerCase()
      : null);

    const shinyString = this.data.isShiny ? 'shiny' : 'regular';
    const genderDiff = this.data.gender === 'F' && genderDifferences.has(this.data.dexNo)
      ? '-f'
      : '';
    const formSuffix = this.data.formId > 0 && [25, 664, 665].indexOf(this.data.dexNo) === -1
      ? '-' + this.data.formId
      : '';

    this.spriteUrl = `pokemon/${shinyString}/${this.data.dexNo}${formSuffix}${genderDiff}`;
    this.spriteClass = `spr-${shinyString} spr-box-${this.data.dexNo}${formSuffix}${genderDiff}`;

    this.isKB = this.data.otGameId >= 24 && this.data.otGameId <= 29;
    this.hasHA = this.data.abilityNum === 4;

    this.ivs = [
      this.data.ivHp,
      this.data.ivAtk,
      this.data.ivDef,
      this.data.ivSpAtk,
      this.data.ivSpDef,
      this.data.ivSpe
    ];

    this.natureStats = [statIndex[this.data.increasedStat], statIndex[this.data.decreasedStat]];

    this.speciesWithForme = this.data.speciesName +
      `${this.data.formName ? '-' + this.data.formName : ''}`;
  }
  parseAllProps () {
    this.parseBoxViewProps();
    this.paddedSid = this.data.sid.toString().padStart(5, '0');
    this.paddedTsv = this.data.tsv.toString().padStart(4, '0');

    this.parsedNotOt = replace3dsUnicodeChars(this.data.notOt);

    this.totalExpToNextLevel = this.data.expFromPreviousLevel + this.data.expToNextLevel;

    this.stats = {
      HP: {
        base: this.data.baseStatHp,
        fullName: 'Hit Points',
        iv: this.data.ivHp,
        ev: this.data.evHp,
        total: this.data.statHp
      },
      Atk: {
        base: this.data.baseStatAtk,
        fullName: 'Attack',
        iv: this.data.ivAtk,
        ev: this.data.evAtk,
        total: this.data.statAtk
      },
      Def: {
        base: this.data.baseStatDef,
        fullName: 'Defense',
        iv: this.data.ivDef,
        ev: this.data.evDef,
        total: this.data.statDef
      },
      SpAtk: {
        base: this.data.baseStatSpAtk,
        fullName: 'Special Attack',
        iv: this.data.ivSpAtk,
        ev: this.data.evSpAtk,
        total: this.data.statSpAtk
      },
      SpDef: {
        base: this.data.baseStatSpDef,
        fullName: 'Special Defense',
        iv: this.data.ivSpDef,
        ev: this.data.evSpDef,
        total: this.data.statSpDef
      },
      Spe: {
        base: this.data.baseStatSpe,
        fullName: 'Speed',
        iv: this.data.ivSpe,
        ev: this.data.evSpe,
        total: this.data.statSpe
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
        moveType: this.data.move1Type,
        Pp: this.data.move1Pp,
        Ppu: this.data.move1Ppu,
        power: this.data.move1Power
      },
      {
        moveName: this.data.move2Name,
        moveType: this.data.move2Type,
        Pp: this.data.move2Pp,
        Ppu: this.data.move2Ppu,
        power: this.data.move2Power
      },
      {
        moveName: this.data.move3Name,
        moveType: this.data.move3Type,
        Pp: this.data.move3Pp,
        Ppu: this.data.move3Ppu,
        power: this.data.move3Power
      },
      {
        moveName: this.data.move4Name,
        moveType: this.data.move4Type,
        Pp: this.data.move4Pp,
        Ppu: this.data.move4Ppu,
        power: this.data.move4Power
      }
    ];

    this.eggMoves = [
      this.data.eggMove1Name,
      this.data.eggMove2Name,
      this.data.eggMove3Name,
      this.data.eggMove4Name
    ];

    this.gameLabel = 'game-' + (this.data.otGameName || '').replace(' ', '-').toLowerCase();

    this.isFromGen4 = [7, 8, 10, 11, 12].indexOf(this.data.otGameId) > -1;

    this.displayMetDate = parseDate(this.data.metDate);
    this.displayEggDate = parseDate(this.data.eggDate);

    this.places = [
      {country: this.data.geoLocation1CountryName, region: this.data.geoLocation1RegionName},
      {country: this.data.geoLocation2CountryName, region: this.data.geoLocation2RegionName},
      {country: this.data.geoLocation3CountryName, region: this.data.geoLocation3RegionName},
      {country: this.data.geoLocation4CountryName, region: this.data.geoLocation4RegionName},
      {country: this.data.geoLocation5CountryName, region: this.data.geoLocation5RegionName}
    ];

    this.hasFullData = true;
    return this;
  }
  edit (event) {
    const useFullScreen
      = (this.$mdMedia('sm') || this.$mdMedia('xs')) && this.$scope.customFullscreen;
    this.$scope.$watch(() => {
      return this.$mdMedia('xs') || this.$mdMedia('sm');
    }, wantsFullScreen => {
      this.$scope.customFullscreen = (wantsFullScreen === true);
    });
    return Promise.resolve(this.$mdDialog.show({
      locals: {data: this.data},
      bindToController: true,
      controller: ['$mdDialog', editCtrl],
      controllerAs: 'dialog',
      templateUrl: 'pokemon/pokemon-edit.view.html',
      parent: angular.element(document.body),
      targetEvent: event,
      clickOutsideToClose: true,
      fullscreen: useFullScreen
    }).then((editedData) => {
      return this.io.socket.patchAsync(`/api/v1/pokemon/${this.id}`, editedData).then(() => {
        Object.assign(this.data, editedData);
        this.$mdToast.show(
          this.$mdToast.simple()
            .textContent(this.parsedNickname + ' edited successfully')
            .position('bottom right'));
        this.$scope.$apply();
        this.$scope.$apply();
      });
    })).catch(this.errorHandler);
  }
  delete () {
    return this.io.socket.deleteAsync(`/api/v1/pokemon/${this.id}`).then(() => {
      this.isDeleted = true;
    }).then(() => {
      const toast = this.$mdToast.simple()
            .hideDelay(10000)
            .textContent(this.parsedNickname + ' deleted')
            .action('Undo')
            .highlightAction(true)
            .position('bottom right');
      this.$mdToast.show(toast).then((response) => {
        if ( response === 'ok' ) {
          this.undelete();
        }
      });
      this.$scope.$apply();
    }).catch(this.errorHandler);
  }
  /* box: the ID of the box to move to (can be the same as the current box)
  ** index (optional): the index where this pokemon should be inserted in the new box.
  ** (Defaults to the last spot in the box.) */
  move ({box, index}) {
    return this.io.socket.postAsync(`/api/v1/pokemon/${this.id}/move`, {box, index}).then(() => {
      this.$scope.$apply();
    }).catch(this.errorHandler);
  }
  undelete () {
    return this.io.socket.postAsync(`/api/v1/pokemon/${this.id}/undelete`).then(() => {
      this.isDeleted = false;
    }).then(() => {
      this.$mdToast.show(
        this.$mdToast.simple()
          .textContent(this.parsedNickname + ' undeleted.')
          .position('top right'));
      this.$scope.$apply();
    }).catch(this.errorHandler);
  }
};

function parseDate(timestamp) {
  return timestamp && moment.utc(timestamp).format('MMMM Do, YYYY');
}

function replace3dsUnicodeChars(str) {
  return str &&
    str.replace(/[\ue08e-\ue09d]/g, c => '♂♀♠♣♥♦★◎○□△◇♪☀☁☂'[c.charCodeAt(0) - 0xe08e] + '\ufe0e');
}
