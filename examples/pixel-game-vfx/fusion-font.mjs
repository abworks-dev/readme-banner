import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

/** Immutable identity of the complete official font; see fonts/manifest.json. */
export const FUSION_FONT = Object.freeze({
  id: 'fusion-pixel-12px-monospaced-zh_hans@2026.10.25',
  family: 'Fusion Pixel 12px Mono zh_Hans',
  version: '2026.10.25',
  filename: 'fusion-pixel-12px-monospaced-zh_hans-v2026.10.25.bdf.gz',
  sha256: '41e1910f7836be732d404e01903bbba7d4a4c0bb7b7fa170b72b7976a070d3b9',
  bdfSha256: 'bdb520006cddacccc1d3f780d5fab79007a4d6d1f3559d04665e652af4cdf50f',
  glyphCount: 37857,
  pixelSize: 12,
  ascent: 10,
  descent: 2,
  lineHeight: 12,
  maxInkAscent: 15,
  maxInkDescent: 7,
});

const DEFAULT_ASSET = new URL(`./fonts/${FUSION_FONT.filename}`, import.meta.url);
const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024;
const MAX_BDF_BYTES = 8 * 1024 * 1024;
const MAX_GLYPHS = 65_536;
const MAX_BITMAP_SIDE = 32;
const MAX_LINE_LENGTH = 1024;
const MAX_LINES = 1_000_000;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const scalar = value => Number.isInteger(value) && value >= 0 && value <= 0x10ffff &&
  !(value >= 0xd800 && value <= 0xdfff);

/**
 * Parse bounded BDF 2.1 data without executing it or consulting a font engine.
 * Exported for in-memory format verification; normal rendering uses loadFusionFont.
 *
 * Glyph rows are top-to-bottom integers. Pixel x is on when
 * (rows[y] & (1 << (width - 1 - x))) !== 0. Row byte padding is removed.
 * bearingY is baseline-to-top: draw at (penX + bearingX, baseline - bearingY).
 * All metrics and bitmap rows are in native font pixels, before integer scaling.
 */
