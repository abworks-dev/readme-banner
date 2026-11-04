// A native 640x144 room: typography owns the quiet wall, the foundry is a right accent.
// No resampling, asset writes, glyphs, gradients, random texture or UI furniture.
// Authored transform: (oldX, oldY) -> (oldX + 175, oldY - 13), oldX >= 285.
// Visible source crop: x285..464 / y13..156 -> x460..639 / y0..143, inclusive.
// Energy origin: (355,119) -> (530,106); effect support x481..578 / y21..121.
// Keep x32..435 / y12..129 inclusive completely free of objects and both masks.

const W = 640, H = 144, DX = 175, DY = -13, SOURCE_LEFT = 285;
const BLACK = 0x000000ff, WHITE = 0xffffffff;
const themes = {
  dark: {
    air: [0x0d121cff, 0x101722ff, 0x121b27ff, 0x16212cff],
    wall: [0x101722ff, 0x17212cff, 0x1c2935ff],
    steel: [0x0b121bff, 0x18232eff, 0x293a49ff, 0x435968ff],
    floor: [0x0d141eff, 0x18232dff, 0x21313eff, 0x344654ff],
    bronze: 0x81675eff,
  },
  light: {
    air: [0xd7d9d5ff, 0xe1e2daff, 0xe7e5dbff, 0xede9deff],
    wall: [0xd3d7d2ff, 0xc9cecaff, 0xbfc8c5ff],
    steel: [0x374a53ff, 0x596d75ff, 0x82969bff, 0xa6b7b8ff],
    floor: [0xa7b2adff, 0xb8c0b8ff, 0xced0c3ff, 0xdde0d1ff],
    bronze: 0xb49d7cff,
  },
};

const img = (color) => ({ w: W, h: H, data: new Uint32Array(W * H).fill(color) });

function rect(image, x, y, w, h, color) {
  const x0 = Math.max(0, x), x1 = Math.min(image.w, x + w);
  for (let row = Math.max(0, y); row < Math.min(image.h, y + h); row++)
    image.data.fill(color, row * image.w + x0, row * image.w + x1);
}

// Integer Bresenham with a square 3px contact silhouette or a 1px metal shoulder.
// For width 3 this is the same 3x3 brush used by the source room's round brush.
function path(image, points, color, width = 1) {
  const radius = (width - 1) / 2;
  for (let i = 0; i < points.length - 2; i += 2) {
    let x = points[i], y = points[i + 1];
    const endX = points[i + 2], endY = points[i + 3];
    const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
    const sx = x < endX ? 1 : -1, sy = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      rect(image, x - radius, y - radius, width, width, color);
      if (x === endX && y === endY) break;
      const twice = 2 * error;
      if (twice >= dy) { error += dy; x += sx; }
      if (twice <= dx) { error += dx; y += sy; }
    }
  }
}

function checkSource(image, name) {
  if (image?.w !== 480 || image?.h !== 160 || !(image.data instanceof Uint32Array)
    || image.data.length !== 480 * 160)
    throw new TypeError(`${name} must be a native 480x160 pxl Img`);
}

/**
 * Build an unlabeled fine-pixel room and its source-defined binary material masks.
 * Input project is the existing foundry.px.js loaded through pxl; it is never mutated.
 * Each returned Img is {w:640,h:144,data:Uint32Array}, packed 0xRRGGBBAA.
 * Right-side artwork/masks are verbatim translated source pixels, clipped to bounds.
 */
