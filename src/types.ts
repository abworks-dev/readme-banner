export type ThemeVariant = 'light' | 'dark';

export interface ThemePalette {
  readonly foreground: string;
  readonly background: string;
  readonly colors: readonly string[];
}

export interface BannerTheme {
  readonly id: string;
  readonly description: string;
  readonly light: ThemePalette;
  readonly dark: ThemePalette;
}

/** Preset-specific settings stay in options; the core never interprets them. */
export interface BannerConfig {
  $schema?: string;
  schemaVersion: 1;
  preset: string;
  theme: string;
  title: string;
  tagline?: string;
  colors?: string[];
  outputDir: string;
  options: Record<string, unknown>;
}

export interface RenderContext {
  readonly config: BannerConfig;
  readonly palette: ThemePalette;
  readonly variant: ThemeVariant;
}

/** Register more renderers in code; no code is executed from a project's JSON. */
export interface BannerPreset {
  readonly id: string;
  readonly description: string;
  validateOptions(options: Record<string, unknown>): void;
  render(context: RenderContext): string | Promise<string>;
}

export interface GeneratedBanner {
  readonly config: BannerConfig;
  readonly files: ReadonlyArray<{ path: string; content: string }>;
  readonly snippet: string;
}
