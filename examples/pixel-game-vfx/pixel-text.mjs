import assert from 'node:assert/strict';

// A documented horizontal CJK/Latin line-breaking subset, not a shaping engine or UAX14 implementation.
const OPEN = new Set(Array.from('([{（［｛【《〈「『〔〖〘〚“‘'));
const CLOSE = new Set(Array.from(')]}）］｝】》〉」』〕〗〙〛”’、。，．：；！？!?%,.:;…％'));
const WORD = /^[\p{Script=Latin}\p{Nd}_]$/u;
const SEQUENCE = /[\p{Mark}\u200c\u200d\ufe00-\ufe0f\u{e0100}-\u{e01ef}]/u;

function characters(input, font) {
  assert.equal(typeof input, 'string', 'Text must be a string');
  const text = input.replace(/\r\n?/g, '\n').normalize('NFC');
  assert(Array.from(text).length <= 512, 'Text exceeds the 512-code-point limit');
  assert(!SEQUENCE.test(text), 'Combining/shaping sequences are unsupported; use precomposed characters');
  assert(!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(text.replaceAll('\n', '')), 'Unsupported text control or surrogate');
  for (const ch of text) if (ch !== '\n') {
    const glyph = font.glyph(ch.codePointAt(0));
    assert(glyph, `Missing Fusion glyph U+${ch.codePointAt(0).toString(16).toUpperCase()} (${ch})`);
    assert(Number.isInteger(glyph.advance) && glyph.advance > 0, `Invalid advance for ${ch}`);
  }
  return text;
}
function inWord(chars, i) {
  return WORD.test(chars[i] ?? '') || (/^[-'’]$/.test(chars[i] ?? '') &&
    WORD.test(chars[i - 1] ?? '') && WORD.test(chars[i + 1] ?? ''));
}
function legalBreak(chars, end) {
  if (end === chars.length) return true;
  let left = end - 1, right = end;
  while (left >= 0 && chars[left] === ' ') left--;
  while (right < chars.length && chars[right] === ' ') right++;
  if (left < 0 || right === chars.length) return true;
  if (OPEN.has(chars[left]) || CLOSE.has(chars[right])) return false;
  if (chars[end - 1] === '\u00a0' || chars[end] === '\u00a0') return false;
  if (chars[end - 1] === chars[end] && /[……—]/.test(chars[end])) return false;
  if (chars[end - 1] === ' ' || chars[end] === ' ') return true;
  return !(inWord(chars, end - 1) && inWord(chars, end));
}
function geometry(chars, font) {
  let advance = 0, left = 0, right = 0;
  for (const ch of chars) {
    const g = font.glyph(ch.codePointAt(0));
    for (let col = 0; col < g.width; col++) if (g.rows.some((row) => row & (1 << (g.width - 1 - col)))) {
      left = Math.min(left, advance + g.bearingX + col);
      right = Math.max(right, advance + g.bearingX + col + 1);
    }
    advance += g.advance;
  }
  right = Math.max(right, advance);
  return { advance, offsetX: -left, width: right - left };
}
/** Includes logical DWIDTH cells plus any actual ink overhang, never trimmed character advances. */
export function measureText(text, font, scale = 1) {
  assert(Number.isInteger(scale) && scale >= 1 && scale <= 4, 'Scale must be an integer from 1 to 4');
  const normalized = characters(text, font);
  assert(!normalized.includes('\n'), 'measureText expects one line');
  return geometry(Array.from(normalized), font).width * scale;
}
function wrapParagraph(chars, font, maxWidth, scale) {
  if (!chars.length) return [''];
  const best = new Array(chars.length + 1);
  best[chars.length] = { lines: [], cost: 0 };
  for (let start = chars.length - 1; start >= 0; start--) {
    let advance = 0;
    for (let end = start + 1; end <= chars.length; end++) {
      advance += font.glyph(chars[end - 1].codePointAt(0)).advance * scale;
      if (advance > maxWidth) break;
      if (!legalBreak(chars, end)) continue;
      let stop = end, next = end;
      while (stop > start && chars[stop - 1] === ' ') stop--;
      while (chars[next] === ' ') next++;
      if (stop === start || !best[next]) continue;
      const width = geometry(chars.slice(start, stop), font).width * scale;
      if (width > maxWidth) continue;
      const rest = best[next], line = chars.slice(start, stop).join('');
      const candidate = { lines: [line, ...rest.lines], cost: (maxWidth - width) ** 2 + rest.cost };
      const old = best[start];
      if (!old || candidate.lines.length < old.lines.length ||
        (candidate.lines.length === old.lines.length && candidate.cost < old.cost)) best[start] = candidate;
    }
  }
  assert(best[0], `Unbreakable text or punctuation exceeds ${maxWidth}px: "${chars.slice(0, 24).join('')}"`);
  return best[0].lines;
}
/** Fewest lines, then balanced raggedness; ASCII separator spaces are consumed at soft wraps. */
export function layoutText(input, font, { maxWidth, maxLines = 1, scale = 1, lineGap = 0 } = {}) {
  assert(Number.isInteger(maxWidth) && maxWidth > 0 && maxWidth <= 4096, 'Invalid maxWidth');
  assert(Number.isInteger(maxLines) && maxLines >= 1 && maxLines <= 32, 'Invalid maxLines');
  assert(Number.isInteger(scale) && scale >= 1 && scale <= 4, 'Scale must be an integer from 1 to 4');
  assert(Number.isInteger(lineGap) && lineGap >= 0 && lineGap <= 12, 'Invalid lineGap');
  assert(Number.isInteger(font.ascent) && font.ascent > 0 && Number.isInteger(font.descent) && font.descent >= 0 &&
    font.lineHeight === font.ascent + font.descent && font.lineHeight > 0, 'Invalid font baseline metrics');
  const text = characters(input, font), lines = [], paragraphs = text.split('\n');
  assert(text.trim(), 'Text must not be blank');
  // Preserve real BDF ink extents too: two vertical kana-repeat glyphs in the official
  // face are taller than the nominal 12px cell. Grow leading, never overlap or crop.
  let ascent = font.ascent, descent = font.descent;
  for (const ch of text) if (ch !== '\n') {
    const g = font.glyph(ch.codePointAt(0));
    const first = g.rows.findIndex((row) => row !== 0), last = g.rows.findLastIndex((row) => row !== 0);
    if (first >= 0) { ascent = Math.max(ascent, g.bearingY - first); descent = Math.max(descent, last + 1 - g.bearingY); }
  }
  const cellHeight = ascent + descent;
  for (let i = 1; i < paragraphs.length; i++) {
    const before = Array.from(paragraphs[i - 1].trimEnd()).at(-1);
    const after = Array.from(paragraphs[i].trimStart())[0];
    assert(!OPEN.has(before) && !CLOSE.has(after), 'Explicit newline violates Chinese punctuation boundaries');
  }
  for (const paragraph of paragraphs) {
    const chars = Array.from(paragraph.replace(/^ +| +$/g, ''));
    lines.push(...wrapParagraph(chars, font, maxWidth, scale));
  }
  assert(lines.length <= maxLines, `Text needs ${lines.length} lines; maximum is ${maxLines}`);
  const metrics = lines.map((value, index) => {
    const g = geometry(Array.from(value), font);
    return { text: value, width: g.width * scale, advance: g.advance * scale, offsetX: g.offsetX * scale,
      baseline: (ascent + index * (cellHeight + lineGap)) * scale };
  });
  return { text, scale, width: Math.max(...metrics.map((line) => line.width)),
    height: (lines.length * cellHeight + (lines.length - 1) * lineGap) * scale,
    ascent: ascent * scale, descent: descent * scale,
    lineHeight: (cellHeight + lineGap) * scale, lines: metrics };
}
/** Exact binary bits, shared BDF baselines; no browser, FreeType, antialiasing or system fonts. */
export function rasterizeText(layout, font) {
  const { width, height, scale } = layout;
  const data = new Uint8Array(width * height);
  for (const line of layout.lines) {
    let pen = line.offsetX;
    for (const ch of line.text) {
      const glyph = font.glyph(ch.codePointAt(0));
      assert(glyph, 'The layout font must match the raster font');
      for (let row = 0; row < glyph.height; row++) for (let col = 0; col < glyph.width; col++) {
        if (!(glyph.rows[row] & (1 << (glyph.width - 1 - col)))) continue;
        const x = pen + (glyph.bearingX + col) * scale;
        const y = line.baseline - glyph.bearingY * scale + row * scale;
        assert(x >= 0 && y >= 0 && x + scale <= width && y + scale <= height,
          `Glyph ${ch} extends beyond its layout cell; refusing to crop it`);
        for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++)
          data[(y + dy) * width + x + dx] = 1;
      }
      pen += glyph.advance * scale;
    }
  }
  return { width, height, data };
}
