const pk6parse = require('pk6parse');
exports.computeCloneHash = pkmn => {
  // Computes a hash of this Pokemon's immutable data, for the purposes of detecting clones.
  // Data that can be changed (e.g. current moves, EVs, evolution state) is not included.
  // If the output of this function changes, a database migration should be run to fix the hashes on everything.
  const buf = new Buffer(42).fill(0);
  buf.writeUInt32LE(pkmn.encryptionConstant); // 4 bytes
  buf.write(pkmn.ot, 4, 24, 'utf16le'); // 24 bytes
  buf.writeUInt16LE(pkmn.tid, 28); // 2 bytes
  buf.writeUInt16LE(pkmn.sid, 30); // 2 bytes
  buf.writeUInt32LE(pkmn.pid, 32); // 4 bytes
  buf.writeUInt16LE(pk6parse.getPokemonData(pkmn.dexNo).first_evolution_id, 36); // 2 bytes
  let compactIvs = 0;
  [pkmn.ivHp, pkmn.ivAtk, pkmn.ivDef, pkmn.ivSpe, pkmn.ivSpAtk, pkmn.ivSpDef].forEach(value => {
    compactIvs = compactIvs << 5 | value;
  });
  buf.writeUInt32LE(compactIvs >>> 0, 38); // (5 bits per IV) * (6 IVs) + (2 blank bits) = 32 bits = 4 bytes
  // Total: 42 bytes (initialized in buffer above)
  return require('crypto').createHash('sha256').update(buf).digest('base64');
};
