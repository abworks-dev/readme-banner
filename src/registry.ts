import type { BannerPreset } from './types.js';

export class PresetRegistry {
  private readonly entries = new Map<string, BannerPreset>();

  constructor(presets: readonly BannerPreset[] = []) {
    for (const preset of presets) this.register(preset);
  }

  register(preset: BannerPreset): this {
    if (!/^[a-z][a-z0-9-]*$/.test(preset.id)) throw new Error(`Invalid preset id: ${preset.id}`);
    if (this.entries.has(preset.id)) throw new Error(`Preset already registered: ${preset.id}`);
    this.entries.set(preset.id, preset);
    return this;
  }

  get(id: string): BannerPreset {
    const preset = this.entries.get(id);
    if (!preset) throw new Error(`Unknown preset "${id}". Available: ${this.list().map((item) => item.id).join(', ')}`);
    return preset;
  }

  list(): readonly BannerPreset[] {
    return [...this.entries.values()];
  }
}
