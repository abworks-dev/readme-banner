import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { loadFusionFont, FUSION_FONT } from '../examples/pixel-game-vfx/fusion-font.mjs';
import { measureText, layoutText, rasterizeText } from '../examples/pixel-game-vfx/pixel-text.mjs';
import { parseTextConfig, planLocalizedText, drawLocalizedText } from '../examples/pixel-game-vfx/localized-text.mjs';

const font = await loadFusionFont();
const sample = (title) => ({ schemaVersion: 1, label: '中英 PIXEL', title, tagline: '为每个仓库打造门面。' });

test('complete pinned Fusion face is offline, immutable and never substitutes tofu', async () => {
  assert.equal(await loadFusionFont(), font);
  assert.equal(font.id, FUSION_FONT.id);
  assert.equal(font.glyphCount, 37857);
  assert.equal(font.supportedGlyphCount, 37856);
  assert.deepEqual([font.pixelSize, font.ascent, font.descent, font.lineHeight], [12, 10, 2, 12]);
  assert(Object.isFrozen(font) && Object.isFrozen(font.glyph(0x4f60).rows));
  for (const cp of [0x1f600, 0xfffe, 0xd800, 0x110000]) assert.equal(font.glyph(cp), undefined);
  for (let cp = 32; cp <= 126; cp++) assert(font.glyph(cp));
});

test('real Latin/Han DWIDTH and shared baseline survive exact binary integer rasterization', () => {
  assert.equal(font.glyph(65).advance, 6);
  assert.equal(font.glyph(0x4f60).advance, 12);
  assert.equal(measureText('你好 Pixel 世界 2026!', font), 126);
  assert.equal(measureText('仓库横幅工坊', font, 2), 144);
  assert.equal(measureText('README 横幅工坊', font, 2), 180);
  const one = rasterizeText(layoutText('你好 Ag，', font, { maxWidth: 200 }), font);
  const two = rasterizeText(layoutText('你好 Ag，', font, { maxWidth: 400, scale: 2 }), font);
  assert.equal(two.width, one.width * 2); assert.equal(two.height, one.height * 2);
  for (let y = 0; y < two.height; y++) for (let x = 0; x < two.width; x++)
    assert.equal(two.data[y * two.width + x], one.data[Math.floor(y / 2) * one.width + Math.floor(x / 2)]);
});

test('CJK punctuation cannot start/end prohibited lines, including mandatory newlines', () => {
  const a = layoutText('你好，世界', font, { maxWidth: 36, maxLines: 2 });
  assert.deepEqual(a.lines.map((l) => l.text), ['你好，', '世界']);
  for (const text of ['你好（世界）', '你《好世》界', '中……文——混排']) {
    const p = layoutText(text, font, { maxWidth: 48, maxLines: 4 });
    for (const line of p.lines) {
      assert(!/^[），。》…]/.test(line.text)); assert(!/[（《]$/.test(line.text));
    }
  }
  for (const text of ['你\n。好', '《\n你好'])
    assert.throws(() => layoutText(text, font, { maxWidth: 200, maxLines: 2 }), /Explicit newline/);
});

test('Latin words, connectors, NBSP and ellipsis/dash pairs are atomic at soft wraps', () => {
  const wrap = (text, width) => layoutText(text, font, { maxWidth: width, maxLines: 5 }).lines.map((l) => l.text);
  assert.deepEqual(wrap('AB CDEF-GH', 42), ['AB', 'CDEF-GH']);
  assert.deepEqual(wrap("AB CDEF'GH", 42), ['AB', "CDEF'GH"]);
  assert.throws(() => wrap('AB\u00a0CD', 18), /Unbreakable/);
  assert.deepEqual(wrap('AB——CD', 24), ['AB', '——', 'CD']);
  assert.throws(() => wrap('A'.repeat(36), 209), /Unbreakable/);
});

