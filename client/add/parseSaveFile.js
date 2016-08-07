/*! This file is adapted from the `keysavcore` npm module.

Copyright (c) 2014-2015 Tobias "Copper Phosphate" Zimmermann

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
(the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify,
merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

'use strict';
const orasOffset = 0x33000;
const xyOffset = 0x22600;
const xyRamsavOffset = 0x1EF38;
const orasRamsavOffset = 0x2F794;
class SaveReaderDecrypted {
  constructor(sav, type) {
    this.sav = sav;
    switch (type) {
    case 'XY':
      this.offset = xyOffset;
      break;
    case 'ORAS':
      this.offset = orasOffset;
      break;
    case 'YABD':
      this.offset = 4;
      if (!Pkx.verifyChk(Pkx.decrypt(sav.subarray(4, 236)))) this.offset = 8;
      break;
    case 'PCDATA':
      this.offset = 0;
      break;
    case 'XYRAM':
      this.offset = xyRamsavOffset;
      break;
    case 'ORASRAM':
      this.offset = orasRamsavOffset;
      break;
    }
  }
  getPkx(pos) {
    const pkxOffset = this.offset + pos * 232;
    let pkx = this.sav.subarray(pkxOffset, pkxOffset + 232);
    if (pkx.every(byte => !byte)) return;
    pkx = Pkx.decrypt(pkx);
    if (Pkx.verifyChk(pkx) && (pkx[8] | pkx[9]) !== 0) {
      return new Pkx(pkx, Math.floor(pos / 30), pos % 30, false);
    }
  }
  getAllPkx() {
    const res = [];
    let tmp;
    for (let i = 0; i < 930; ++i) {
      tmp = this.getPkx(i);
      if (tmp) res.push(tmp);
    }
    return res;
  }
}

class Pkx {
  constructor(pkx, box, slot, isGhost) {
    this.data = pkx;
    this.box = box;
    this.slot = slot;
    this.isGhost = isGhost;
  }
  static deshuffle(pkx, sv) {
    const ekx = new Uint8Array(pkx.length);
    copy(pkx, 0, ekx, 0, 8);
    const sloc = [[0, 1, 2, 3],
            [0, 1, 3, 2],
            [0, 2, 1, 3],
            [0, 3, 1, 2],
            [0, 2, 3, 1],
            [0, 3, 2, 1],
            [1, 0, 2, 3],
            [1, 0, 3, 2],
            [2, 0, 1, 3],
            [3, 0, 1, 2],
            [2, 0, 3, 1],
            [3, 0, 2, 1],
            [1, 2, 0, 3],
            [1, 3, 0, 2],
            [2, 1, 0, 3],
            [3, 1, 0, 2],
            [2, 3, 0, 1],
            [3, 2, 0, 1],
            [1, 2, 3, 0],
            [1, 3, 2, 0],
            [2, 1, 3, 0],
            [3, 1, 2, 0],
            [2, 3, 1, 0],
            [3, 2, 1, 0]];
    const shuffle = sloc[sv];
    for (let b = 0; b < 4; b++) copy(pkx, 8 + 56 * shuffle[b], ekx, 8 + 56 * b, 56);
    return ekx;
  }
  static decrypt(ekx) {
    const pkx = new Uint8Array(ekx.length);
    copy(ekx, 0, pkx, 0, ekx.length);
    const pv = new DataView(pkx.buffer, pkx.byteOffset, pkx.byteLength).getUint32(0, true);
    const sv = ((pv & 0x3E000) >> 0xD) % 24;
    let seed = pv;
    const pkx16 = new Uint16Array(pkx.buffer, pkx.byteOffset, pkx.byteLength >> 1);
    for (let i = 4; i < 116; ++i) {
      seed = (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0;
      pkx16[i] ^= (seed >> 0x10) & 0xFFFF;
    }
    return Pkx.deshuffle(pkx, sv);
  }
  static verifyChk(pkx) {
    let chk = 0;
    const pkx16 = new Uint16Array(pkx.buffer, pkx.byteOffset, pkx.byteLength >> 1);
    if (pkx16[4] > 750 || pkx16[0x48] !== 0) return false;
    for (let i = 4; i < 116; i++) {
      chk += pkx16[i];
    }
    return (chk & 0xFFFF) === pkx16[3];
  }
}

function copy(src, off1, dest, off2, length) {
  const totalOffset1 = off1 + src.byteOffset;
  const totalOffset2 = off2 + dest.byteOffset;
  const lower4Bound = Math.min(-totalOffset1 & 3, length);
  const upper4Bound = Math.min(length & ~3 + lower4Bound, length);
  if (((totalOffset1 - totalOffset2) & 3) !== 0 || lower4Bound >= upper4Bound) {
    for (let i = 0; i < length; ++i) {
      dest[i + off2] = src[i + off1];
    }
  } else {
    for (let i = 0; i < lower4Bound; ++i) {
      dest[i + off2] = src[i + off1];
    }
    const intermediate4Length = (upper4Bound - lower4Bound) >> 2;
    const src32 = new Uint32Array(src.buffer, totalOffset1 + lower4Bound, intermediate4Length);
    const dest32 = new Uint32Array(dest.buffer, totalOffset2 + lower4Bound, intermediate4Length);
    for (let i = 0; i < intermediate4Length; ++i) {
      dest32[i] = src32[i];
    }
    for (let i = upper4Bound; i < length; ++i) {
      dest[i + off2] = src[i + off1];
    }
  }
}

const FILE_SIZES = {
  483328: 'ORAS',
  415232: 'XY',
  [232 * 30 * 32]: 'YABD',
  [232 * 30 * 31]: 'PCDATA',
  458752: 'ORASRAM'
};

module.exports = saveFile => {
  if (saveFile.length === 2 ** 20 + 156 || saveFile.length === 2 ** 20 + 410) {
    saveFile = saveFile.subarray(-(2 ** 20));
  }
  const fileType = FILE_SIZES[saveFile.length];
  if (fileType) return new SaveReaderDecrypted(saveFile, fileType).getAllPkx().map(pkx => pkx.data);
  return [];
};
