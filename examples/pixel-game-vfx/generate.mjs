// Local art-direction sample. NOT a registered CLI preset; no dependency or remote changes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstat, mkdir, open, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { safePath, missing } from '../../src/files.ts';
import { exactFrameRate } from './apng-timing.mjs';
import { loadFusionFont } from './fusion-font.mjs';
import { parseTextConfig, planLocalizedText, drawLocalizedText, textPlanReport } from './localized-text.mjs';

const here = dirname(fileURLToPath(import.meta.url)), root = resolve(here, '../..');
const { values } = parseArgs({ options: {
  check: { type: 'boolean', default: false }, 'text-config': { type: 'string' }, out: { type: 'string' },
  layout: { type: 'string', default: 'classic' },
} });
const check = values.check, localized = values['text-config'] !== undefined, wide = values.layout === 'wide';
assert(values.layout === 'classic' || wide, '--layout must be classic or wide');
assert(localized === (values.out !== undefined), '--text-config and --out must be supplied together');
assert(!wide || localized, 'Wide layout requires --text-config and --out; classic samples are preserved');
if (localized) assert(/^[a-z][a-z0-9-]{0,31}$/.test(values.out), '--out must be one safe lowercase child-directory name');
const outputDir = localized ? await safePath(here, values.out) : here;
let font, textConfig, textPlan;
if (localized) {
  const handle = await open(resolve(values['text-config']), 'r');
  let bytes;
  try {
    const stat = await handle.stat();
    assert(stat.isFile() && stat.size <= 65_536, 'Text config must be a regular JSON file of at most 64KiB');
    const buffer = Buffer.alloc(65_537);
    let used = 0;
    while (used < buffer.length) {
      const result = await handle.read(buffer, used, buffer.length - used, null);
      if (!result.bytesRead) break;
      used += result.bytesRead;
    }
    assert(used <= 65_536, 'Text config exceeds 64KiB');
    bytes = buffer.subarray(0, used);
  } finally { await handle.close(); }
  textConfig = parseTextConfig(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^\uFEFF/, '')));
  font = await loadFusionFont();
  textPlan = planLocalizedText(textConfig, font, { profile: values.layout }); // Preflight before effect sampling or writes.
}
const pins = {
  pxl: ['claude-pxl', '21fee41f7ecce00bc868d7567f24ffd0f3acc8fa'],
  pixelfx: ['pixelfx', 'a84159688af3ca37a4be05a0d422b94451b2e24e'],
  pixelbolt: ['pixelbolt', '928287703637dc9d6b646adb1f4d2963fd28f6eb'],
};
const paths = {};
for (const [name, [directory, commit]] of Object.entries(pins)) {
  const cwd = join(root, '.verification/vendor', directory);
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).trim(), commit);
  assert.equal(execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd, encoding: 'utf8' }).trim(), '', 'Vendor source must be clean');
  paths[name] = cwd;
}
const load = (name, file) => import(pathToFileURL(join(paths[name], file)).href);
const { loadProject } = await load('pxl', 'src/node/load.ts');
const { encodePng } = await load('pxl', 'src/node/png.ts');
const { encodeAPNG } = await load('pixelbolt', 'src/png.js');
const { createFrame, createFx, composite } = await load('pixelfx', 'src/core/fx.js');
const { rasterText, textWidth, FONTS } = await load('pixelfx', 'src/core/font.js');
const energy = await load('pixelfx', 'src/fx/scifi/energy-core.js');

