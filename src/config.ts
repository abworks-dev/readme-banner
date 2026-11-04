import type { BannerConfig } from './types.js';

export const DEFAULT_CONFIG = 'banner.config.json';
const ALLOWED_KEYS = new Set(['$schema', 'schemaVersion', 'preset', 'theme', 'title', 'tagline', 'colors', 'outputDir', 'options']);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function nonemptyString(value: unknown, name: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Error(`${name} must be a nonempty single-line string of at most ${max} characters.`);
  }
  return value;
}

/** JSON only: project configuration cannot import modules or run shell commands. */
export function parseConfig(input: unknown): BannerConfig {
  if (!isRecord(input)) throw new Error('Banner configuration must be a JSON object.');
  for (const key of Object.keys(input)) {
    if (!ALLOWED_KEYS.has(key)) throw new Error(`Unknown configuration key "${key}".`);
  }
  if (input.schemaVersion !== 1) throw new Error('schemaVersion must be 1.');
  const preset = nonemptyString(input.preset, 'preset', 64);
  const theme = nonemptyString(input.theme, 'theme', 64);
  const title = nonemptyString(input.title, 'title', 120);
  const outputDir = nonemptyString(input.outputDir ?? 'assets/banner', 'outputDir', 240);
  const options = input.options ?? {};
  if (!isRecord(options)) throw new Error('options must be a JSON object.');
  const config: BannerConfig = { schemaVersion: 1, preset, theme, title, outputDir, options };
  if (input.$schema !== undefined) config.$schema = nonemptyString(input.$schema, '$schema', 1000);
  if (input.tagline !== undefined) config.tagline = nonemptyString(input.tagline, 'tagline', 240);
  if (input.colors !== undefined) {
    if (!Array.isArray(input.colors) || input.colors.length < 1 || input.colors.length > 8 || !input.colors.every((color: unknown) => typeof color === 'string' && /^#[\da-f]{6}$/i.test(color))) {
      throw new Error('colors must contain 1 to 8 hex colors, e.g. ["#38bdf8", "#a78bfa"].');
    }
    config.colors = [...input.colors] as string[];
  }
  return config;
}

export function readConfigText(text: string): BannerConfig {
  try {
    return parseConfig(JSON.parse(text.replace(/^\uFEFF/u, '')) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Invalid JSON configuration: ${error.message}`);
    throw error;
  }
}
