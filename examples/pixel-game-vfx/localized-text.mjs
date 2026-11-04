import assert from 'node:assert/strict';
import { layoutText, rasterizeText } from './pixel-text.mjs';

const KEYS = new Set(['schemaVersion', 'label', 'title', 'tagline']);
export function parseTextConfig(value) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Text config must be a JSON object');
  for (const key of Object.keys(value)) assert(KEYS.has(key), `Unknown text config key: ${key}`);
  assert.equal(value.schemaVersion, 1, 'Unsupported text schemaVersion');
  for (const key of ['label', 'title', 'tagline'])
    assert(typeof value[key] === 'string' && value[key].trim(), `${key} must be nonblank text`);
  return { schemaVersion: 1, label: value.label, title: value.title, tagline: value.tagline };
}

/** Explicit text-safe area ends before x236, leaving clear air before the archive and VFX. */
export function planLocalizedText(config, font, { profile = 'classic' } = {}) {
  config = parseTextConfig(config);
  assert(profile === 'classic' || profile === 'wide', 'Unknown typography profile');
  if (profile === 'wide') return planWideText(config, font);
  const specs = [
    { role: 'label', x: 27, y: 22, scale: 1, maxLines: 1, lineGap: 0, maxHeight: 12 },
    { role: 'title', x: 27, y: 45, scale: 2, maxLines: 1, lineGap: 0, maxHeight: 40 },
    { role: 'tagline', x: 27, y: 95, scale: 1, maxLines: 2, lineGap: 2, maxHeight: 26 },
  ];
  return specs.map(({ role, x, y, maxHeight, ...options }) => {
    try {
      let layout;
      try {
        layout = layoutText(config[role], font, { ...options, maxWidth: role === 'title' ? 208 : 209 });
        if (role === 'title' && layout.height + 2 > maxHeight) throw new Error('Text needs a smaller scale to fit its height');
      } catch (error) {
        if (role !== 'title' || !/Text needs|Unbreakable text/.test(error.message)) throw error;
        // Explicit fallback: keep the title inside its original art-direction slot, not two giant lines.
        layout = layoutText(config[role], font, { maxWidth: 208, maxLines: 2, scale: 1, lineGap: 2 });
      }
      assert(layout.height + (role === 'title' ? 2 : 0) <= maxHeight, `${role} exceeds its text-safe height`);
      const top = role === 'title' ? y + Math.floor((maxHeight - layout.height - 2) / 2) : y;
      return { role, x, y: top, bounds: { x, y, width: 209, height: maxHeight }, layout, mask: rasterizeText(layout, font) };
    } catch (error) { throw new Error(`${role}: ${error.message}`, { cause: error }); }
  });
}

/** Wide README: text takes 63% of the canvas, with an explicit gap before native-size VFX. */
function planWideText(config, font) {
  const specs = [
    { role: 'label', x: 32, y: 15, width: 404, height: 12, scales: [1], maxLines: 1 },
    { role: 'title', x: 32, y: 38, width: 404, height: 52, scales: [4, 3, 2, 1], maxLines: 1 },
    { role: 'tagline', x: 32, y: 104, width: 404, height: 26, scales: [1], maxLines: 2 },
  ];
  return specs.map(({ role, x, y, width, height, scales, maxLines }) => {
    try {
      const shadow = role === 'title' ? 2 : 0;
      let layout, lastError;
      for (const scale of scales) {
        try {
          layout = layoutText(config[role], font, { maxWidth: width - (role === 'title' ? 1 : 0),
            maxLines, scale, lineGap: 2 });
          assert(layout.height + shadow <= height, 'Text needs a smaller scale to fit its height');
          break;
        } catch (error) {
          if (!/Text needs|Unbreakable text/.test(error.message)) throw error;
          layout = undefined; lastError = error;
        }
      }
      if (!layout && role === 'title') {
        layout = layoutText(config[role], font, { maxWidth: width - 1, maxLines: 2, scale: 1, lineGap: 2 });
      }
      if (!layout) throw lastError;
      assert(layout.height + shadow <= height, `${role} exceeds its text-safe height`);
      const top = role === 'title' ? y + Math.floor((height - layout.height - shadow) / 2) : y;
      return { role, x, y: top, bounds: { x, y, width, height }, layout, mask: rasterizeText(layout, font) };
    } catch (error) { throw new Error(`${role}: ${error.message}`, { cause: error }); }
  });
}

const color = (value) => (parseInt(value, 16) * 256 + 255) >>> 0;
export function drawLocalizedText(image, variant, plan) {
  assert(variant === 'dark' || variant === 'light', 'Invalid theme');
  const palette = (variant === 'dark'
    ? ['eaf6ff', 'd7e5ef', 'c1ccdf', '94a0c3', '556489']
    : ['344a61', '2d3f55', '243346', '18283c', '112035']).map(color);
  const label = color(variant === 'dark' ? '9bb2c2' : '405762');
  const shadow = color(variant === 'dark' ? '080b16' : '8e99a7');
  for (const { role, x, y, bounds, mask } of plan) {
    const { width, height, data } = mask;
    const inside = (a, b) => a >= 0 && a < width && b >= 0 && b < height && data[b * width + a];
    const put = (a, b, c) => {
      assert(a >= bounds.x && b >= bounds.y && a < bounds.x + bounds.width && b < bounds.y + bounds.height &&
        a >= 0 && b >= 0 && a < image.w && b < image.h,
        'Text leaves its safe area; refusing to crop or overwrite the VFX');
      image.data[b * image.w + a] = c;
    };
    if (role === 'title') for (let b = 0; b < height; b++) for (let a = 0; a < width; a++)
      if (inside(a, b)) put(x + a + 1, y + b + 2, shadow);
    for (let b = 0; b < height; b++) for (let a = 0; a < width; a++) if (inside(a, b)) {
      const step = !inside(a, b - 1) ? 0 : !inside(a + 1, b) ? 4 : Math.min(3, 1 + Math.floor((b % 24) / 8));
      put(x + a, y + b, role === 'title' ? palette[step] : label);
    }
  }
}

export function textPlanReport(plan) {
  return plan.map(({ role, x, y, bounds, layout }) => ({ role, x, y, bounds,
    text: layout.text, scale: layout.scale, width: layout.width, height: layout.height,
    lines: layout.lines,
  }));
}
