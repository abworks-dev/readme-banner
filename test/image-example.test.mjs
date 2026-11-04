import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fromImage, fromDrawing, readPng } from 'ascii.rest/kit';
import { svg, namespaced } from 'ascii.rest/svg';
import { buildFrontMask, maskRectangles } from '../examples/image-to-ascii/front-mask.mjs';

const example = new URL('../examples/image-to-ascii/', import.meta.url);
const load = (name) => readFile(new URL(name, example));
async function scene() {
  const png = await load('project-visual.original.png');
  const image = await fromImage(png, { width: 104, height: 64, style: 'logo', background: 'keep', color: true, glint: false });
  const mask = buildFrontMask(await readPng(png), await readPng(await load('project-visual.front-mask.png')), image.meta.cols, image.meta.rows);
  return { image, mask };
}

test('front-only animation is clipped above a byte-identical static base, including in banners', async () => {
  const { image, mask } = await scene();
  assert.equal((await load('project-art.front-mask.txt')).toString(), mask.join('\n') + '\n');
  const face = mask.join('').replaceAll(' ', '').length;
  assert.ok(face > 50 && face < image.meta.cols * image.meta.rows * 0.8);
  for (const variant of ['light', 'dark']) {
    const art = (await load(`project-art.${variant}.svg`)).toString();
    const banner = (await load(`project-banner.${variant}.svg`)).toString();
    const base = namespaced(svg(image, { dark: variant === 'dark', budget: false }), 'base');
    assert.ok(art.includes(`<g data-layer="static-base">${base.body}</g>`));
    for (const output of [art, banner]) {
      assert.ok(output.includes(`<clipPath id="logo-front-only" clipPathUnits="userSpaceOnUse">${maskRectangles(mask)}</clipPath>`));
      assert.match(output, /data-layer="front-glint" clip-path="url\(#logo-front-only\)"/);
      assert.match(output, /@keyframes shinek/);
      assert.match(output, /prefers-reduced-motion:reduce\)\{\.front-sweep\{display:none\}/);
      assert.doesNotMatch(output, /<script\b|<foreignObject\b|<image\b|<animate\b/);
      assert.ok(Buffer.byteLength(output) < 2_000_000);
    }
  }
});

test('glint changes front cells while shadow/side cells retain the original glyph and colour', async () => {
  const { image, mask } = await scene();
  const moving = fromDrawing(image.drawing, { glint: { every: 6 } });
  const stillFrame = image.default(), movingFrame = moving.default();
  for (const paper of [false, true]) {
    const take = (frame, t) => {
      const color = new Uint8Array(image.meta.cols * image.meta.rows);
      return { text: frame(t, { paper, color }).replaceAll('\n', ''), color };
    };
    const baseline = take(stillFrame, 0);
    let changed = 0, protectedInk = 0;
    for (const t of [0, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 4, 6.75]) {
      const next = take(movingFrame, t);
      for (let i = 0; i < baseline.color.length; i++) {
        const enabled = mask[Math.floor(i / image.meta.cols)][i % image.meta.cols] === '#';
        // The SVG clip exactly implements this layer choice; base is never replaced outside it.
        const glyph = enabled ? next.text[i] : baseline.text[i];
        const color = enabled ? next.color[i] : baseline.color[i];
        if (enabled && (glyph !== baseline.text[i] || color !== baseline.color[i])) changed++;
        if (!enabled) {
          assert.equal(glyph, baseline.text[i]); assert.equal(color, baseline.color[i]);
          if (glyph !== ' ') protectedInk++;
        }
      }
    }
    assert.ok(changed > 40, 'The front sweep must actually move');
    assert.ok(protectedInk > 40, 'There must be protected side/shadow artwork, not just empty cells');
  }
});

test('mask validation rejects mismatched canvases and does not include non-white pixels', () => {
  const data = new Uint8ClampedArray(20 * 20 * 4).fill(255);
  const source = { width: 20, height: 20, data };
  assert.throws(() => buildFrontMask(source, { ...source, width: 21 }, 12, 6), /widths differ/);
  assert.throws(() => buildFrontMask(source, { ...source, data: new Uint8ClampedArray(data.length) }, 12, 6), /No full front-face/);
  assert.throws(() => maskRectangles(['##', '#']), /Invalid cell mask/);
  assert.throws(() => maskRectangles(['X']), /Invalid cell mask/);
});