test('CRLF and NFC normalize deterministically; unsupported sequences fail explicitly', () => {
  assert.deepEqual(layoutText('档案\r\n工坊', font, { maxWidth: 100, maxLines: 2, lineGap: 2 }),
    layoutText('档案\n工坊', font, { maxWidth: 100, maxLines: 2, lineGap: 2 }));
  assert.deepEqual(layoutText('e\u0301', font, { maxWidth: 100 }), layoutText('é', font, { maxWidth: 100 }));
  for (const value of ['👩‍💻', 'A\ufe0f', 'x\u0308\u0301', '\t', '\ud800', '😀', 'A'.repeat(513)])
    assert.throws(() => layoutText(value, font, { maxWidth: 200 }), /sequence|control|Missing Fusion glyph|limit/i);
  assert.throws(() => layoutText('档案\n\n工坊', font, { maxWidth: 100, maxLines: 2 }), /3 lines/);
  assert.throws(() => layoutText('    ', font, { maxWidth: 100 }), /blank/);
});

test('real oversized glyph ink grows leading instead of clipping or overlapping lines', () => {
  const p = layoutText('\u3031\n你', font, { maxWidth: 100, maxLines: 2, lineGap: 2 });
  assert(p.ascent >= 15 && p.descent >= 7 && p.lineHeight >= 24);
  assert.equal(p.lines[1].baseline - p.lines[0].baseline, p.lineHeight);
  assert(rasterizeText(p, font).data.some((v) => v));
  assert.equal(planLocalizedText(sample('\u3031'), font)[1].layout.scale, 1);
});

test('headline auto-fit respects fixed art slots; invalid fields fail before drawing', () => {
  assert.equal(planLocalizedText(sample('仓库横幅工坊'), font)[1].layout.scale, 2);
  assert.equal(planLocalizedText(sample('仓'.repeat(8)), font)[1].layout.scale, 2);
  assert.equal(planLocalizedText(sample('仓'.repeat(9)), font)[1].layout.scale, 1);
  const forced = planLocalizedText(sample('档案\n工坊'), font)[1];
  assert.equal(forced.layout.scale, 1); assert.equal(forced.layout.lineHeight, 14);
  assert.throws(() => planLocalizedText(sample('档案\n\n工坊'), font), /title:.*3 lines/);
  assert.throws(() => planLocalizedText({ ...sample('工坊'), label: '仓'.repeat(18) }, font), /label:/);
  assert.throws(() => planLocalizedText(sample('😀'), font), /title: Missing Fusion glyph U\+1F600/);
  assert.throws(() => parseTextConfig({ ...sample('工坊'), script: 'no' }), /Unknown/);
  assert.throws(() => parseTextConfig({ ...sample('工坊'), title: '' }), /nonblank/);
});

test('both authored fixtures paint only declared text slots, with no geometry clearing', async () => {
  for (const name of ['zh', 'mixed']) {
    const config = JSON.parse(await readFile(new URL(`../examples/pixel-game-vfx/text.${name}.json`, import.meta.url)));
    const plan = planLocalizedText(config, font);
    for (const variant of ['dark', 'light']) {
      const img = { w: 480, h: 160, data: new Uint32Array(480 * 160).fill(0x123456ff) };
      drawLocalizedText(img, variant, plan);
      let count = 0;
      for (let i = 0; i < img.data.length; i++) if (img.data[i] !== 0x123456ff) {
        const x = i % img.w, y = Math.floor(i / img.w); count++;
        assert(plan.some(({ bounds: b }) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height));
        assert(x < 236);
      }
      assert(count > 300);
    }
  }
});

test('negative bearings and right overhang retain complete ink and original advances', () => {
  const g = { width: 7, height: 1, advance: 6, bearingX: -1, bearingY: 1, rows: [127] };
  const stub = { ascent: 1, descent: 0, lineHeight: 1, glyph: () => g };
  const p = layoutText('A', stub, { maxWidth: 7 });
  assert.deepEqual([p.width, p.lines[0].advance, p.lines[0].offsetX], [7, 6, 1]);
  assert.deepEqual([...rasterizeText(p, stub).data], [1, 1, 1, 1, 1, 1, 1]);
  assert.throws(() => layoutText('A', stub, { maxWidth: 6 }), /Unbreakable/);
});
