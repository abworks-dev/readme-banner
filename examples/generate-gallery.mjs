import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRegistry, generateBanner, themes } from '../dist/index.js';

const check = process.argv.includes('--check');
const directory = new URL('./gallery/', import.meta.url);
const appearances = {
  terminal: { font: 'block', shadow: 'double', art: 'donut', effect: 'glint' },
  ocean: { font: 'slim', shadow: 'single', art: 'earth', effect: 'glint' },
  neon: { font: 'italic', shadow: 'double', art: 'dna-helix', effect: 'type' },
  minimal: { font: 'mixed', shadow: 'none', effect: 'still' },
};
let dirty = false;
for (const theme of themes) {
  const generated = await generateBanner({ schemaVersion: 1, preset: 'ascii', theme: theme.id, title: 'Your Project', tagline: 'One config. Every repository.', outputDir: 'examples/gallery', options: appearances[theme.id] }, createRegistry());
  for (const [index, file] of generated.files.entries()) {
    const name = `ascii-${theme.id}.${index === 0 ? 'light' : 'dark'}.svg`;
    const target = new URL(name, directory);
    if (check) {
      let current;
      try { current = await readFile(target, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (current !== file.content) { dirty = true; console.error(`Gallery drift: ${name}`); }
    } else {
      await mkdir(fileURLToPath(directory), { recursive: true });
      await writeFile(target, file.content);
      console.log(`Generated ${name}`);
    }
  }
}
if (check && !dirty) console.log('Gallery is up to date.');
process.exitCode = dirty ? 1 : 0;
