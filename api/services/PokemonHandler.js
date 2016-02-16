const pk6parse = require('pk6parse');
exports.computeCloneHash = pkmn => {
  // Computes a hash of this Pokemon's immutable data, for the purposes of detecting clones.
  // Data that can be changed (e.g. current moves, EVs, evolution state) is not included.
  // If the output of this function changes, a database migration should be run to fix the hashes on everything.
  const buf = new Buffer(48).fill(0);
  buf.write(pkmn.ot, 0, 24, 'utf16le'); // 24 bytes
  buf.writeUInt16LE(pkmn.tid, 24); // 2 bytes
  buf.writeUInt16LE(pkmn.sid, 26); // 2 bytes
  buf.writeUInt32LE(pkmn.pid, 28); // 4 bytes
  buf.writeUInt8(pkmn.natureId, 32); // 1 byte
  buf.writeUInt16LE(pk6parse.getPokemonData(pkmn.dexNo).first_evolution_id, 33); // 2 bytes
  buf.writeUInt16LE(pkmn.eggMove1Id, 35); // 2 bytes
  buf.writeUInt16LE(pkmn.eggMove2Id, 37); // 2 bytes
  buf.writeUInt16LE(pkmn.eggMove3Id, 39); // 2 bytes
  buf.writeUInt16LE(pkmn.eggMove4Id, 41); // 2 bytes
  buf.writeUInt8(pkmn.ballId, 43); // 1 byte
  let compactIvs = 0;
  [pkmn.ivHp, pkmn.ivAtk, pkmn.ivDef, pkmn.ivSpe, pkmn.ivSpAtk, pkmn.ivSpDef].forEach(value => {
    compactIvs = compactIvs << 5 | value;
  });
  buf.writeUInt32LE(compactIvs >>> 0, 44); // (5 bits per IV) * (6 IVs) + (2 blank bits) = 32 bits = 4 bytes
  // Total: 45 bytes (initialized in buffer above)
  return require('crypto').createHash('sha256').update(buf).digest('base64');
};
