// Standalone font verification, deliberately separate from renderer/layout tests.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { FUSION_FONT, loadFusionFont, parseFusionBdf } from '../fusion-font.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('Font verification must stay offline'); };
try {
  const manifest = JSON.parse(await readFile(new URL('./manifest.json', import.meta.url), 'utf8'));
  const bytes = await readFile(new URL(FUSION_FONT.filename, import.meta.url));
  const bdf = gunzipSync(bytes).toString('utf8');
  assert.equal(bytes.length, manifest.asset.bytes);
  assert.equal(sha256(bytes), manifest.asset.sha256);
  assert.equal(sha256(Buffer.from(bdf)), manifest.source.bdfSha256);
  for (const notice of manifest.notices) {
    const noticeBytes = await readFile(new URL(notice.filename, import.meta.url));
    assert.equal(noticeBytes.length, notice.bytes);
    assert.equal(sha256(noticeBytes), notice.sha256);
    assert.match(noticeBytes.toString('utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
  }
  const promise = loadFusionFont();
  assert.equal(promise, loadFusionFont(), 'Default load must share one pending/cached Promise');
  const font = await promise;
  assert.equal(font, await loadFusionFont());
  assert.equal(font.glyphCount, 37857);
  assert.equal(font.supportedGlyphCount, 37856);
  assert.equal(font.pixelSize, 12);
  assert.equal(font.ascent, 10);
  assert.equal(font.descent, 2);
  assert.equal(font.lineHeight, 12);
  assert(Object.isFrozen(font));
  assert(Object.isFrozen(FUSION_FONT));
  assert(Object.isFrozen(font.glyph(65)));
  assert(Object.isFrozen(font.glyph(65).rows));
  assert.throws(() => { font.glyph(65).rows[0] = 0; }, TypeError);
  assert.equal(font.glyph(65).advance, 6);
  assert.equal(font.glyph(0x4f60).advance, 12);
  assert.deepEqual(font.glyph(65).rows, [4, 4, 10, 10, 14, 17, 17, 17]);
  assert.equal(font.glyph(0x67).bearingY, 6, 'Descender baseline must be retained');
  assert.deepEqual(font.glyph(32), { width: 0, height: 0, advance: 6, bearingX: 0, bearingY: 0, rows: [] });
  for (const codePoint of [-1, 0xd800, 0xdfff, 0x110000, 1.1, NaN, 'A', 0xfffe, 0x1f600, 0x1f680]) {
    assert.equal(font.glyph(codePoint), undefined, `Unexpected supported input: ${codePoint}`);
  }
  const coverage = { ascii: 0, cjkUnified: 0, cjkExtensionA: 0, supplementary: 0, total: 0 };
  const oversizedGlyphs = [];
  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint++) {
    const glyph = font.glyph(codePoint);
    if (!glyph) continue;
    coverage.total++;
    if (codePoint >= 0x20 && codePoint <= 0x7e) coverage.ascii++;
    if (codePoint >= 0x4e00 && codePoint <= 0x9fff) coverage.cjkUnified++;
    if (codePoint >= 0x3400 && codePoint <= 0x4dbf) coverage.cjkExtensionA++;
    if (codePoint > 0xffff) coverage.supplementary++;
    assert.equal(glyph.rows.length, glyph.height);
    assert(glyph.bearingY <= font.maxInkAscent);
    assert(glyph.height - glyph.bearingY <= font.maxInkDescent);
    if (glyph.bearingY > font.ascent || glyph.height - glyph.bearingY > font.descent) {
      oversizedGlyphs.push(`U+${codePoint.toString(16).toUpperCase()}`);
    }
    for (const row of glyph.rows) assert(Number.isInteger(row) && row >= 0 && row < 2 ** glyph.width);
  }
  assert.equal(font.maxInkAscent, 15);
  assert.equal(font.maxInkDescent, 7);
  assert.deepEqual(oversizedGlyphs, ['U+3031', 'U+3032']);
  assert.equal(coverage.total, font.supportedGlyphCount);
  assert.equal(coverage.ascii, 95);
  assert.equal(coverage.cjkUnified, 19466);
  assert.equal(coverage.cjkExtensionA, 1777);
  assert(coverage.cjkUnified + coverage.cjkExtensionA > 20_000,
    'Must contain broad Chinese coverage, not a sample subset');
  const samples = ['你好，像素世界！', '你好 Pixel 世界 2026!', '开源项目 Readme Banner', '中文 English 混合排版'];
  const metrics = samples.map(text => {
    let advance = 0;
    let top = 0;
    let bottom = 0;
    for (const character of text) {
      const glyph = font.glyph(character.codePointAt(0));
      assert(glyph, `Missing sample character: ${character}`);
      advance += glyph.advance;
      top = Math.max(top, glyph.bearingY);
      bottom = Math.max(bottom, glyph.height - glyph.bearingY);
    }
    return { text, glyphs: Array.from(text).length, advance, top, bottom, nativeLineHeight: font.lineHeight };
  });
  const rejects = [
    [bdf.replace('CHARS 37857', 'CHARS 1'), /glyph count mismatch/],
    [bdf.replace('ENCODING 33', 'ENCODING 32'), /duplicate Unicode encoding/],
    [bdf.replace('ENCODING 65534', 'ENCODING 55296'), /invalid Unicode scalar/],
    [bdf.replace('DWIDTH 12 0', 'DWIDTH -1 0'), /unsupported advance/],
    [bdf.replace('BBX 12 12 0 -2', 'BBX 33 12 0 -2'), /bitmap bounds out of range/],
    [bdf.replace('FFF0', 'ZZZ0'), /invalid bitmap row/],
    [bdf.replace('FFF0', 'FFF1'), /nonzero bitmap padding/],
    [bdf.replace('FONT_DESCENT 2', 'FONT_ASCENT 2'), /duplicate property/],
    [bdf.slice(0, -64), /Invalid Fusion BDF/],
    [bdf + 'not a font\n', /data after ENDFONT/],
    ['A'.repeat(8 * 1024 * 1024 + 1), /8 MiB text limit/],
  ];
  for (const [source, expected] of rejects) assert.throws(() => parseFusionBdf(source), expected);
  await assert.rejects(loadFusionFont(new URL('./manifest.json', import.meta.url)), /SHA-256 mismatch/);
  await assert.rejects(loadFusionFont(new URL('https://example.com/font.bdf.gz')), /local file/);
  console.log(JSON.stringify({ ok: true, id: font.id, sha256: font.sha256,
    bytes: bytes.length, glyphCount: font.glyphCount, supportedGlyphCount: font.supportedGlyphCount,
    ascent: font.ascent, descent: font.descent, lineHeight: font.lineHeight,
    licenseNotices: manifest.notices.length, malformedCasesRejected: rejects.length,
    coverage, oversizedGlyphs, metrics, offline: true }, null, 2));
} finally { globalThis.fetch = originalFetch; }
