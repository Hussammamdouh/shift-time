// qr.js — minimal QR encoder/renderer (byte mode) with adaptive paging
// Supports versions 1..40, ECC L/M/Q/H. Auto-paging for long text.

const ECC_BLOCKS = { L: 0, M: 1, Q: 2, H: 3 };

// ---- Capacity (max bytes, byte mode) per version per ECC (L,M,Q,H)
const CAP_BYTES = [
  [17,14,11,7],[32,26,20,14],[53,42,32,24],[78,62,46,34],[106,84,60,44],
  [134,106,74,58],[154,122,86,64],[192,152,108,84],[230,180,130,98],[271,213,151,119],
  [321,251,177,137],[367,287,203,155],[425,331,241,177],[458,362,258,194],[520,412,292,220],
  [586,450,322,250],[644,504,364,280],[718,560,394,310],[792,624,442,338],[858,666,482,382],
  [929,711,509,403],[1003,779,565,439],[1091,857,611,461],[1171,911,661,511],[1273,997,715,535],
  [1367,1059,751,593],[1465,1125,805,625],[1528,1190,868,658],[1628,1264,908,698],[1732,1370,982,742],
  [1840,1452,1030,790],[1952,1538,1112,842],[2068,1628,1168,898],[2188,1722,1228,958],[2303,1809,1283,983],
  [2431,1911,1351,1051],[2563,1989,1423,1093],[2699,2099,1499,1139],[2809,2213,1579,1219],[2953,2331,1663,1273]
];

// ---- Galois field arithmetic for Reed-Solomon
const GF256 = (() => {
  const EXP = new Uint8Array(512);
  const LOG = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  return {
    mul(a,b){ if(a===0||b===0) return 0; return EXP[LOG[a]+LOG[b]]; },
    pow: EXP,
    log: LOG
  };
})();