const W = wide ? 640 : 480, H = wide ? 144 : 160, SCALE = 2, FPS = 30, N = 72, POSTER = 39;
const region = wide ? { x: 445, y: 0, w: 190, h: 144 } : { x: 255, y: 0, w: 215, h: 160 };
const origin = wide ? { x: 530, y: 106 } : { x: 355, y: 119 };
assert.equal(N / FPS, energy.meta.duration);
assert.equal(energy.meta.fps, FPS);
const project = loadProject(join(here, 'foundry.px.js'));
const pack = (r, g, b, a = 255) => ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
const hex = (s) => pack(...s.match(/[a-f\d]{2}/gi).map((v) => parseInt(v, 16)));
function rgba(img) {
  const out = new Uint8Array(img.data.length * 4);
  for (let i = 0; i < img.data.length; i++) {
    const c = img.data[i];
    out[i * 4] = c >>> 24; out[i * 4 + 1] = c >>> 16 & 255;
    out[i * 4 + 2] = c >>> 8 & 255; out[i * 4 + 3] = c & 255;
  }
  return out;
}
function enlarge(img, factor = SCALE) {
  const out = { w: img.w * factor, h: img.h * factor, data: new Uint32Array(img.w * img.h * factor * factor) };
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++)
    out.data[y * out.w + x] = img.data[Math.floor(y / factor) * img.w + Math.floor(x / factor)];
  return out;
}
function title(img, variant) {
  const text = 'README-BANNER', scale = 2, x = 27, y = 53;
  for (const ch of text) assert(FONTS.big.glyphs[ch], `Unsupported title glyph: ${ch}`);
  const tw = textWidth(text, 'big') * scale, mask = new Uint8Array(tw * 14);
  rasterText(text, 'big', (gx, gy) => {
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++)
      mask[(gy * scale + dy) * tw + gx * scale + dx] = 1;
  });
  const inside = (a, b) => a >= 0 && a < tw && b >= 0 && b < 14 && mask[b * tw + a];
  const palette = variant === 'dark'
    ? ['eaf6ff', 'd7e5ef', 'c1ccdf', '94a0c3', '556489']
    : ['344a61', '2d3f55', '243346', '18283c', '112035'];
  for (let b = 0; b < 14; b++) for (let a = 0; a < tw; a++) if (inside(a, b))
    img.data[(y + b + 2) * W + x + a + 1] = hex(variant === 'dark' ? '080b16' : '8e99a7');
  for (let b = 0; b < 14; b++) for (let a = 0; a < tw; a++) if (inside(a, b)) {
    const step = !inside(a, b - 1) ? 0 : !inside(a + 1, b) ? 4 : Math.min(3, 1 + Math.floor(b / 5));
    img.data[(y + b) * W + x + a] = hex(palette[step]);
  }
}
const rooms = wide ? Object.fromEntries(['dark', 'light'].map((variant) => [variant, null])) : undefined;
if (wide) {
  const { buildWideRoom } = await import('./wide-room.mjs');
  for (const variant of ['dark', 'light']) rooms[variant] = buildWideRoom(project, variant);
}
const receiver = wide ? rooms.dark.receiver : project.image('foundry-receivers');
const protectedMask = wide ? rooms.dark.protectedMask : project.image('foundry-protected');
if (wide) {
  assert.deepEqual(rooms.dark.receiver, rooms.light.receiver);
  assert.deepEqual(rooms.dark.protectedMask, rooms.light.protectedMask);
}
for (const image of [receiver, protectedMask]) assert(image.w === W && image.h === H);
const white = (c) => c >>> 8 === 0xffffff;
const receiverCount = receiver.data.filter(white).length;
const protectedCount = protectedMask.data.filter(white).length;
assert(receiverCount > 0 && protectedCount > 0, 'Explicit material masks are required');
for (let i = 0; i < W * H; i++) assert(!(white(receiver.data[i]) && white(protectedMask.data[i])), 'Material masks overlap');
let referenceEffectHashes;
const outputs = new Map(), posters = [], report = {
  artDirection: 'fine-pixel game-vfx / repository foundry',
  logicalSize: [W, H], outputSize: [W * SCALE, H * SCALE], fps: FPS, frames: N,
  durationMs: N * 1000 / FPS, apngFrameDelay: [1, FPS], posterSourceFrame: POSTER,
  effect: 'scifi/energy-core', effectOrigin: origin, animationRegion: region,
  effectOptions: 'unmodified upstream defaults; seed35, palette/metal original, light1',
  maskPixels: { exposedReceivers: receiverCount, protectedShadows: protectedCount },
  sources: Object.fromEntries(Object.entries(pins).map(([k, [, commit]]) => [k, commit])), variants: {},
};
if (localized) report.typography = {
  config: textConfig, font: { id: font.id, sha256: font.sha256, bdfSha256: font.bdfSha256,
    glyphCount: font.glyphCount, pixelSize: font.pixelSize, ascent: font.ascent, descent: font.descent },
  layout: textPlanReport(textPlan), textSafeRightExclusive: wide ? 436 : 236,
  ...(wide ? { profile: 'wide', textAreaFraction: 404 / W, titlePreferredScale: 4 } : {}),
};
for (const variant of ['dark', 'light']) {
  const base = wide ? rooms[variant].image : project.image(`foundry-${variant}${localized ? '-unlabeled' : ''}`);
  assert(base.w === W && base.h === H);
  let textChanges = 0;
  if (localized) {
    const room = base.data.slice();
    drawLocalizedText(base, variant, textPlan);
    for (let i = 0; i < room.length; i++) if (room[i] !== base.data[i]) {
      const x = i % W, y = Math.floor(i / W);
      assert(textPlan.some(({ bounds: b }) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height),
        'Localized typography must not alter environment outside its authored slots');
      textChanges++;
    }
    assert(textChanges > 0);
  } else title(base, variant);
  const instance = createFx(energy); // NO palette, metal, seed or light override.
  assert.deepEqual(instance.options.palette, energy.meta.options.palette);
  assert.deepEqual(instance.options.metal, energy.meta.options.metal);
  const native = [], effectHashes = [];
  let outsideChanges = 0, shadowChanges = 0, protectedBodyOverlaps = 0, reflections = 0;
  for (let k = 0; k < N; k++) {
    if (k) instance.update(1 / FPS); // Native tool's sequential clock, including its float-boundary behavior.
    const frame = createFrame(region.w, region.h, region.x - origin.x, region.y - origin.y);
    instance.draw(frame);
    effectHashes.push(createHash('sha256').update(new Uint8Array(frame.color.buffer))
      .update(new Uint8Array(frame.light.buffer)).digest('hex'));
    const background = new Uint32Array(frame.w * frame.h);
    // Genuine receiver lighting, not a whole-image brightness sweep. Only explicit exposed facets receive it.
    const corePixel = (origin.y - 36 - region.y) * frame.w + origin.x - region.x;
    // Drive reflected light from the real core's white-light green channel, not an unrelated sine loop.
    const pulse = (frame.light[corePixel] >>> 8 & 255) / 255;
    for (let y = 0; y < frame.h; y++) for (let x = 0; x < frame.w; x++)
      if (x === 0 || x === frame.w - 1 || y === 0 || y === frame.h - 1)
        assert((frame.color[y * frame.w + x] | (frame.light[y * frame.w + x] & 0xffffff)) === 0,
          'The full default effect must fit without clipping its glow');
    for (let y = 0; y < frame.h; y++) for (let x = 0; x < frame.w; x++) {
      const fi = y * frame.w + x, bi = (region.y + y) * W + region.x + x;
      let c = base.data[bi];
      if (white(protectedMask.data[bi])) {
        assert.equal(frame.color[fi], 0, 'A protected static surface must not overlap the effect body');
        frame.light[fi] = 0;
      }
      if (white(receiver.data[bi])) {
        const distance = Math.hypot((region.x + x - origin.x) / 80, (region.y + y - (origin.y + 1)) / 30);
        const a = Math.max(0, 1 - distance) * (0.08 + pulse * 0.28);
        c = pack(Math.min(255, (c >>> 24) + Math.round(a * 100)),
          Math.min(255, (c >>> 16 & 255) + Math.round(a * 20)),
          Math.min(255, (c >>> 8 & 255) + Math.round(a * 90)));
        if (c !== base.data[bi]) reflections++;
      }
      background[fi] = ((c & 255) << 24 | (c >>> 8 & 255) << 16 | (c >>> 16 & 255) << 8 | c >>> 24) >>> 0;
    }
    const bytes = new Uint8ClampedArray(frame.w * frame.h * 4);
    composite(frame, bytes, background); // Both themes composited against their actual opaque scene.
    const img = { w: W, h: H, data: base.data.slice() };
    for (let y = 0; y < frame.h; y++) for (let x = 0; x < frame.w; x++) {
      const fi = (y * frame.w + x) * 4;
      img.data[(region.y + y) * W + region.x + x] = pack(...bytes.subarray(fi, fi + 4));
    }
    for (let i = 0; i < W * H; i++) {
      const x = i % W, y = Math.floor(i / W);
      const inside = x >= region.x && x < region.x + region.w && y >= region.y && y < region.y + region.h;
      if (!inside && img.data[i] !== base.data[i]) outsideChanges++;
      if (white(protectedMask.data[i]) && img.data[i] !== base.data[i]) shadowChanges++;
    }
    native.push(img);
  }
  assert.equal(outsideChanges, 0); assert.equal(shadowChanges, 0); assert(reflections > 0);
  if (referenceEffectHashes) assert.deepEqual(effectHashes, referenceEffectHashes, 'The native VFX must not change between themes');
  else referenceEffectHashes = effectHashes;
  const ordered = Array.from({ length: N }, (_, i) => native[(i + POSTER) % N]);
  const deltas = ordered.map((img, k) => {
    const previous = ordered[(k + N - 1) % N];
    let changed = 0;
    for (let i = 0; i < img.data.length; i++) if (img.data[i] !== previous.data[i]) changed++;
    return changed;
  });
  assert(deltas.every((n) => n > 0), 'Every native frame must have visible motion');
  const nativeWrap = (N - POSTER) % N;
  const ordinaryMax = Math.max(...deltas.filter((_, i) => i !== 0 && i !== nativeWrap));
  assert(deltas[0] <= ordinaryMax * 1.05, 'Export loop has an abnormal jump');
  assert(deltas[nativeWrap] <= ordinaryMax * 1.05, 'Native loop has an abnormal jump');
  const large = ordered.map((image) => enlarge(image));
  const apng = exactFrameRate(encodeAPNG(large.map((img) => ({ data: rgba(img), duration: 33 })), W * SCALE, H * SCALE, true), FPS, N);
  outputs.set(`banner.${variant}.png`, encodePng(large[0]));
  outputs.set(`banner.${variant}.animated.png`, apng);
  outputs.set(`base.${variant}.png`, encodePng(enlarge(base)));
  posters.push(large[0]);
  report.variants[variant] = {
    ...(localized ? { typographyChangedPixels: textChanges } : {}),
    outsideRegionChanges: outsideChanges, protectedShadowChanges: shadowChanges,
    protectedBodyOverlaps, receiverBackgroundEdits: reflections,
    adjacentChangedPixels: { min: Math.min(...deltas), max: Math.max(...deltas), outputWrap: deltas[0],
      nativeWrap: deltas[nativeWrap], nativeWrapExportIndex: nativeWrap, ordinaryMax },
    posterSha256: createHash('sha256').update(rgba(large[0])).digest('hex'),
    posterRgbColors: new Set(large[0].data).size, apngBytes: apng.length,
    decodedFrameSha256: large.map((img) => createHash('sha256').update(rgba(img)).digest('hex')),
    nativeEffectSha256: effectHashes,
  };
}
const board = { w: W * SCALE, h: H * SCALE * 2 + 16,
  data: new Uint32Array(W * SCALE * (H * SCALE * 2 + 16)).fill(pack(38, 43, 56)) };
