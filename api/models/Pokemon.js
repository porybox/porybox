const pkparse = require('pkparse');
const attributes = {
  encryptionConstant: {},
  dexNo: {},
  heldItemId: {},
  tid: {},
  idNo: {},
  sid: {},
  exp: {},
  abilityId: {},
  abilityNum: {},
  superTrainingHitsRemaining: {},
  superTrainingBag: {},
  pid: {},
  natureId: {},
  isFatefulEncounter: {type: 'boolean'},
  gender: {type: 'json', required: false},
  formId: {},
  evHp: {},
  evAtk: {},
  evDef: {},
  evSpe: {},
  evSpAtk: {},
  evSpDef: {},
  contestStatCool: {},
  contestStatBeauty: {},
  contestStatCute: {},
  contestStatTough: {},
  contestStatSmart: {},
  contestStatSheen: {},
  hasCircleMarking: {type: 'boolean', required: false},
  hasTriangleMarking: {type: 'boolean', required: false},
  hasSquareMarking: {type: 'boolean', required: false},
  hasHeartMarking: {type: 'boolean', required: false},
  hasStarMarking: {type: 'boolean', required: false},
  hasDiamondMarking: {type: 'boolean', required: false},
  hasBlueCircleMarking: {type: 'boolean', required: false},
  hasBlueTriangleMarking: {type: 'boolean', required: false},
  hasBlueSquareMarking: {type: 'boolean', required: false},
  hasBlueHeartMarking: {type: 'boolean', required: false},
  hasBlueStarMarking: {type: 'boolean', required: false},
  hasBlueDiamondMarking: {type: 'boolean', required: false},
  hasPinkCircleMarking: {type: 'boolean', required: false},
  hasPinkTriangleMarking: {type: 'boolean', required: false},
  hasPinkSquareMarking: {type: 'boolean', required: false},
  hasPinkHeartMarking: {type: 'boolean', required: false},
  hasPinkStarMarking: {type: 'boolean', required: false},
  hasPinkDiamondMarking: {type: 'boolean', required: false},
  hyperTrainedHP: {type: 'boolean', required: false},
  hyperTrainedAtk: {type: 'boolean', required: false},
  hyperTrainedDef: {type: 'boolean', required: false},
  hyperTrainedSpAtk: {type: 'boolean', required: false},
  hyperTrainedSpDef: {type: 'boolean', required: false},
  hyperTrainedSpe: {type: 'boolean', required: false},
  pokerusDuration: {},
  pokerusStrain: {},
  medalData: {},
  ribbonData: {},
  contestMemoryRibbonCount: {},
  battleMemoryRibbonCount: {},
  distributionSuperTrainingFlags: {},
  nickname: {type: 'string'},
  move1Id: {},
  move2Id: {},
  move3Id: {},
  move4Id: {},
  move1Pp: {},
  move2Pp: {},
  move3Pp: {},
  move4Pp: {},
  move1Ppu: {},
  move2Ppu: {},
  move3Ppu: {},
  move4Ppu: {},
  eggMove1Id: {},
  eggMove2Id: {},
  eggMove3Id: {},
  eggMove4Id: {},
  canDoSecretSuperTraining: {type: 'boolean'},
  ivHp: {},
  ivAtk: {},
  ivDef: {},
  ivSpe: {},
  ivSpAtk: {},
  ivSpDef: {},
  isEgg: {type: 'boolean'},
  isNicknamed: {type: 'boolean'},
  notOt: {type: 'string', required: false},
  notOtGender: {type: 'string'},
  currentHandlerIsOt: {type: 'boolean'},
  gen: {required: false},
  geoLocation1RegionId: {},
  geoLocation1CountryId: {},
  geoLocation2RegionId: {},
  geoLocation2CountryId: {},
  geoLocation3RegionId: {},
  geoLocation3CountryId: {},
  geoLocation4RegionId: {},
  geoLocation4CountryId: {},
  geoLocation5RegionId: {},
  geoLocation5CountryId: {},
  notOtFriendship: {},
  notOtAffection: {},
  notOtMemoryIntensity: {},
  notOtMemoryLine: {},
  notOtMemoryFeeling: {},
  notOtMemoryTextVar: {},
  fullness: {},
  enjoyment: {},
  ot: {type: 'string'},
  otFriendship: {},
  otAffection: {},
  otMemoryIntensity: {},
  otMemoryLine: {},
  otMemoryTextVar: {},
  otMemoryFeeling: {},
  eggDate: {required: false},
  metDate: {required: false},
  eggLocationId: {},
  metLocationId: {},
  ballId: {},
  levelMet: {},
  otGender: {type: 'string'},
  encounterTypeId: {},
  otGameId: {},
  countryId: {},
  regionId: {},
  consoleRegion: {type: 'string'},
  language: {type: 'string'},

  // TODO: Remove references to _rawPk6 (only used here to avoid needing a migration)
  // https://github.com/porybox/pkparse/issues/12
  _rawFile: {type: 'string', required: false},
  _rawPk6: {type: 'string', required: false},

  _cloneHash: {type: 'string', required: false},
  owner: {model: 'user', type: 'string'},
  box: {model: 'box'},
  _boxVisibility: {enum: Constants.BOX_VISIBILITIES, defaultsTo: 'listed'},
  id: {type: 'string', unique: true, primaryKey: true, required: false},
  visibility: {enum: Constants.POKEMON_VISIBILITIES},
  _markedForDeletion: {type: 'boolean', defaultsTo: false},
  downloadCount: {defaultsTo: 0},
  publicNotes: {type: 'string', defaultsTo: '', maxLength: Constants.MAX_POKEMON_NOTE_LENGTH},
  privateNotes: {type: 'string', defaultsTo: '', maxLength: Constants.MAX_POKEMON_NOTE_LENGTH},
  tsv () {
    return (this.tid ^ this.sid) >>> 4;
  },
  esv () {
    return ((this.pid & 0xffff) ^ (this.pid >>> 16)) >>> 4;
  },
  isShiny () {
    return this.tsv() === this.esv();
  },
  async checkIfUnique () {
    return (await Pokemon.find({
      _cloneHash: this._cloneHash,
      _markedForDeletion: false
    }).limit(2)).length === 1;
  },
  omitPrivateData () {
    /* Omit the PID to prevent people from making clones. Also omit the clone hash, because if the clone hash is known then
    it's possible to brute-force the PID. */
    const secretProperties = ['pid', 'encryptionConstant'];
    if (PokemonHandler.isStaticPidEvent(this)) {
      secretProperties.push('ivHp', 'ivAtk', 'ivDef', 'ivSpe', 'ivSpAtk', 'ivSpDef');
    }
    return _.omit(this, secretProperties);
  },
  omitOwnerOnlyInfo () {
    return _.omit(this, ['privateNotes']);
  },
  async getBoxVisibility () {
    const box = await Box.findOne({id: this.box, _markedForDeletion: false});
    if (!box) {
      sails.log.warn(`The Pokémon with ID ${this.id} has a missing box (ID ${this.box})`);
      return 'unlisted'; // This shouldn't happen, but return the option that would disclose the least amount of info if it does.
    }
    return box.visibility;
  },
  async markForDeletion () {
    return Pokemon.update({id: this.id}, {_markedForDeletion: true});
  },
  async unmarkForDeletion () {
    return Pokemon.update({id: this.id}, {_markedForDeletion: false});
  },
  async destroy () {
    await BoxOrdering.removePkmnIdFromBox(this.box, this.id);
    return await Pokemon.destroy({id: this.id});
  },
  incrementDownloadCount () {
    return Promise.fromCallback(Pokemon.native.bind(Pokemon)).then(collection => {
      return collection.update({_id: this.id}, {$inc: {downloadCount: 1}});
    });
  },
  toJSON () {
    /* Omit internal properties (i.e. properties that start with '_') when converting to JSON.
    Conveniently, this means that the internal properties are never sent to the client.
    (Not to be confused with the omitPrivateData function, which removes *confidential* data.) */
    return _.omit(this, (value, key) => {
      return key.startsWith('_') || ['updatedAt'].includes(key);
    });
  },
  assignParsedNames () {
    return pkparse.assignReadableNames(this, this.language, {gen: this.gen});
  }
};

_.forEach(attributes, attr => {
  // i.e. by default all of the above properties must be integers and are required, unless specified otherwise
  if (_.isUndefined(attr.required) && _.isUndefined(attr.defaultsTo)) {
    attr.required = true;
  }
  if (!_.isUndefined(attr.enum)) {
    return;
  }
  attr.type = attr.type || 'float';
});

attributes.box = {model: 'box'};

module.exports = {
  schema: true,
  attributes,
  beforeCreate (pkmn, next) {
    pkmn.id = Util.generateHexId();
    pkmn._cloneHash = PokemonHandler.computeCloneHash(pkmn);
    next(null, pkmn);
  }
};