export function parseFusionBdf(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > MAX_BDF_BYTES) {
    throw new Error('Fusion BDF exceeds the 8 MiB text limit');
  }
  let cursor = 0;
  let lineNumber = 0;
  function fail(message) { throw new Error(`Invalid Fusion BDF at line ${lineNumber}: ${message}`); }
  function nextLine() {
    if (cursor >= text.length) return undefined;
    const newline = text.indexOf('\n', cursor);
    const end = newline < 0 ? text.length : newline;
    const line = text.slice(cursor, end).replace(/\r$/, '');
    cursor = newline < 0 ? text.length : newline + 1;
    if (++lineNumber > MAX_LINES || line.length > MAX_LINE_LENGTH) fail('line limit exceeded');
    return line;
  }
  function integers(value, count) {
    const fields = value.split(' ');
    if (fields.length !== count || fields.some(field => !/^-?\d+$/.test(field))) fail('invalid integer fields');
    const numbers = fields.map(Number);
    if (numbers.some(number => !Number.isSafeInteger(number))) fail('integer out of range');
    return numbers;
  }
  function quoted(value) {
    if (!/^"[^"\r\n]*"$/.test(value)) fail('invalid quoted property');
    return value.slice(1, -1);
  }
  if (nextLine() !== 'STARTFONT 2.1') fail('expected STARTFONT 2.1');
  const properties = new Map();
  let propertyCount;
  let declaredGlyphCount;
  let fontSize;
  let boundingBox;
  let line;
  while ((line = nextLine()) !== undefined) {
    if (line.startsWith('COMMENT ')) continue;
    if (line.startsWith('FONT ')) continue;
    if (line.startsWith('SIZE ')) {
      if (fontSize) fail('duplicate SIZE');
      fontSize = integers(line.slice(5), 3);
    } else if (line.startsWith('FONTBOUNDINGBOX ')) {
      if (boundingBox) fail('duplicate FONTBOUNDINGBOX');
      boundingBox = integers(line.slice(16), 4);
    } else if (line.startsWith('STARTPROPERTIES ')) {
      if (propertyCount !== undefined) fail('duplicate properties');
      [propertyCount] = integers(line.slice(16), 1);
      if (propertyCount < 1 || propertyCount > 128) fail('property count out of range');
      for (let index = 0; index < propertyCount; index++) {
        const property = nextLine();
        const match = property?.match(/^([A-Z_]+) (.+)$/);
        if (!match || properties.has(match[1])) fail('missing or duplicate property');
        properties.set(match[1], match[2]);
      }
      if (nextLine() !== 'ENDPROPERTIES') fail('property count mismatch');
    } else if (line.startsWith('CHARS ')) {
      [declaredGlyphCount] = integers(line.slice(6), 1);
      break;
    } else fail('unexpected font header');
  }
  const readPropertyInteger = name => {
    if (!properties.has(name)) fail(`missing ${name}`);
    return integers(properties.get(name), 1)[0];
  };
  const pixelSize = readPropertyInteger('PIXEL_SIZE');
  const ascent = readPropertyInteger('FONT_ASCENT');
  const descent = readPropertyInteger('FONT_DESCENT');
  if (pixelSize !== 12 || fontSize?.[0] !== pixelSize || ascent < 1 || descent < 0 ||
      ascent + descent > MAX_BITMAP_SIDE || !boundingBox || boundingBox[0] < 1 ||
      boundingBox[0] > MAX_BITMAP_SIDE || boundingBox[1] < 1 || boundingBox[1] > MAX_BITMAP_SIDE ||
      quoted(properties.get('CHARSET_REGISTRY') ?? '') !== 'ISO10646' ||
      quoted(properties.get('CHARSET_ENCODING') ?? '') !== '1') fail('unsupported font metrics or charset');
  if (!Number.isInteger(declaredGlyphCount) || declaredGlyphCount < 1 || declaredGlyphCount > MAX_GLYPHS) {
    fail('glyph count out of range');
  }
  const glyphs = new Map();
  let missingGlyphCodePoint;
  let maxInkAscent = 0;
  let maxInkDescent = 0;
  for (let index = 0; index < declaredGlyphCount; index++) {
    line = nextLine();
    if (!line?.startsWith('STARTCHAR ') || line.length <= 10) fail('expected STARTCHAR');
    const name = line.slice(10);
    let codePoint;
    let advance;
    let box;
    let inBitmap = false;
    while ((line = nextLine()) !== undefined) {
      if (line.startsWith('ENCODING ')) {
        if (codePoint !== undefined) fail('duplicate ENCODING');
        [codePoint] = integers(line.slice(9), 1);
        if (!scalar(codePoint)) fail('invalid Unicode scalar');
      } else if (line.startsWith('SWIDTH ')) {
        integers(line.slice(7), 2); // Scalable widths are not used for native bitmap layout.
      } else if (line.startsWith('DWIDTH ')) {
        if (advance !== undefined) fail('duplicate DWIDTH');
        const [x, y] = integers(line.slice(7), 2);
        if (x < 0 || x > MAX_BITMAP_SIDE || y !== 0) fail('unsupported advance');
        advance = x;
      } else if (line.startsWith('BBX ')) {
        if (box) fail('duplicate BBX');
        box = integers(line.slice(4), 4);
        const [width, height, x, y] = box;
        if (width < 0 || width > MAX_BITMAP_SIDE || height < 0 || height > MAX_BITMAP_SIDE ||
            Math.abs(x) > MAX_BITMAP_SIDE || Math.abs(y) > MAX_BITMAP_SIDE ||
            ((width === 0) !== (height === 0))) fail('bitmap bounds out of range');
      } else if (line === 'BITMAP') { inBitmap = true; break; }
      else fail('unexpected glyph field');
    }
    if (!inBitmap || codePoint === undefined || advance === undefined || !box) fail('incomplete glyph');
    if (glyphs.has(codePoint)) fail('duplicate Unicode encoding');
    const [width, height, bearingX, bottom] = box;
    const byteWidth = Math.ceil(width / 8);
    const padding = byteWidth * 8 - width;
    const rows = [];
    for (let row = 0; row < height; row++) {
      line = nextLine();
      if (!line || line.length !== byteWidth * 2 || !/^[0-9A-Fa-f]+$/.test(line)) fail('invalid bitmap row');
      const packed = Number.parseInt(line, 16);
      if (packed % (2 ** padding) !== 0) fail('nonzero bitmap padding');
      rows.push(packed / (2 ** padding));
    }
    if (nextLine() !== 'ENDCHAR') fail('bitmap row count mismatch');
    if (name === '.notdef') missingGlyphCodePoint = codePoint;
    else {
      maxInkAscent = Math.max(maxInkAscent, height + bottom);
      maxInkDescent = Math.max(maxInkDescent, -bottom);
    }
    glyphs.set(codePoint, Object.freeze({ width, height, advance, bearingX,
      bearingY: height + bottom, rows: Object.freeze(rows) }));
  }
  if (nextLine() !== 'ENDFONT') fail('glyph count mismatch or missing ENDFONT');
  while ((line = nextLine()) !== undefined) if (line !== '') fail('data after ENDFONT');
  const family = quoted(properties.get('FAMILY_NAME') ?? '');
  const version = quoted(properties.get('FONT_VERSION') ?? '');
  return Object.freeze({
    family, version, pixelSize, ascent, descent, lineHeight: ascent + descent,
    maxInkAscent, maxInkDescent,
    // Includes the original .notdef record; it is retained but deliberately not renderable.
    glyphCount: glyphs.size,
    supportedGlyphCount: glyphs.size - (missingGlyphCodePoint === undefined ? 0 : 1),
    glyph(codePoint) {
      if (!scalar(codePoint) || codePoint === missingGlyphCodePoint) return undefined;
      return glyphs.get(codePoint);
    },
  });
}

