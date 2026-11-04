import { parseArgs } from 'node:util';
import path from 'node:path';
import { DEFAULT_CONFIG, parseConfig, readConfigText } from './config.js';
import { applyPlan, optionalText, readText, relativePath, rootDirectory, safePath } from './files.js';
import { generateBanner } from './generate.js';
import { updateReadme } from './readme.js';
import { createRegistry } from './index.js';
import { getTheme, themes } from './themes.js';

export const VERSION = '0.1.0';
const HELP = `readme-banner ${VERSION} — config-driven README banners

Usage:
  readme-banner init [--title TEXT] [--preset ascii] [--theme terminal]
  readme-banner generate [--readme README.md] [--check]
  readme-banner presets [--json]
  readme-banner themes [--json]

Global options:
  --cwd PATH          Target repository (defaults to current directory)
  --config PATH       Repository-relative JSON config (default: banner.config.json)
  --json              Machine-readable result
  --help, -h          Show help
  --version, -v       Show version

init options:
  --title TEXT        Banner title (default: target directory name)
  --tagline TEXT      Subtitle; Unicode supported
  --preset ID         Renderer preset (default: ascii)
  --theme ID          Color theme: terminal, ocean, neon, minimal
  --art NAME          Built-in ASCII artwork, e.g. donut, rust, typescript
  --effect EFFECT     glint, type, still (default: glint)
  --force             Explicitly overwrite an existing configuration

generate options:
  --readme PATH       Explicitly insert/update a managed block in an existing .md file
  --check             Read-only drift check; exit 1 if generated files differ

Generated assets: <outputDir>/banner.light.svg and banner.dark.svg.
No scripts run from project configuration. Nothing is committed or pushed.
`;

interface CliIO { out(message: string): void; err(message: string): void }

export async function runCli(args: string[], io: CliIO = { out: console.log, err: console.error }): Promise<number> {
  try {
    const { values, positionals } = parseArgs({
      args, allowPositionals: true, strict: true,
      options: {
        help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
        cwd: { type: 'string' }, config: { type: 'string' }, json: { type: 'boolean' },
        title: { type: 'string' }, tagline: { type: 'string' }, preset: { type: 'string' },
        theme: { type: 'string' }, art: { type: 'string' }, effect: { type: 'string' },
        force: { type: 'boolean' }, readme: { type: 'string' }, check: { type: 'boolean' },
      },
    });
    if (values.help) { io.out(HELP); return 0; }
    if (values.version) { io.out(VERSION); return 0; }
    if (positionals.length === 0 && args.length === 0) { io.out(HELP); return 0; }
    if (positionals.length !== 1) throw new Error('Provide exactly one command. Run readme-banner --help.');
    const command = positionals[0];
    if (!['init', 'generate', 'presets', 'themes'].includes(command ?? '')) throw new Error(`Unknown command "${command}". Run readme-banner --help.`);
    const allowed = new Set(['help', 'version', 'json', ...(command === 'init'
      ? ['cwd', 'config', 'title', 'tagline', 'preset', 'theme', 'art', 'effect', 'force']
      : command === 'generate' ? ['cwd', 'config', 'readme', 'check'] : [])]);
    for (const key of Object.keys(values)) {
      if (!allowed.has(key)) throw new Error(`--${key} is not supported by ${command}.`);
    }
    const registry = createRegistry();
    if (command === 'presets' || command === 'themes') {
      const items = command === 'presets' ? registry.list() : themes;
      const entries = items.map(({ id, description }) => ({ id, description }));
      io.out(values.json ? JSON.stringify(entries, null, 2) : entries.map(({ id, description }) => `${id.padEnd(12)} ${description}`).join('\n'));
      return 0;
    }
    const root = await rootDirectory(values.cwd ?? process.cwd());
    const configPath = relativePath(values.config ?? DEFAULT_CONFIG);
    if (!configPath.endsWith('.json')) throw new Error('--config must name a .json file.');
    if (command === 'init') {
      const config = parseConfig({
        schemaVersion: 1, preset: values.preset ?? 'ascii', theme: values.theme ?? 'terminal',
        title: values.title ?? path.basename(root),
        ...(values.tagline !== undefined ? { tagline: values.tagline } : {}),
        outputDir: 'assets/banner',
        options: { effect: values.effect ?? 'glint', ...(values.art !== undefined ? { art: values.art } : {}) },
      });
      registry.get(config.preset).validateOptions(config.options);
      getTheme(config.theme);
      relativePath(config.outputDir);
      const existing = await optionalText(await safePath(root, configPath));
      if (existing !== undefined && !values.force) throw new Error(`Configuration already exists: ${configPath}. Use --force to replace it explicitly.`);
      await applyPlan(root, [{ path: configPath, content: `${JSON.stringify(config, null, 2)}\n` }]);
      io.out(values.json ? JSON.stringify({ ok: true, command, config: configPath, root }) : `Created ${configPath}\nNext: readme-banner generate --cwd ${JSON.stringify(root)}`);
      return 0;
    }
    const readmePath = values.readme === undefined ? undefined : relativePath(values.readme);
    if (readmePath !== undefined && !/\.md$/iu.test(readmePath)) throw new Error('--readme must name an existing .md file.');
    const config = readConfigText(await readText(root, configPath));
    const generated = await generateBanner(config, registry, readmePath);
    const plan = [...generated.files];
    if (readmePath !== undefined) {
      const current = await readText(root, readmePath);
      plan.push({ path: readmePath, content: updateReadme(current, generated.snippet) });
    }
    // Defend the public API against one planned file overwriting another.
    const paths = plan.map((file) => file.path.toLowerCase());
    if (new Set(paths).size !== paths.length || paths.includes(configPath.toLowerCase())) throw new Error('Configuration, assets, and README paths must not overlap.');
    const changed = await applyPlan(root, plan, values.check === true);
    const clean = changed.length === 0;
    if (values.json) {
      io.out(JSON.stringify({ ok: !values.check || clean, command, root, check: values.check === true, changed, files: generated.files.map((file) => file.path), snippet: generated.snippet }, null, 2));
    } else {
      io.out(values.check ? (clean ? 'Banner assets are up to date.' : `Banner drift detected:\n${changed.join('\n')}`) : `Generated ${generated.files.length} assets (${changed.length} files changed).`);
      io.out(generated.snippet);
    }
    return values.check && !clean ? 1 : 0;
  } catch (error) {
    io.err(`readme-banner: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
