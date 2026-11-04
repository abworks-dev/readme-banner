import assert from 'node:assert/strict';
import { namespaced, wrap } from 'ascii.rest/svg';

/** Map an explicitly authored PNG face mask onto ascii.rest@0.4.0's image grid.
 * No semantic guessing: only full cells inside the white face region are enabled.
 * The 24x48 sampling cell and 2-column/1-row margins mirror the pinned converter;
 * alignment tests must be rerun before upgrading ascii.rest.
 */
export function buildFrontMask(image, mask, cols, rows) {
  assert.equal(mask.width, image.width, 'Face mask and source widths differ');
  assert.equal(mask.height, image.height, 'Face mask and source heights differ');
  let x0 = image.width, y0 = image.height, x1 = -1, y1 = -1;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    if (image.data[(y * image.width + x) * 4 + 3] > 1) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y);
      x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  assert.ok(x1 >= x0 && y1 >= y0, 'Source image is empty');
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const iw = (cols - 4) * 24, ih = (rows - 2) * 48;
  const k = Math.min(iw / w, ih / h);
  const dw = Math.max(1, Math.round(w * k)), dh = Math.max(1, Math.round(h * k));
  const ox = 48 + Math.floor((iw - dw) / 2), oy = 48 + Math.floor((ih - dh) / 2);
  const inside = (x, y) => {
    if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) return false;
    const i = (y * mask.width + x) * 4;
    return mask.data[i + 3] >= 250 && mask.data[i] >= 250 && mask.data[i + 1] >= 250 && mask.data[i + 2] >= 250;
  };
  const cells = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => {
    // Round outwards and demand EVERY covered pixel is white: holes, boundaries,
    // bevels, dark side faces and cast shadow are conservatively excluded.
    const left = Math.floor(x0 + (x * 24 - ox) * w / dw);
    const right = Math.ceil(x0 + ((x + 1) * 24 - ox) * w / dw);
    const top = Math.floor(y0 + (y * 48 - oy) * h / dh);
    const bottom = Math.ceil(y0 + ((y + 1) * 48 - oy) * h / dh);
    for (let sy = top; sy <= bottom; sy++) for (let sx = left; sx <= right; sx++) {
      if (!inside(sx, sy)) return ' ';
    }
    return '#';
  }).join(''));
  assert.ok(cells.some((line) => line.includes('#')), 'No full front-face cells survive the mask');
  return cells;
}

export function maskRectangles(mask) {
  const cols = mask[0]?.length;
  assert.ok(cols && mask.every((row) => row.length === cols && /^[ #]+$/.test(row)), 'Invalid cell mask');
  return mask.flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) =>
    `<rect x="${run.index * 10}" y="${y * 20}" width="${run[0].length * 10}" height="20"/>`)).join('');
}

/** Static full artwork + independently animated copy clipped to the face only.
 * Use only trusted SVGs just produced by the official exporter, never user SVG.
 */
export function composeMaskedArt(stillSvg, movingSvg, mask, label) {
  const still = namespaced(stillSvg, 'base');
  const moving = namespaced(movingSvg, 'shine');
  assert.ok(still && moving, 'Expected official SVG exports');
  assert.equal(still.width, moving.width);
  assert.equal(still.height, moving.height);
  assert.equal(mask[0].length * 10, still.width);
  assert.equal(mask.length * 20, still.height);
  const defs = `<defs><clipPath id="logo-front-only" clipPathUnits="userSpaceOnUse">${maskRectangles(mask)}</clipPath></defs>`;
  return wrap({ width: still.width, height: still.height,
    css: still.css + moving.css + '@media (prefers-reduced-motion:reduce){.front-sweep{display:none}}',
    body: defs + `<g data-layer="static-base">${still.body}</g>` +
      `<g class="front-sweep" data-layer="front-glint" clip-path="url(#logo-front-only)">${moving.body}</g>`,
  }, label, 8);
}
