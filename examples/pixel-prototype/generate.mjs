// Local research prototype, NOT a registered CLI preset. Uses pinned source checkouts.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const check = process.argv.slice(2).includes('--check');
assert(process.argv.slice(2).every((a) => a === '--check'), 'Only --check is supported');
const pins = {
  pxl: { directory: 'claude-pxl', commit: '21fee41f7ecce00bc868d7567f24ffd0f3acc8fa' },
  pixelfx: { directory: 'pixelfx', commit: 'a84159688af3ca37a4be05a0d422b94451b2e24e' },
  pixelbolt: { directory: 'pixelbolt', commit: '928287703637dc9d6b646adb1f4d2963fd28f6eb' },
};
for (const item of Object.values(pins)) {
  item.path = join(root, '.verification/vendor', item.directory);
  assert.equal(execFileSync('git', ['-C', item.path, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), item.commit,
    `Wrong source revision: ${item.directory}`);
  assert.equal(execFileSync('git', ['-C', item.path, 'status', '--porcelain', '--untracked-files=all'],
    { encoding: 'utf8' }).trim(), '', `Source checkout must be clean: ${item.directory}`);
}
const load = (base, file) => import(pathToFileURL(join(base.path, file)).href);
const { loadProject } = await load(pins.pxl, 'src/node/load.ts');
const { encodePng } = await load(pins.pxl, 'src/node/png.ts');
const { encodeGif } = await load(pins.pxl, 'src/node/gif.ts');
const { createFrame, createFx, composite } = await load(pins.pixelfx, 'src/core/fx.js');
const energyCore = await load(pins.pixelfx, 'src/fx/scifi/energy-core.js');
const { encodeAPNG } = await load(pins.pixelbolt, 'src/png.js');

const W = 480, H = 160, SCALE = 2, FRAME_COUNT = 30, FRAME_MS = 80;
assert.equal(FRAME_COUNT * FRAME_MS, energyCore.meta.duration * 1000, 'Export must cover exactly one effect loop');
const region = { x: 324, y: 19, w: 128, h: 116 };
const project = loadProject(join(here, 'workshop.px.js'));
const report = { logicalSize: [W, H], exportSize: [W * SCALE, H * SCALE],
  fps: 1000 / FRAME_MS, frameCount: FRAME_COUNT, durationMs: FRAME_COUNT * FRAME_MS,
  effect: 'scifi/energy-core', seed: 35, region, sources: Object.fromEntries(
    Object.entries(pins).map(([name, value]) => [name, value.commit])), variants: {} };
const outputs = new Map();
const packed = (r, g, b, a = 255) => ((r << 24) | (g << 16) | (b << 8) | a) >>> 0;
const rgba = (img) => {
  const data = new Uint8Array(img.data.length * 4);
  img.data.forEach((c, i) => { data[i * 4] = c >>> 24; data[i * 4 + 1] = c >>> 16;
    data[i * 4 + 2] = c >>> 8; data[i * 4 + 3] = c & 255; });
  return data;
};
function upscale(img, factor = SCALE) {
  const result = { w: img.w * factor, h: img.h * factor, data: new Uint32Array(img.w * img.h * factor * factor) };
  for (let y = 0; y < result.h; y++) for (let x = 0; x < result.w; x++)
    result.data[y * result.w + x] = img.data[Math.floor(y / factor) * img.w + Math.floor(x / factor)];
  return result;
}
const stills = [];
for (const variant of ['dark', 'light']) {
  const base = project.image(`workshop-${variant}`);
  assert.equal(base.w, W); assert.equal(base.h, H);
  const background = new Uint32Array(region.w * region.h);
  for (let y = 0; y < region.h; y++) for (let x = 0; x < region.w; x++) {
    const c = base.data[(region.y + y) * W + region.x + x];
    // pxl packs RRGGBBAA; pixelfx packs AABBGGRR. Convert explicitly.
    background[y * region.w + x] = ((c & 255) << 24 | (c >>> 8 & 255) << 16 |
      (c >>> 16 & 255) << 8 | c >>> 24) >>> 0;
  }
  const options = {
    seed: 35, light: variant === 'dark' ? 0.6 : 0.35,
    palette: variant === 'dark'
      ? ['#072b36', '#0c4850', '#146c6f', '#21a399', '#45d3b6', '#8ef3d9', '#d4fff3', '#ffffff']
      : ['#122e40', '#1d4858', '#1b6570', '#1b857e', '#2ba08e', '#69c4ad', '#b4e3ca', '#f3fff1'],
    metal: variant === 'dark'
      ? ['#111824', '#263249', '#3f4c65', '#61738c', '#92a7bc', '#c4d8e6']
      : ['#263744', '#405463', '#617784', '#8ca3aa', '#b8c8c9', '#e1e7dc'],
  };
  function sample(instance) {
    // Frame offsets are WORLD TOP-LEFT, not the local effect origin.
    const frame = createFrame(region.w, region.h, -64, -102);
    instance.draw(frame);
    const pixels = new Uint8ClampedArray(region.w * region.h * 4);
    // Additive light is resolved against THIS theme's actual stage, never transparency.
    composite(frame, pixels, background);
    const img = { w: W, h: H, data: base.data.slice() };
    for (let y = 0; y < region.h; y++) for (let x = 0; x < region.w; x++) {
      const i = (y * region.w + x) * 4;
      img.data[(region.y + y) * W + region.x + x] = packed(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
    return img;
  }
  const instance = createFx(energyCore, options);
  const frames = [];
  let outsideChanges = 0, animatedCells = 0;
  for (let k = 0; k < FRAME_COUNT; k++) {
    if (k) instance.update(FRAME_MS / 1000);
    const img = sample(instance);
    for (let i = 0; i < img.data.length; i++) {
      const x = i % W, y = Math.floor(i / W);
      const inside = x >= region.x && x < region.x + region.w && y >= region.y && y < region.y + region.h;
      if (!inside && img.data[i] !== base.data[i]) outsideChanges++;
      if (k && img.data[i] !== frames[0].data[i]) animatedCells++;
    }
    frames.push(img);
  }
  assert.equal(outsideChanges, 0, 'Text, paper and shadows must remain fixed outside the explicit VFX stage');
  assert(animatedCells > 0, 'The effect must really animate');
  const loopInstance = createFx(energyCore, options);
  loopInstance.update(energyCore.meta.duration);
  assert.deepEqual(sample(loopInstance).data, frames[0].data, 'Frame at loop duration must equal frame zero');
  const large = frames.map((img) => upscale(img));
  const png = encodePng(large[0]);
  const apng = encodeAPNG(large.map((img) => ({ data: rgba(img), duration: FRAME_MS })), W * SCALE, H * SCALE, true);
  // pxl uses ONE global palette over all frames, avoiding per-frame palette flicker.
  const gif = encodeGif(large.map((img) => ({ img, ms: FRAME_MS })));
  outputs.set(`banner.${variant}.png`, png);
  outputs.set(`banner.${variant}.animated.png`, apng);
  outputs.set(`banner.${variant}.gif`, gif);
  stills.push(large[0]);
  report.variants[variant] = { outsideChanges, animatedCellComparisons: animatedCells,
    pngBytes: png.length, apngBytes: apng.length, gifBytes: gif.length,
    frameHash: createHash('sha256').update(rgba(frames[0])).digest('hex') };
}
const comparison = { w: W * SCALE, h: H * SCALE * 2 + 16,
  data: new Uint32Array(W * SCALE * (H * SCALE * 2 + 16)).fill(packed(35, 45, 57)) };
for (let n = 0; n < stills.length; n++) for (let y = 0; y < stills[n].h; y++)
  comparison.data.set(stills[n].data.subarray(y * comparison.w, (y + 1) * comparison.w),
    (y + n * (H * SCALE + 16)) * comparison.w);
outputs.set('comparison.png', encodePng(comparison));
outputs.set('verification.json', Buffer.from(JSON.stringify(report, null, 2) + '\n'));
if (!check) await mkdir(here, { recursive: true });
for (const [name, data] of outputs) {
  assert(data.length <= 2_000_000, `${name} exceeds the prototype's 2 MB budget`);
  const file = join(here, name);
  if (check) assert.deepEqual(await readFile(file), data, `Asset drift: ${name}`);
  else await writeFile(file, data);
}
console.log(`${check ? 'Verified' : 'Generated'} ${outputs.size} files: pxl scene + pixelfx VFX + Pixelbolt APNG`);
console.log(JSON.stringify(report, null, 2));