for (let n = 0; n < posters.length; n++) for (let y = 0; y < posters[n].h; y++)
  board.data.set(posters[n].data.subarray(y * board.w, (y + 1) * board.w), (y + n * (H * SCALE + 16)) * board.w);
outputs.set('comparison.png', encodePng(board));
outputs.set('receiver-mask.png', encodePng(enlarge(receiver)));
outputs.set('protected-mask.png', encodePng(enlarge(protectedMask)));
outputs.set('verification.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
// Validate every budget and existing path before the first file write.
const targets = [];
for (const [name, data] of outputs) {
  assert(data.length <= 2_000_000, `${name} exceeds 2MB sample budget`);
  const path = await safePath(here, localized ? `${values.out}/${name}` : name);
  let exists = false;
  try { assert((await lstat(path)).isFile(), `Expected regular output file: ${name}`); exists = true; }
  catch (error) { if (!missing(error)) throw error; }
  targets.push({ path, data, name, exists });
}
if (!check) await mkdir(outputDir, { recursive: true });
for (const file of targets) {
  if (check) assert.deepEqual(await readFile(file.path), file.data, `Asset drift: ${file.name}`);
  else {
    await safePath(here, localized ? `${values.out}/${file.name}` : file.name);
    await writeFile(file.path, file.data, { flag: file.exists ? 'w' : 'wx' });
  }
}
console.log(`${check ? 'Verified' : 'Generated'} ${outputs.size} high-fidelity game-vfx files`);
console.log(JSON.stringify({ fps: FPS, frames: N, durationMs: report.durationMs,
  variants: Object.fromEntries(Object.entries(report.variants).map(([name, data]) => [name, {
    outsideRegionChanges: data.outsideRegionChanges, protectedShadowChanges: data.protectedShadowChanges,
    posterRgbColors: data.posterRgbColors, apngBytes: data.apngBytes, adjacentChangedPixels: data.adjacentChangedPixels,
  }])) }, null, 2));
