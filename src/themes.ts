import type { BannerTheme } from './types.js';

export const themes: readonly BannerTheme[] = [
  {
    id: 'terminal', description: 'Classic green phosphor terminal',
    light: { foreground: '#166534', background: '#ffffff', colors: ['#166534', '#047857'] },
    dark: { foreground: '#4ade80', background: '#0d1117', colors: ['#4ade80', '#a7f3d0'] },
  },
  {
    id: 'ocean', description: 'Calm blue and cyan',
    light: { foreground: '#0369a1', background: '#ffffff', colors: ['#0369a1', '#0e7490'] },
    dark: { foreground: '#38bdf8', background: '#0d1117', colors: ['#38bdf8', '#67e8f9'] },
  },
  {
    id: 'neon', description: 'Violet to pink gradient',
    light: { foreground: '#7e22ce', background: '#ffffff', colors: ['#7e22ce', '#be185d'] },
    dark: { foreground: '#c084fc', background: '#0d1117', colors: ['#c084fc', '#f9a8d4'] },
  },
  {
    id: 'minimal', description: 'Quiet monochrome',
    light: { foreground: '#1f2328', background: '#ffffff', colors: ['#1f2328'] },
    dark: { foreground: '#e6edf3', background: '#0d1117', colors: ['#e6edf3'] },
  },
];

export function getTheme(id: string): BannerTheme {
  const theme = themes.find((item) => item.id === id);
  if (!theme) throw new Error(`Unknown theme "${id}". Available: ${themes.map((item) => item.id).join(', ')}`);
  return theme;
}