function rsGeneratorPoly(deg){
  let poly = new Uint8Array([1]);
  for (let i=0; i<deg; i++){
    const next = new Uint8Array(poly.length+1);
    for (let j=0;j<poly.length;j++){
      next[j] ^= GF256.mul(poly[j], GF256.pow[i]);
      next[j+1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}
function rsComputeRemainder(data, ecLen){
  const gen = rsGeneratorPoly(ecLen);
  let rem = new Uint8Array(ecLen);
  for (const b of data){
    const factor = b ^ rem[0];
    rem.copyWithin(0,1);
    rem[rem.length-1] = 0;
    if (factor !== 0){
      for (let i=0;i<gen.length;i++){
        rem[i] ^= GF256.mul(gen[i], factor);
      }
    }
  }
  return rem;
}

// Structure per version/ECC: [g1,cw1,g2,cw2,ecLen]
const EC_TABLE = {
  L: [
    [1,19,0,0,7],[1,34,0,0,10],[1,55,0,0,15],[1,80,0,0,20],[1,108,0,0,26],
    [2,68,0,0,18],[2,78,0,0,20],[2,97,0,0,24],[2,116,0,0,30],[2,68,2,69,18],
    [4,81,0,0,24],[2,92,2,93,28],[4,107,0,0,32],[3,115,1,116,36],[5,87,1,88,24],
    [5,98,1,99,28],[1,107,5,108,32],[5,120,1,121,36],[3,113,4,114,40],[3,107,5,108,44],
    [4,116,4,117,48],[2,111,7,112,54],[4,121,5,122,58],[6,117,4,118,62],[8,106,4,107,62],
    [10,114,2,115,66],[8,122,4,123,70],[3,117,10,118,74],[7,116,7,117,78],[5,115,10,116,82],
    [13,115,3,116,86],[17,115,0,0,90],[17,115,1,116,94],[13,115,6,116,98],[12,121,7,122,102],
    [6,121,14,122,106],[17,122,4,123,114],[4,122,18,123,118],[20,117,4,118,122],[19,118,6,119,126]
  ],
  M: [
    [1,16,0,0,10],[1,28,0,0,16],[1,44,0,0,26],[2,32,0,0,18],[2,43,0,0,24],
    [4,27,0,0,16],[2,36,2,37,18],[4,25,0,0,22],[4,31,0,0,22],[4,31,2,32,20],
    [4,39,2,40,24],[4,43,2,44,26],[4,44,2,45,30],[4,46,2,47,32],[6,43,2,44,24],
    [6,47,2,48,28],[4,45,6,46,32],[6,45,2,46,36],[6,47,4,48,40],[8,47,1,48,42],
    [8,47,4,48,46],[9,47,4,48,48],[9,47,6,48,50],[10,47,2,48,54],[8,47,4,48,58],
    [8,47,4,48,62],[7,47,5,48,64],[10,47,1,48,68],[8,47,4,48,70],[7,47,5,48,72],
    [7,47,7,48,74],[7,47,10,48,76],[10,47,4,48,80],[9,47,7,48,82],[8,47,10,48,84],
    [8,47,13,48,86],[10,47,4,48,90],[12,47,4,48,92],[14,47,0,0,94],[12,47,6,48,98]
  ],
  Q: [
    [1,13,0,0,13],[1,22,0,0,22],[2,17,0,0,18],[2,24,0,0,26],[2,27,0,0,18],
    [4,19,0,0,24],[4,16,0,0,18],[2,22,2,23,22],[4,20,2,21,20],[6,18,2,19,18],
    [4,20,4,21,20],[6,19,2,20,24],[6,19,2,20,26],[8,19,1,20,24],[5,20,5,21,24],
    [7,21,3,22,28],[10,19,1,20,28],[9,20,4,21,28],[3,20,11,21,26],[3,20,13,21,28],
    [4,20,12,21,30],[4,20,15,21,30],[4,20,16,21,30],[5,20,17,21,30],[7,20,16,21,30],
    [10,20,12,21,32],[8,20,16,21,32],[3,20,21,21,30],[7,20,20,21,32],[5,20,24,21,30],
    [15,20,10,21,32],[15,20,14,21,32],[11,20,16,21,30],[19,20,6,21,34],[23,20,1,21,34],
    [23,20,4,21,34],[19,20,15,21,30],[11,20,23,21,34],[59,16,1,17,30],[22,20,41,21,30]
  ],
  H: [
    [1,9,0,0,17],[1,16,0,0,28],[2,13,0,0,22],[4,9,0,0,16],[2,15,2,16,22],
    [4,14,0,0,28],[4,13,0,0,26],[4,14,0,0,26],[4,12,4,13,24],[6,12,2,13,28],
    [3,12,8,13,28],[7,12,4,13,28],[12,11,4,12,26],[11,12,5,13,24],[11,12,5,13,24],
    [3,12,13,13,30],[2,12,17,13,28],[2,12,19,13,28],[9,12,16,13,26],[15,12,10,13,28],
    [19,12,6,13,30],[34,11,0,0,28],[16,12,14,13,30],[30,12,2,13,30],[22,12,13,13,30],
    [33,12,4,13,30],[12,12,28,13,30],[11,12,31,13,30],[19,12,26,13,30],[23,12,25,13,30],
    [23,12,28,13,30],[19,12,35,13,30],[11,12,46,13,30],[59,12,1,13,30],[22,12,41,13,30],
    [2,12,64,13,30],[24,12,46,13,30],[42,12,32,13,34],[10,12,67,13,30],[20,12,61,13,30]
  ]
};

// ---- Basic QR building (byte mode only)
function getVersionFor(textLen, ecc){
  for (let v=1; v<=40; v++){
    if (textLen <= CAP_BYTES[v-1][ECC_BLOCKS[ecc]]) return v;
  }
  return -1;
}
function modeBits(){ return 0b0100; } // byte mode
function getCharCountBits(version){ return version <= 9 ? 8 : 16; }

function makeData(version, ecc, data){
  const [blocks, ecLen, totalDataCW] = calcStructure(version, ecc);
  const bb = new BitBuf();
  bb.append(modeBits(), 4);
  bb.append(data.length, getCharCountBits(version));
  for (const b of data) bb.append(b, 8);
  const totalBits = totalDataCW * 8;
  if (bb.length > totalBits) throw new Error('Data too long');
  const remain = totalBits - bb.length;
  const term = Math.min(4, remain);
  bb.append(0, term);
  while (bb.length % 8) bb.append(0, 1);
  const PAD = [0xec, 0x11];
  let i = 0;
  while (bb.length < totalBits){ bb.append(PAD[i&1], 8); i++; }
  const raw = bb.toBytes();
  const blocksData = [];
  let offset = 0;
  const { g1, cw1, g2, cw2 } = getBlocksInfo(version, ecc);
  for (let i=0;i<g1;i++){ blocksData.push(raw.slice(offset, offset+cw1)); offset += cw1; }
  for (let i=0;i<g2;i++){ blocksData.push(raw.slice(offset, offset+cw2)); offset += cw2; }
  const ecBlocks = [];
  for (const bd of blocksData) ecBlocks.push(rsComputeRemainder(bd, ecLen));
  const maxDataLen = Math.max(...blocksData.map(b=>b.length));
  const interleaved = [];
  for (let i=0;i<maxDataLen;i++) for (const bd of blocksData) if (i < bd.length) interleaved.push(bd[i]);
  for (let i=0;i<ecLen;i++) for (const ec of ecBlocks) if (i < ec.length) interleaved.push(ec[i]);
  return new Uint8Array(interleaved);
}
function calcStructure(version, ecc){
  const info = getBlocksInfo(version, ecc);
  const totalData = info.g1 * info.cw1 + info.g2 * info.cw2;
  return [info.g1 + info.g2, info.ec, totalData];
}
function getBlocksInfo(version, ecc){
  const row = EC_TABLE[ecc][version-1];
  const [g1, cw1, g2, cw2, ecLen] = row;
  return { g1, cw1, g2, cw2, ec: ecLen };
}

// ---- Matrix building & masking
function buildMatrix(version, ecc, dataCodewords){
  const size = 17 + 4*version;
  const m = Array.from({length:size}, ()=> new Array(size).fill(null));
  drawFinder(m, 0,0); drawFinder(m, size-7,0); drawFinder(m, 0,size-7);
  drawSeparators(m); drawTiming(m); drawAlignment(m, version);
  drawFormatReserve(m); if (version >= 7) drawVersionInfoReserve(m);
  const bits = []; for (const b of dataCodewords) for (let i=7;i>=0;i--) bits.push((b>>>i)&1);
  let dirUp = true, col = size - 1, bitIdx = 0;
  while (col > 0){
    if (col === 6) col--;
    for (let i=0; i<size; i++){
      const r = dirUp ? (size - 1 - i) : i;
      for (let c = col; c >= col-1; c--){
        if (m[r][c] !== null) continue;
        m[r][c] = bitIdx < bits.length ? bits[bitIdx++] : 0;
      }
    }
    col -= 2; dirUp = !dirUp;
  }
  let best = null, bestScore = Infinity;
  for (let mask=0; mask<8; mask++){
    const copy = m.map(row => row.slice());
    applyMask(copy, mask);
    drawFormatBits(copy, ecc, mask);
    if (version >=7) drawVersionBits(copy, version);
    const score = penalty(copy);
    if (score < bestScore){ bestScore = score; best = copy; }
  }
  return best;
}

function drawFinder(m, x, y){
  for (let r=0;r<7;r++) for (let c=0;c<7;c++){
    const on = (r===0||r===6||c===0||c===6) || (r>=2&&r<=4&&c>=2&&c<=4);
    m[y+r][x+c] = on ? 1 : 0;
  }
}
function drawSeparators(m){
  const size = m.length;
  for (let i=0;i<8;i++){
    m[i][7] = 0; m[7][i] = 0;
    m[i][size-8] = 0; m[7][size-1-i] = 0;
    m[size-8][i] = 0; m[size-1-i][7] = 0;
  }
}
function drawTiming(m){
  const size = m.length;
  for (let i=8;i<size-8;i++){
    m[6][i] = i%2===0?1:0;
    m[i][6] = i%2===0?1:0;
  }
}
function alignmentPatternPositions(version){
  if (version===1) return [];
  const num = Math.floor(version/7)+2;
  const step = (version===32)?26:Math.ceil((4*version+4)/ (2*num-2))*1;
  const pos = [6];
  for (let i=0;i<num-1;i++) pos.push((4*version+10) - i*step);
  return pos.reverse();
}
function drawAlignment(m, version){
  const pos = alignmentPatternPositions(version);
  for (let i=0;i<pos.length;i++){
    for (let j=0;j<pos.length;j++){
      const x = pos[i], y = pos[j];
      if (m[y][x] !== null) continue;
      for (let r=-2;r<=2;r++) for (let c=-2;c<=2;c++){
        const rr=y+r, cc=x+c;
        const on = (r===0&&c===0) || (Math.abs(r)===2 || Math.abs(c)===2);
        m[rr][cc] = on ? 1 : 0;
      }
    }
  }
}
function drawFormatReserve(m){
  const size = m.length;
  for (let i=0;i<9;i++){ if (i!==6){ m[8][i] = 0; m[i][8] = 0; } }
  for (let i=0;i<8;i++){ m[size-1-i][8] = 0; m[8][size-1-i] = 0; }
}
function drawVersionInfoReserve(m){
  const size = m.length;
  for (let i=0;i<6;i++) for (let j=0;j<3;j++){
    m[i][size-11+j] = 0;
    m[size-11+j][i] = 0;
  }
}
function bch(code, poly, size){
  let d = code << (size - Math.floor(Math.log2(code)) - 1);
  while ((Math.floor(Math.log2(d)) >= Math.floor(Math.log2(poly)))){
    const shift = Math.floor(Math.log2(d)) - Math.floor(Math.log2(poly));
    d ^= (poly << shift);
  }
  return (code << size) | d;
}
function drawFormatBits(m, ecc, mask){
  const size = m.length;
  const eccBits = { L:1, M:0, Q:3, H:2 }[ecc];
  const code = (eccBits<<3) | mask;
  let data = bch(code, 0x537, 10);
  data ^= 0x5412;
  for (let i=0;i<6;i++) m[8][i] = (data>>i)&1;
  m[8][7] = (data>>6)&1;
  m[8][8] = (data>>7)&1;
  m[7][8] = (data>>8)&1;
  for (let i=9;i<15;i++) m[14-i][8] = (data>>i)&1;
  for (let i=0;i<8;i++) m[m.length-1-i][8] = (data>>i)&1;
  for (let i=8;i<15;i++) m[8][m.length-15+i] = (data>>i)&1;
}
function drawVersionBits(m, version){
  let data = bch(version, 0x1f25, 12);
  for (let i=0;i<6;i++) for (let j=0;j<3;j++){
    m[i][m.length-11+j] = (data>> (i*3 + j)) & 1;
    m[m.length-11+j][i] = (data>> (i*3 + j)) & 1;
  }
}
function isReservedCell(size, r, c, version){
  const inFinder = (x,y)=> (r>=y && r<y+7 && c>=x && c<x+7);
  if (inFinder(0,0) || inFinder(size-7,0) || inFinder(0,size-7)) return true;
  if ((r===7 && c<=7) || (c===7 && r<=7)) return true;
  if ((r===7 && c>=size-8) || (c===size-8 && r<=7)) return true;
  if ((r>=size-8 && c===7) || (c<=7 && r===size-8)) return true;
  if (r===6 || c===6) return true;
  if (r===8 || c===8) return true;
  if (version>=7){
    if (r<6 && c>=size-11 && c<=size-9) return true;
    if (c<6 && r>=size-11 && r<=size-9) return true;
  }
  const positions = alignmentPatternPositions(version);
  for (const ay of positions){
    for (const ax of positions){
      const inTL = ax<=8 && ay<=8;
      const inTR = ax>=size-9 && ay<=8;
      const inBL = ax<=8 && ay>=size-9;
      if (inTL || inTR || inBL) continue;
      if (Math.abs(r-ay)<=2 && Math.abs(c-ax)<=2) return true;
    }
  }
  return false;
}
function applyMask(m, mask){
  const size = m.length;
  const version = (size - 17) / 4 | 0;
  for (let r=0;r<size;r++){
    for (let c=0;c<size;c++){
      if (m[r][c] === null) continue;
      if (isReservedCell(size,r,c,version)) continue;
      let invert = false;
      switch(mask){
        case 0: invert = ((r + c) % 2) === 0; break;
        case 1: invert = (r % 2) === 0; break;
        case 2: invert = (c % 3) === 0; break;
        case 3: invert = ((r + c) % 3) === 0; break;
        case 4: invert = (((Math.floor(r/2)) + Math.floor(c/3)) % 2) === 0; break;
        case 5: invert = (((r*c) % 2) + ((r*c) % 3)) === 0; break;
        case 6: invert = ((((r*c) % 2) + ((r*c) % 3)) % 2) === 0; break;
        case 7: invert = ((((r+c) % 2) + ((r*c) % 3)) % 2) === 0; break;
      }
      if (invert) m[r][c] ^= 1;
    }
  }
}
function penalty(m){
  const size = m.length;
  let s = 0;
  for (let r=0;r<size;r++){
    let run = 1;
    for (let c=1;c<size;c++){
      if (m[r][c] === m[r][c-1]) run++;
      else { if (run>=5) s += 3 + (run-5); run=1; }
    }
    if (run>=5) s += 3 + (run-5);
  }
  for (let c=0;c<size;c++){
    let run = 1;
    for (let r=1;r<size;r++){
      if (m[r][c] === m[r-1][c]) run++;
      else { if (run>=5) s += 3 + (run-5); run=1; }
    }
    if (run>=5) s += 3 + (run-5);
  }
  for (let r=0;r<size-1;r++) for (let c=0;c<size-1;c++){
    const v = m[r][c]+m[r+1][c]+m[r][c+1]+m[r+1][c+1];
    if (v===0 || v===4) s += 3;
  }
  const scorePattern = (arr)=>{
    for (let i=0;i<=arr.length-7;i++){
      if (arr.slice(i,i+7).join('') === '1011101') s += 40;
    }
  };
  for (let r=0;r<size;r++) scorePattern(m[r]);
  for (let c=0;c<size;c++) scorePattern(m.map(row=>row[c]));
  let dark=0; for (let r=0;r<size;r++) for (let c=0;c<size;c++) if (m[r][c]===1) dark++;
  const ratio = Math.abs( (dark*100 / (size*size)) - 50 ) / 5;
  s += Math.floor(ratio) * 10;
  return s;
}
class BitBuf{
  constructor(){ this.bits=[]; }
  append(val, length){
    for (let i=length-1;i>=0;i--) this.bits.push((val>>>i)&1);
  }
  get length(){ return this.bits.length; }
  toBytes(){
    const out = new Uint8Array(Math.ceil(this.bits.length/8));
    for (let i=0;i<this.bits.length;i++){
      out[i>>3] |= this.bits[i] << (7 - (i & 7));
    }
    return out;
  }
}

// ---- Public: encode + draw
function encodeMatrix(text, ecc='M'){
  const data = new TextEncoder().encode(text);
  let version = getVersionFor(data.length, ecc);
  if (version < 0) throw new Error('Data too long');
  const codewords = makeData(version, ecc, data);
  return buildMatrix(version, ecc, codewords);
}

export function drawQR(canvas, text, { ecc='M', scale=4, margin=2 } = {}){
  const m = encodeMatrix(text, ecc);
  const n = m.length;
  const s = Math.max(1, scale|0);
  const mar = Math.max(0, margin|0);
  canvas.width  = (n + mar*2) * s;
  canvas.height = (n + mar*2) * s;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#fff';
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#000';
  for (let r=0;r<n;r++){
    for (let c=0;c<n;c++){
      if (m[r][c] === 1){
        ctx.fillRect((c+mar)*s,(r+mar)*s,s,s);
      }
    }
  }
  canvas.classList.remove('hidden');
}

// NEW: adaptive paging — shrinks chunk size until it fits, uses ECC L for max capacity
export function drawQRWithPaging(canvas, text, opts = {}){
  // First try full text with ECC 'L' for max capacity
  const baseOpts = { ecc: 'L', scale: 4, margin: 2, ...opts };
  try {
    drawQR(canvas, text, baseOpts);
    return { pages: 1, index: 0, getPage: ()=>text, next(){return 0;}, prev(){return 0;} };
  } catch {
    // Need to split into pages; adapt chunk size down until it fits
    let maxChunk = Math.min(1200, text.length);   // optimistic starting point
    let chunkSize = maxChunk;
    let ok = false;

    const trySize = (size) => {
      const chunk = text.slice(0, Math.max(1, size));
      try { drawQR(canvas, chunk, baseOpts); return true; } catch { return false; }
    };

    while (chunkSize > 50){
      if (trySize(chunkSize)){ ok = true; break; }
      chunkSize -= 50;
    }
    if (!ok){
      // As a last resort, go byte-by-byte down to 1 char
      chunkSize = 1;
      if (!trySize(chunkSize)) throw new Error('QR: could not fit even minimal chunk');
    }

    // Build wrapped pages with headers pX/N:
    const chunks = [];
    for (let i=0;i<text.length;i+=chunkSize) chunks.push(text.slice(i, i+chunkSize));
    const wrapped = chunks.map((chunk, idx)=> `p${idx+1}/${chunks.length}:${chunk}`);

    let pageIndex = 0;
    const render = ()=> drawQR(canvas, wrapped[pageIndex], baseOpts);
    render();

    return {
      pages: wrapped.length,
      index: pageIndex,
      next(){ pageIndex = (pageIndex+1) % wrapped.length; render(); return pageIndex; },
      prev(){ pageIndex = (pageIndex-1+wrapped.length) % wrapped.length; render(); return pageIndex; },
      getPage(i){ return wrapped[i]; }
    };
  }
}
