import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, symlink, link, lstat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('../bin/readme-banner.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', timeout: 30_000 });
const repo = async () => mkdtemp(path.join(tmpdir(), 'readme-banner-test-'));
const readConfig = async (root) => JSON.parse(await readFile(path.join(root, 'banner.config.json'), 'utf8'));
const saveConfig = async (root, value) => writeFile(path.join(root, 'banner.config.json'), JSON.stringify(value));
const good = (result) => assert.equal(result.status, 0, result.stderr || result.stdout);

test('default lowercase directory name produces a renderable configuration', async () => {
  const root = await repo();
  good(run('init', '--cwd', root));
  good(run('generate', '--cwd', root));
  good(run('generate', '--cwd', root, '--check'));
});

// OS temporary test directories intentionally retained for diagnosis; no project files are removed.
test('help, version, discovery, and argument failures are useful', () => {
  const help = run('--help'); good(help); assert.match(help.stdout, /generate/);
  const version = run('--version'); good(version); assert.equal(version.stdout.trim(), '0.1.0');
  assert.equal(JSON.parse(run('presets', '--json').stdout)[0].id, 'ascii');
  assert.equal(JSON.parse(run('themes', '--json').stdout).length, 4);
  for (const args of [['missing'], ['themes', '--title', 'oops'], ['generate', '--typo'], ['init', 'extra'], ['--cwd', '.']]) {
    const failure = run(...args); assert.equal(failure.status, 1); assert.match(failure.stderr, /readme-banner:/);
  }
});

test('init, generation, drift check, README opt-in, and no-op mtimes', async () => {
  const root = await repo();
  const original = '# Existing project\r\n\r\nKeep this untouched.\r\n';
  await writeFile(path.join(root, 'README.md'), original);
  good(run('init', '--cwd', root, '--title', 'PROJECT', '--theme', 'ocean', '--tagline', 'A safe & useful project', '--effect', 'still', '--json'));
  assert.deepEqual((await readdir(root)).sort(), ['README.md', 'banner.config.json']);
  assert.equal(run('init', '--cwd', root).status, 1);
  const checkMissing = run('generate', '--cwd', root, '--check', '--json');
  assert.equal(checkMissing.status, 1); assert.equal(JSON.parse(checkMissing.stdout).changed.length, 2);
  assert.deepEqual((await readdir(root)).sort(), ['README.md', 'banner.config.json']);
  good(run('generate', '--cwd', root));
  assert.equal(await readFile(path.join(root, 'README.md'), 'utf8'), original);
  const light = path.join(root, 'assets/banner/banner.light.svg');
  assert.match(await readFile(light, 'utf8'), /^<svg/);
  const before = (await lstat(light)).mtimeMs;
  good(run('generate', '--cwd', root, '--check'));
  good(run('generate', '--cwd', root, '--readme', 'README.md'));
  const body = await readFile(path.join(root, 'README.md'), 'utf8');
  assert.match(body, /readme-banner:start/); assert.ok(body.endsWith(original));
  good(run('generate', '--cwd', root, '--readme', 'README.md', '--check'));
  assert.equal((await lstat(light)).mtimeMs, before);
  const config = await readConfig(root); config.title = 'NEW'; await saveConfig(root, config);
  assert.equal(run('generate', '--cwd', root, '--check').status, 1);
  assert.equal((await lstat(light)).mtimeMs, before);
  good(run('generate', '--cwd', root, '--readme', 'README.md'));
  assert.equal((await readFile(path.join(root, 'README.md'), 'utf8')).split('readme-banner:start').length, 2);
});

test('nested config, README and output directory names with spaces work', async () => {
  const root = await repo();
  await mkdir(path.join(root, 'docs'));
  await writeFile(path.join(root, 'docs/README.md'), '# Documentation\n');
  good(run('init', '--cwd', root, '--config', 'config/banner.json', '--title', 'PATHS', '--effect', 'still'));
  const configFile = path.join(root, 'config/banner.json');
  const config = JSON.parse(await readFile(configFile, 'utf8')); config.outputDir = 'art/my banners';
  await writeFile(configFile, JSON.stringify(config));
  const result = run('generate', '--cwd', root, '--config', 'config/banner.json', '--readme', 'docs/README.md', '--json');
  good(result);
  assert.match(JSON.parse(result.stdout).snippet, /\.\.\/art\/my%20banners\//);
});

test('invalid generation is nonmutating, with all README preflight checks first', async () => {
  const root = await repo();
  good(run('init', '--cwd', root, '--title', 'SAFE', '--effect', 'still'));
  const config = await readConfig(root);
  await saveConfig(root, { ...config, outputDir: '../escape' });
  const traversal = run('generate', '--cwd', root); assert.equal(traversal.status, 1); assert.match(traversal.stderr, /Unsafe path/);
  await saveConfig(root, config);
  await writeFile(path.join(root, 'README.md'), '# Intro\n<!-- readme-banner:start -->\n');
  assert.equal(run('generate', '--cwd', root, '--readme', 'README.md').status, 1);
  assert.deepEqual((await readdir(root)).sort(), ['README.md', 'banner.config.json']);
  assert.equal(run('generate', '--cwd', root, '--readme', 'missing.md').status, 1);
  assert.equal(run('generate', '--cwd', root, '--readme', 'banner.config.json').status, 1);
  assert.equal(run('generate', '--cwd', root, '--config', 'README.md').status, 1);
});

test('init --force is explicit and generation rejects symlink directories and leaves', async (t) => {
  const root = await repo();
  good(run('init', '--cwd', root, '--title', 'SAFE', '--effect', 'still'));
  good(run('init', '--cwd', root, '--title', 'REPLACED', '--effect', 'still', '--force'));
  assert.equal((await readConfig(root)).title, 'REPLACED');
  const outside = await repo();
  try { await symlink(outside, path.join(root, 'assets'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'ENOTSUP', 'EACCES'].includes(error.code)) { t.skip('OS does not allow symlinks'); return; } throw error; }
  const result = run('generate', '--cwd', root);
  assert.equal(result.status, 1); assert.match(result.stderr, /symbolic link or junction/);
  assert.deepEqual(await readdir(outside), []);
});

test('hard-linked existing assets cannot overwrite an outside inode', async () => {
  const root = await repo();
  const outside = await repo();
  const sentinel = path.join(outside, 'sentinel.txt');
  await writeFile(sentinel, 'DO NOT CHANGE');
  await mkdir(path.join(root, 'assets/banner'), { recursive: true });
  await link(sentinel, path.join(root, 'assets/banner/banner.light.svg'));
  good(run('init', '--cwd', root, '--title', 'SAFE', '--effect', 'still'));
  const result = run('generate', '--cwd', root);
  assert.equal(result.status, 1); assert.match(result.stderr, /hard-linked file/);
  assert.equal(await readFile(sentinel, 'utf8'), 'DO NOT CHANGE');
});
