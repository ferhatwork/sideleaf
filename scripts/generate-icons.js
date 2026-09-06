import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function makePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA color
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crcVal = crc32(Buffer.concat([Buffer.from(type), data]));
    buf.writeUInt32BE(crcVal, 8 + len);
    return buf;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Scanlines with filter byte 0 (None)
  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const offset = y * (1 + width * 4);
    rawScanlines[offset] = 0; // filter byte
    rgbaBuffer.copy(rawScanlines, offset + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(rawScanlines, { level: 9 });
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Distance to rounded rectangle centered at (cx, cy) with half-extents (hx, hy) and corner radius r
function sdRoundedBox(px, py, cx, cy, hx, hy, r) {
  const x = Math.abs(px - cx) - (hx - r);
  const y = Math.abs(py - cy) - (hy - r);
  const ox = Math.max(x, 0);
  const oy = Math.max(y, 0);
  const outside = Math.sqrt(ox * ox + oy * oy);
  const inside = Math.min(Math.max(x, y), 0);
  return outside + inside - r;
}

// Distance to segment from (x1, y1) to (x2, y2)
function sdSegment(px, py, x1, y1, x2, y2, radius) {
  const pax = px - x1;
  const pay = py - y1;
  const bax = x2 - x1;
  const bay = y2 - y1;
  const dotBa = bax * bax + bay * bay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / dotBa));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy) - radius;
}

function blendColor(dst, srcR, srcG, srcB, srcA) {
  const invA = 1 - srcA;
  dst[0] = Math.round(srcR * srcA + dst[0] * invA);
  dst[1] = Math.round(srcG * srcA + dst[1] * invA);
  dst[2] = Math.round(srcB * srcA + dst[2] * invA);
  dst[3] = Math.round(255 * (srcA + (dst[3] / 255) * invA));
}

function renderIcon(size) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 32;
  const pixelWidthInUnits = 1 / scale;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // SVG units (0 to 32)
      const u = (x + 0.5) / scale;
      const v = (y + 0.5) / scale;

      const pixelIdx = (y * size + x) * 4;
      const pixel = [0, 0, 0, 0];

      // 1. Background rounded rect: width 32, height 32, rx 8 -> cx=16, cy=16, hx=16, hy=16, r=8
      const dBg = sdRoundedBox(u, v, 16, 16, 16, 16, 8);
      const alphaBg = Math.max(0, Math.min(1, 0.5 - dBg / pixelWidthInUnits));
      if (alphaBg > 0) {
        // #0F1117 -> 15, 17, 23
        blendColor(pixel, 15, 17, 23, alphaBg);
      }

      // 2. Inner stroke rounded rect: x=6, y=6, w=20, h=20, rx=4, stroke-width=2
      // Center is (16, 16), half-width=10, half-height=10, r=4, stroke-width=2
      const dInnerBox = sdRoundedBox(u, v, 16, 16, 10, 10, 4);
      const dInnerStroke = Math.abs(dInnerBox) - 1.0;
      const alphaStroke = Math.max(0, Math.min(1, 0.5 - dInnerStroke / pixelWidthInUnits));
      if (alphaStroke > 0) {
        // #3B82F6 -> 59, 130, 246
        blendColor(pixel, 59, 130, 246, alphaStroke);
      }

      // 3. Line 1: (10, 12) -> (22, 12), stroke width 2, radius 1
      const dLine1 = sdSegment(u, v, 10, 12, 22, 12, 1.0);
      const aLine1 = Math.max(0, Math.min(1, 0.5 - dLine1 / pixelWidthInUnits));

      // 4. Line 2: (10, 16) -> (18, 16), stroke width 2, radius 1
      const dLine2 = sdSegment(u, v, 10, 16, 18, 16, 1.0);
      const aLine2 = Math.max(0, Math.min(1, 0.5 - dLine2 / pixelWidthInUnits));

      // 5. Line 3: (10, 20) -> (15, 20), stroke width 2, radius 1
      const dLine3 = sdSegment(u, v, 10, 20, 15, 20, 1.0);
      const aLine3 = Math.max(0, Math.min(1, 0.5 - dLine3 / pixelWidthInUnits));

      // Combine lines (color #F1F3F7 -> 241, 243, 247)
      const aLines = Math.max(aLine1, aLine2, aLine3);
      if (aLines > 0) {
        blendColor(pixel, 241, 243, 247, aLines);
      }

      buf[pixelIdx] = pixel[0];
      buf[pixelIdx + 1] = pixel[1];
      buf[pixelIdx + 2] = pixel[2];
      buf[pixelIdx + 3] = pixel[3];
    }
  }

  return makePng(size, size, buf);
}

const publicDir = path.resolve(__dirname, '..', 'public');

const png192 = renderIcon(192);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
console.log('Generated icon-192.png (' + png192.length + ' bytes)');

const png512 = renderIcon(512);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
console.log('Generated icon-512.png (' + png512.length + ' bytes)');
