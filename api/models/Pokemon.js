const attributes = {
  dexNo: {},
  heldItemId: {},
  tid: {},
  sid: {},
  exp: {},
  abilityId: {},
  abilityNum: {},
  superTrainingHitsRemaining: {},
  superTrainingBag: {},
  pid: {},
  natureId: {},
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
  hasCircleMarking: {type: 'boolean'},
  hasTriangleMarking: {type: 'boolean'},
  hasSquareMarking: {type: 'boolean'},
  hasHeartMarking: {type: 'boolean'},
  hasStarMarking: {type: 'boolean'},
  hasDiamondMarking: {type: 'boolean'},
  pokerusDuration: {},
  pokerusStrain: {},
  medalData: {},
  ribbonData: {},
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
  geoLocation1: {},
  geoLocation2: {},
  geoLocation3: {},
  geoLocation4: {},
  geoLocation5: {},
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
  metDate: {},
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
  rawPk6: {type: 'string'},
  cloneHash: {type: 'string'},
  ownerUsername: {type: 'string'},
};

_.forEach(attributes, attr => {
  // i.e. by default all of the above properties must be integers and are required, unless specified otherwise
  if (typeof attr === 'object') {
    attr.required = attr.required !== undefined ? attr.required : true;
    attr.type = attr.type || 'int';
  }
});

attributes.tsv = function () {
  return (this.tid ^ this.sid) >>> 4;
}
attributes.esv = function () {
  return ((this.pid & 0xffff) ^ (this.pid >>> 16)) >>> 4;
}
attributes.isShiny = function () {
  return this.tsv() === this.esv();
}
attributes.isUnique = async function () {
  return (await Pokemon.find({cloneHash: this.cloneHash})).length === 1;
}
attributes.isStaticPidEvent = function () {
  return false; // TODO: Make this identify static PID events
}
attributes.omitPrivateData = function () {
  /* Omit the PID to prevent people from making clones. Also omit the clone hash, because if the clone hash is known then
  it's possible to brute-force the PID. */
  const secretProperties = ['pid', 'cloneHash'];
  if (this.isStaticPidEvent()) {
    secretProperties.push('ivHp', 'ivAtk', 'ivDef', 'ivSpe', 'ivSpAtk', 'ivSpDef');
  }
  return _.omit(this, secretProperties);
};

module.exports = {schema: true, attributes};