export function buildWideRoom(project, variant) {
  if (!Object.hasOwn(themes, variant)) throw new RangeError('Room variant must be dark or light');
  const p = themes[variant];
  const source = project.image(`foundry-${variant}-unlabeled`);
  const sourceReceiver = project.image('foundry-receivers');
  const sourceProtected = project.image('foundry-protected');
  checkSource(source, 'Foundry room');
  checkSource(sourceReceiver, 'Foundry receivers');
  checkSource(sourceProtected, 'Foundry protected mask');
  const image = img(p.air[0]), receiver = img(BLACK), protectedMask = img(BLACK);

  // These are the source room's atmospheric bands after the exact -13px translation.
  // Keeping their values and heights continuous makes x460 an invisible copy boundary.
  rect(image, 0, 11, W, 47, p.air[1]);
  rect(image, 0, 58, W, 33, p.air[2]);
  rect(image, 0, 91, W, H - 91, p.air[3]);

  // A shallow overhead girder tapers into the ceiling, above every text-safe pixel.
  rect(image, 0, 0, 438, 7, p.steel[1]);
  rect(image, 438, 0, 11, 5, p.steel[1]);
  rect(image, 449, 0, 8, 2, p.steel[1]);
  rect(image, 0, 1, 430, 1, p.steel[2]);
  rect(image, 0, 6, 438, 1, p.steel[2]);
  rect(image, 438, 4, 11, 1, p.steel[2]);
  for (const x of [90, 223, 366]) {
    rect(image, x, 0, 3, 6, p.steel[0]);
    rect(image, x + 3, 1, 1, 4, p.steel[3]);
  }
  // The near wall return is outside the left edge of the typography region.
  rect(image, 0, 7, 7, 119, p.wall[0]);
  rect(image, 7, 10, 1, 113, p.wall[2]);
  rect(image, 0, 124, 21, 2, p.wall[1]);

  // A shallow continuous floor, not a foreground desk or framing plate.
  // Only the final 23 columns outside the text-safe wall rise toward the old stage.
  // x460 matches old x285 exactly: f1 at y111..122, f2 beginning at y123.
  for (let x = 0; x < SOURCE_LEFT + DX; x++) {
    const back = x <= 436 ? 132 : Math.ceil(132 - (x - 436) * 21 / 24);
    const front = x <= 436 ? 138 : Math.ceil(138 - (x - 436) * 15 / 24);
    rect(image, x, back, 1, H - back, p.floor[1]);
    rect(image, x, front, 1, H - front, p.floor[2]);
  }
  // A few perspective seams live below the wall; they never become a decorative grid.
  path(image, [16, 143, 31, 135, 124, 135], p.floor[0]);
  path(image, [18, 143, 32, 136, 123, 136], p.floor[3]);
  path(image, [286, 143, 299, 136, 352, 136], p.floor[1]);

  // Continue the two genuine power leads across the crop boundary, then off-frame.
  // Their joins at x460 exactly meet the translated source lead geometry.
  const leads = [
    [475, 129, 466, 129, 459, 135, 440, 135, 432, 140, 418, 140, 413, 144],
    [475, 132, 467, 132, 460, 138, 442, 138, 434, 144],
  ];
  for (const lead of leads) path(image, lead, p.steel[0], 3);
  path(image, leads[0], p.bronze);
  path(image, leads[1], p.steel[3]);

  // Copy last: not a single native material, lip, shadow or sky pixel is repainted.
  // Both masks use only this same crop; new atmospheric/structural pixels add no whites.
  for (let oldY = Math.max(0, -DY); oldY < Math.min(source.h, H - DY); oldY++) {
    const y = oldY + DY;
    for (let oldX = SOURCE_LEFT; oldX < Math.min(source.w, W - DX); oldX++) {
      const from = oldY * source.w + oldX, to = y * W + oldX + DX;
      const r = sourceReceiver.data[from], s = sourceProtected.data[from];
      if ((r !== BLACK && r !== WHITE) || (s !== BLACK && s !== WHITE))
        throw new TypeError('Foundry material masks must be opaque binary black/white');
      if (r === WHITE && s === WHITE) throw new Error('Foundry material masks overlap');
      image.data[to] = source.data[from];
      receiver.data[to] = r;
      protectedMask.data[to] = s;
    }
  }
  return { image, receiver, protectedMask };
}
