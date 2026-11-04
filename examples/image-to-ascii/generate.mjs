#!/usr/bin/env node
/** Official image converter + explicit, authored front-face animation mask. */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { fromImage, fromDrawing, readPng } from 'ascii.rest/kit';
import { svg, bannerSvg } from 'ascii.rest/svg';
import { buildFrontMask, composeMaskedArt } from './front-mask.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const { values } = parseArgs({ options: {
  input: { type: 'string' }, mask: { type: 'string' }, out: { type: 'string' },
  style: { type: 'string', default: 'logo' }, check: { type: 'boolean', default: false },
} });
assert.ok(['logo', 'shade'].includes(values.style), '--style must be logo or shade');
const input = resolve(values.input ?? resolve(here, 'project-visual.original.png'));
// Never reuse our logo's mask for a different input. Custom images without a mask stay static.
const maskPath = values.mask ? resolve(values.mask) : values.input ? null : resolve(here, 'project-visual.front-mask.png');
const out = resolve(values.out ?? here);
const bytes = await readFile(input);
assert.ok(bytes.byteLength <= 40_000_000, 'Use a PNG smaller than 40 MB');
const piece = await fromImage(bytes, {
  name: 'folded-signal-badge', note: 'a ribbon badge with front-only glint',
  width: 104, height: 64, style: values.style,
  background: maskPath ? 'keep' : 'remove', color: true, glint: false,
});
assert.equal(piece.meta.fps, 0, 'Base artwork, extrusion and shadow must stay static');
assert.ok(piece.drawing.art.some((row) => row.trim()), 'The image contains no visible artwork');
let mask = null, moving = null;
if (maskPath) {
  const maskBytes = await readFile(maskPath);
  assert.ok(maskBytes.byteLength <= 40_000_000, 'Use a mask PNG smaller than 40 MB');
  mask = buildFrontMask(await readPng(bytes), await readPng(maskBytes), piece.meta.cols, piece.meta.rows);
  // SAME drawing and SAME grid: do not convert the mask as an independently cropped image.
  moving = fromDrawing(piece.drawing, { name: 'front-sweep', glint: { every: 6 } });
}
const output = new Map();
for (const dark of [false, true]) {
  const variant = dark ? 'dark' : 'light';
  const still = svg(piece, { dark, scale: 8, label: 'Static badge, sides and shadow', budget: false });
  const art = mask ? composeMaskedArt(still,
    svg(moving, { dark, fps: 10, scale: 8, label: 'Front-face sweep source', budget: false }), mask,
    'Folded signal badge in ASCII. Glint is clipped to its front; sides and shadow are static.') : still;
  output.set(`project-art.${variant}.svg`, art + '\n');
  const banner = bannerSvg('readme-banner', {
    font: 'slim', shadow: 'single', effect: 'still',
    color: dark ? ['#2dd4bf', '#818cf8'] : ['#0f766e', '#4338ca'],
    tagline: 'One config. Every repository.', taglineColor: dark ? '#cbd5e1' : '#475569',
    art: { svg: art }, artSize: 2.1, place: 'left', spacing: 32,
    background: dark ? '#0b1220' : '#f8fafc', padding: 28, radius: 16,
    fps: 8, scale: 5,
    label: 'readme-banner. Folded signal logo with front-only glint. Static sides and shadow.',
  });
  // bannerSvg(effect:still) targets its own standard frames, not our independently named face sweep.
  output.set(`project-banner.${variant}.svg`, banner + '\n');
}
output.set('project-art.ascii.txt', piece.drawing.art.join('\n') + '\n');
if (mask) output.set('project-art.front-mask.txt', mask.join('\n') + '\n');
for (const [name, content] of output) {
  if (name.endsWith('.svg')) {
    assert.ok(Buffer.byteLength(content) <= 2_000_000, `${name} exceeds the 2 MB example budget`);
    assert.ok(content.startsWith('<svg'), `${name} is not an SVG`);
    assert.ok(!/<script\b|<foreignObject\b|<(?:image|use)\b[^>]*(?:href|xlink:href)\s*=\s*["'](?:https?:|data:)/i.test(content), `${name} has unwanted active/external content`);
  }
}
if (!values.check) await mkdir(out, { recursive: true });
for (const [name, content] of output) {
  const path = resolve(out, name);
  if (values.check) assert.equal(await readFile(path, 'utf8'), content, `Drift in ${name}`);
  else await writeFile(path, content, 'utf8');
  console.log(`${values.check ? 'Verified' : 'Wrote'} ${name}: ${Buffer.byteLength(content)} bytes`);
}
console.log(`Official ascii.rest: ${piece.meta.cols} x ${piece.meta.rows}; ${values.style}; ` +
  (mask ? 'explicit front-face mask; only the logo front glints.' : 'custom image without mask: static artwork.'));
