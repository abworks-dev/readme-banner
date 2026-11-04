import type { BannerConfig, GeneratedBanner } from './types.js';
import { parseConfig } from './config.js';
import { relativePath } from './files.js';
import { getTheme } from './themes.js';
import { PresetRegistry } from './registry.js';
import { bannerSnippet } from './readme.js';

/** Pure rendering: configuration in, two SVG assets and a snippet out. */
export async function generateBanner(input: BannerConfig, registry: PresetRegistry, readme = 'README.md'): Promise<GeneratedBanner> {
  const config = parseConfig(input);
  config.outputDir = relativePath(config.outputDir);
  relativePath(readme);
  const preset = registry.get(config.preset);
  const theme = getTheme(config.theme);
  preset.validateOptions(config.options);
  const files: Array<{ path: string; content: string }> = [];
  for (const variant of ['light', 'dark'] as const) {
    const content = await preset.render({ config, palette: theme[variant], variant });
    if (!/^\s*(?:<\?xml[^>]*>\s*)?<svg\b/u.test(content)) throw new Error(`Preset "${preset.id}" did not return an SVG.`);
    if (Buffer.byteLength(content) > 2_000_000) throw new Error(`Preset "${preset.id}" generated an SVG over the 2 MB asset limit. Use effect "still", a shorter title, or simpler art.`);
    files.push({ path: `${config.outputDir}/banner.${variant}.svg`, content: content.endsWith('\n') ? content : `${content}\n` });
  }
  return { config, files, snippet: bannerSnippet(config.title, config.outputDir, readme) };
}
