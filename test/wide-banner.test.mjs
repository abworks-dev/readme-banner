import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { buildWideRoom } from '../examples/pixel-game-vfx/wide-room.mjs';
import { loadFusionFont } from '../examples/pixel-game-vfx/fusion-font.mjs';
import { planLocalizedText, drawLocalizedText } from '../examples/pixel-game-vfx/localized-text.mjs';

test('wide room translates every native material and mask without resampling or source mutation', () => {
  const source = { w: 480, h: 160, data: Uint32Array.from({ length: 480 * 160 }, (_, i) => ((i << 8) | 255) >>> 0) };
  const receiver = { w: 480, h: 160, data: new Uint32Array(480 * 160).fill(0x000000ff) };
  const protectedMask = { w: 480, h: 160, data: receiver.data.slice() };
  receiver.data[124 * 480 + 330] = 0xffffffff;
  protectedMask.data[135 * 480 + 350] = 0xffffffff;
  const snapshot = source.data.slice();
  const project = { image: (name) => name === 'foundry-receivers' ? receiver : name === 'foundry-protected' ? protectedMask : source };
  for (const variant of ['dark', 'light']) {
    const room = buildWideRoom(project, variant);
    assert.deepEqual([room.image.w, room.image.h], [640, 144]);
    for (let y = 0; y < 144; y++) for (let x = 460; x < 640; x++) {
      const from = (y + 13) * 480 + x - 175, to = y * 640 + x;
      assert.equal(room.image.data[to], source.data[from]);
      assert.equal(room.receiver.data[to], receiver.data[from]);
      assert.equal(room.protectedMask.data[to], protectedMask.data[from]);
    }
    for (let y = 12; y < 130; y++) for (let x = 32; x < 436; x++) {
      assert.equal(room.receiver.data[y * 640 + x], 0x000000ff);
      assert.equal(room.protectedMask.data[y * 640 + x], 0x000000ff);
    }
  }
  assert.deepEqual(source.data, snapshot);
  assert.throws(() => buildWideRoom(project, 'other'), /variant/);
  receiver.data[135 * 480 + 350] = 0xffffffff;
  assert.throws(() => buildWideRoom(project, 'dark'), /overlap/);
});

const font = await loadFusionFont();
const fixtures = await Promise.all(['zh', 'mixed'].map(async (name) =>
  JSON.parse(await readFile(new URL(`../examples/pixel-game-vfx/text.${name}.json`, import.meta.url)))));

test('wide typography doubles native headline size and expands text share without changing content', () => {
  for (const config of fixtures) {
    const original = planLocalizedText(config, font);
    const wide = planLocalizedText(config, font, { profile: 'wide' });
    const oldTitle = original.find((v) => v.role === 'title');
    const newTitle = wide.find((v) => v.role === 'title');
    assert.equal(newTitle.layout.scale, 4);
    assert.equal(newTitle.layout.height, oldTitle.layout.height * 2);
    assert.equal(newTitle.layout.width, oldTitle.layout.width * 2);
    assert(newTitle.bounds.width / 640 > oldTitle.bounds.width / 480);
    for (const item of wide) {
      assert.equal(item.layout.text, config[item.role]);
      assert.equal(item.bounds.x, 32);
      assert(item.bounds.x + item.bounds.width <= 436);
      assert(item.bounds.y + item.bounds.height <= 130);
    }
  }
});

test('wide text draws complete glyphs strictly in quiet slots, never the native-size effect', () => {
  for (const config of fixtures) for (const variant of ['dark', 'light']) {
    const plan = planLocalizedText(config, font, { profile: 'wide' });
    const image = { w: 640, h: 144, data: new Uint32Array(640 * 144).fill(0x123456ff) };
    drawLocalizedText(image, variant, plan);
    let changed = 0;
    for (let i = 0; i < image.data.length; i++) if (image.data[i] !== 0x123456ff) {
      const x = i % image.w, y = Math.floor(i / image.w);
      assert(x >= 32 && x < 436 && y < 130);
      assert(plan.some(({ bounds: b }) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height));
      changed++;
    }
    assert(changed > 5000);
  }
});

test('wide title fit degrades only integer scale and rejects unsupported content explicitly', () => {
  const config = fixtures[0];
  const title = (value) => planLocalizedText({ ...config, title: value }, font, { profile: 'wide' })[1];
  assert.equal(title('仓'.repeat(9)).layout.scale, 3);
  assert.equal(title('仓'.repeat(12)).layout.scale, 2);
  assert.equal(title('仓库\n工坊').layout.scale, 1);
  assert.throws(() => title('😀'), /title: Missing Fusion glyph/);
  assert.throws(() => title('A'.repeat(80)), /title:/);
  assert.throws(() => planLocalizedText(config, font, { profile: 'unknown' }), /Unknown typography/);
});
