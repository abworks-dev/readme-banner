import { isPiece, load } from 'ascii.rest';
import { drawable, fonts, type BannerOptions, type FontName } from 'ascii.rest/banner';
import { bannerSvg } from 'ascii.rest/svg';
import type { BannerPreset } from '../types.js';

const ENUMS = {
  font: Object.keys(fonts),
  shadow: ['double', 'single', 'heavy', 'rounded', 'ascii', 'none'],
  effect: ['glint', 'type', 'still'],
  place: ['left', 'right', 'above', 'below'],
} as const;
const KEYS = new Set([...Object.keys(ENUMS), 'art', 'fill', 'speed', 'background']);

export const asciiPreset: BannerPreset = {
  id: 'ascii',
  description: 'ASCII block-letter banners powered by ascii.rest, with optional built-in art',
  validateOptions(options) {
    for (const key of Object.keys(options)) {
      if (!KEYS.has(key)) throw new Error(`Unknown ASCII option "${key}".`);
    }
    for (const [key, allowed] of Object.entries(ENUMS)) {
      const value = options[key];
      if (value !== undefined && (typeof value !== 'string' || !(allowed as readonly string[]).includes(value))) {
        throw new Error(`options.${key} must be one of: ${allowed.join(', ')}.`);
      }
    }
    if (options.art !== undefined && (typeof options.art !== 'string' || !isPiece(options.art))) {
      throw new Error('options.art must name a built-in ascii.rest piece, e.g. "donut", "rust", or "typescript". Paths, URLs, and raw SVG are not accepted.');
    }
    if (options.fill !== undefined && (typeof options.fill !== 'string' || options.fill.length !== 1 || /\s|[\u0000-\u001f\u007f]/u.test(options.fill))) {
      throw new Error('options.fill must be one nonblank character, e.g. "#" or "▓", not a URL-style fill name.');
    }
    if (options.speed !== undefined && (typeof options.speed !== 'number' || !Number.isFinite(options.speed) || options.speed < 0.25 || options.speed > 4)) {
      throw new Error('options.speed must be a number from 0.25 to 4.');
    }
    if (options.background !== undefined && typeof options.background !== 'boolean') {
      throw new Error('options.background must be a boolean.');
    }
  },
  async render({ config, palette, variant }) {
    const settings = config.options;
    const font = (settings.font ?? 'block') as FontName;
    if (drawable(config.title, font) !== config.title) {
      throw new Error(`ASCII font "${font}" cannot draw every character in the title. Use Latin letters, digits, spaces, or . , ! ? ' : - + = / _. Non-Latin taglines are allowed.`);
    }
    const options: Parameters<typeof bannerSvg>[1] = {
      dark: variant === 'dark',
      font,
      shadow: (settings.shadow ?? 'double') as BannerOptions['shadow'] & string,
      effect: (settings.effect ?? 'glint') as NonNullable<BannerOptions['effect']>,
      color: config.colors ?? palette.colors,
      taglineColor: palette.foreground,
      label: config.tagline ? `${config.title} — ${config.tagline}` : config.title,
      fps: 8,
      scale: 5,
    };
    if (config.tagline !== undefined) options.tagline = config.tagline;
    if (settings.fill !== undefined) options.fill = settings.fill as string;
    if (settings.speed !== undefined) options.speed = settings.speed as number;
    if (settings.place !== undefined) options.place = settings.place as 'left' | 'right' | 'above' | 'below';
    if (settings.background === true) options.background = palette.background;
    if (typeof settings.art === 'string' && isPiece(settings.art)) {
      const piece = await load[settings.art]();
      if ('clock' in piece.meta && piece.meta.clock) throw new Error(`Artwork "${settings.art}" depends on real time. Choose a non-clock piece for reproducible banner assets.`);
      options.art = piece;
    }
    return bannerSvg(config.title, options);
  },
};