async function readPinnedFont(path) {
  if (path instanceof URL && path.protocol !== 'file:') throw new Error('Fusion font path must be a local file');
  const handle = await open(path, 'r');
  let bytes;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size < 1 || stat.size > MAX_COMPRESSED_BYTES) {
      throw new Error('Fusion font must be a regular local file no larger than 2 MiB');
    }
    // A bounded read remains safe even if an external process grows the file after stat.
    const buffer = Buffer.alloc(stat.size + 1);
    let used = 0;
    while (used < buffer.length) {
      const read = await handle.read(buffer, used, buffer.length - used, null);
      if (read.bytesRead === 0) break;
      used += read.bytesRead;
    }
    if (used !== stat.size) throw new Error('Fusion font size changed while reading');
    bytes = buffer.subarray(0, used);
  } finally { await handle.close(); }
  if (sha256(bytes) !== FUSION_FONT.sha256) throw new Error('Fusion font compressed SHA-256 mismatch');
  const bdf = gunzipSync(bytes, { maxOutputLength: MAX_BDF_BYTES });
  if (sha256(bdf) !== FUSION_FONT.bdfSha256) throw new Error('Fusion font BDF SHA-256 mismatch');
  const font = parseFusionBdf(new TextDecoder('utf-8', { fatal: true }).decode(bdf));
  for (const key of ['family', 'version', 'glyphCount', 'pixelSize', 'ascent', 'descent', 'lineHeight', 'maxInkAscent', 'maxInkDescent']) {
    if (font[key] !== FUSION_FONT[key]) throw new Error(`Fusion font pinned ${key} mismatch`);
  }
  return Object.freeze({ ...font, id: FUSION_FONT.id, sha256: FUSION_FONT.sha256,
    bdfSha256: FUSION_FONT.bdfSha256 });
}

let defaultFontPromise;
/**
 * Read and verify the vendored font once. Optional path accepts a local copy of
 * the exact same pinned .bdf.gz asset, not an arbitrary font or network URL.
 * No system font fallback: unsupported characters and .notdef return undefined.
 */
export function loadFusionFont(path = DEFAULT_ASSET) {
  if (path === DEFAULT_ASSET) {
    defaultFontPromise ??= readPinnedFont(path).catch(error => { defaultFontPromise = undefined; throw error; });
    return defaultFontPromise;
  }
  return readPinnedFont(path);
}
