import { asciiPreset } from './presets/ascii.js';
import { PresetRegistry } from './registry.js';

export function createRegistry(): PresetRegistry {
  return new PresetRegistry([asciiPreset]);
}

export { PresetRegistry } from './registry.js';
export { asciiPreset } from './presets/ascii.js';
export { generateBanner } from './generate.js';
export { parseConfig, readConfigText } from './config.js';
export { getTheme, themes } from './themes.js';
export { bannerSnippet, updateReadme } from './readme.js';
export type { BannerConfig, BannerPreset, BannerTheme, GeneratedBanner, RenderContext, ThemePalette, ThemeVariant } from './types.js';
