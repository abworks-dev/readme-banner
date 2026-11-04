import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistry, generateBanner, parseConfig, readConfigText, PresetRegistry, themes, bannerSnippet, updateReadme } from '../dist/index.js';
import { relativePath } from '../dist/files.js';

const base = (overrides = {}) => ({ schemaVersion: 1, preset: 'ascii', theme: 'terminal', title: 'DEMO', outputDir: 'assets/banner', options: { effect: 'still' }, ...overrides });

test('validates JSON, BOM, schema version, and common keys', () => {
  assert.equal(readConfigText('\uFEFF' + JSON.stringify(base())).title, 'DEMO');
  for (const value of [null, [], {}, base({ schemaVersion: 2 }), base({ unexpected: true }), base({ options: [] }), base({ title: 'hello\nworld' }), base({ title: 'A'.repeat(121) }), base({ colors: ['red'] }), base({ colors: [] }), base({ colors: ['#gggggg'] })]) {
    assert.throws(() => parseConfig(value));
  }
  assert.throws(() => readConfigText('{ nope'), /Invalid JSON/);
  assert.deepEqual(parseConfig(base({ colors: ['#38bdf8', '#A78BFA'] })).colors, ['#38bdf8', '#A78BFA']);
  assert.equal(parseConfig(base({ tagline: '支持中文副标题 & <safe>' })).tagline, '支持中文副标题 & <safe>');
});

test('presets and color themes have independent registries', async () => {
  const registry = createRegistry();
  assert.deepEqual(registry.list().map(({ id }) => id), ['ascii']);
  assert.deepEqual(themes.map(({ id }) => id), ['terminal', 'ocean', 'neon', 'minimal']);
  assert.throws(() => registry.register(registry.get('ascii')), /already registered/);
  registry.register({ id: 'plain', description: 'Test non-ASCII renderer', validateOptions() {}, render({ config, palette }) { return `<svg xmlns="http://www.w3.org/2000/svg"><text fill="${palette.foreground}">${config.title}</text></svg>`; } });
  const result = await generateBanner(base({ preset: 'plain', title: 'future' }), registry);
  assert.match(result.files[0].content, /future/);
  assert.notEqual(result.files[0].content, result.files[1].content);
  assert.throws(() => new PresetRegistry([{ id: '../bad' }]), /Invalid preset/);
});

test('ASCII renders both themes deterministically and without external resources', async () => {
  for (const theme of themes) {
    const config = base({ theme: theme.id, tagline: '<script>alert("x")</script> & subtitle' });
    const first = await generateBanner(config, createRegistry());
    const second = await generateBanner(config, createRegistry());
    assert.deepEqual(first, second);
    assert.equal(first.files.length, 2);
    assert.notEqual(first.files[0].content, first.files[1].content);
    for (const file of first.files) {
      assert.match(file.content, /^<svg\b/);
      assert.match(file.content, /&lt;script&gt;/);
      assert.doesNotMatch(file.content, /<script\b|@import|@font-face|(?:href|src)=["']https?:/i);
      assert.ok(Buffer.byteLength(file.content) < 2_000_000);
    }
  }
});

test('supports built-in artwork, animation, bitmap fonts, and background', async () => {
  const generated = await generateBanner(base({ title: 'Demo', theme: 'ocean', options: { art: 'typescript', font: 'mixed', shadow: 'rounded', fill: '#', speed: 2, effect: 'glint', place: 'right', background: true } }), createRegistry());
  assert.match(generated.files[0].content, /@keyframes/);
  assert.match(generated.files[0].content, /prefers-reduced-motion/);
  assert.match(generated.files[1].content, /#0d1117/);
  assert.deepEqual(generated, await generateBanner(base({ title: 'Demo', theme: 'ocean', options: { art: 'typescript', font: 'mixed', shadow: 'rounded', fill: '#', speed: 2, effect: 'glint', place: 'right', background: true } }), createRegistry()));
});

test('lowercase default titles render with every bitmap font; clock art is rejected', async () => {
  for (const font of ['block', 'slim', 'tall', 'bold', 'round', 'wide', 'mixed', 'italic']) {
    const generated = await generateBanner(base({ title: 'readme-banner', options: { font, effect: 'still' } }), createRegistry());
    assert.match(generated.files[0].content, /^<svg/);
  }
  for (const art of ['analog-clock', 'digital-clock', 'calendar', 'landscape', 'sundial']) {
    await assert.rejects(generateBanner(base({ options: { art, effect: 'still' } }), createRegistry()), /depends on real time/);
  }
});

test('invalid ASCII options, unsupported glyphs, unknown preset/theme fail', async () => {
  for (const options of [{ font: 'nope' }, { shadow: 'nope' }, { effect: 'nope' }, { fill: 'shade' }, { fill: ' ' }, { speed: 'slow' }, { speed: 0 }, { speed: 5 }, { art: '<svg/>' }, { art: 'https://example.com/logo.svg' }, { place: 'top' }, { background: '#ffffff' }, { typo: true }]) {
    await assert.rejects(generateBanner(base({ options }), createRegistry()));
  }
  await assert.rejects(generateBanner(base({ title: '你好' }), createRegistry()), /cannot draw/);
  await assert.rejects(generateBanner(base({ title: 'HELLO🐱' }), createRegistry()), /cannot draw/);
  await assert.rejects(generateBanner(base({ theme: 'missing' }), createRegistry()), /Unknown theme/);
  await assert.rejects(generateBanner(base({ preset: 'missing' }), createRegistry()), /Unknown preset/);
});

test('caps oversized or non-SVG output from an additional renderer', async () => {
  const preset = (content) => new PresetRegistry([{ id: 'test', description: 'test', validateOptions() {}, render: () => content }]);
  await assert.rejects(generateBanner(base({ preset: 'test' }), preset('not SVG')), /did not return/);
  await assert.rejects(generateBanner(base({ preset: 'test' }), preset('<svg>' + 'x'.repeat(2_000_000) + '</svg>')), /2 MB/);
});

test('paths reject traversal, Windows devices, drives, ADS, and ambiguous names', () => {
  for (const value of ['', '.', '..', '../outside', 'a/../b', '/tmp/output', 'C:\\temp', '\\\\server\\share', 'a//b', 'a/', 'a/./b', 'CON', 'assets/NUL.svg', 'assets/data:stream', 'assets/end.', 'assets/end ', 'a\nfile']) assert.throws(() => relativePath(value), /Unsafe path/, value);
  assert.equal(relativePath('docs\\assets\\banner'), 'docs/assets/banner');
});

test('snippets encode asset paths, escape alt, and respect nested README locations', () => {
  const snippet = bannerSnippet('A" <x> & B', 'assets/my banner', 'docs/README.md');
  assert.match(snippet, /\.\.\/assets\/my%20banner\/banner.dark.svg/);
  assert.match(snippet, /alt="A&quot; &lt;x&gt; &amp; B"/);
  assert.match(snippet, /prefers-color-scheme: dark/);
});

test('README update is idempotent, preserves body/BOM/CRLF, rejects malformed markers', () => {
  const snippet = bannerSnippet('DEMO', 'assets/banner');
  const body = '\uFEFF# Project\r\n\r\nExisting content.\r\n';
  const next = updateReadme(body, snippet);
  assert.ok(next.startsWith('\uFEFF<!--'));
  assert.ok(next.endsWith(body.slice(1)));
  assert.equal(updateReadme(next, snippet), next);
  assert.equal(next.replace(/\r\n/g, '').includes('\n'), false);
  const markers = ['<!-- readme-banner:start -->', '<!-- readme-banner:end -->'];
  for (const value of [markers[0], markers[1], markers[1] + markers[0], markers[0] + markers[0] + markers[1]]) assert.throws(() => updateReadme(value, snippet), /markers/);
  const original = '# Intro\n\n' + snippet + '\nTail\n';
  const replaced = updateReadme(original, bannerSnippet('NEW', 'different'));
  assert.ok(replaced.startsWith('# Intro\n\n'));
  assert.ok(replaced.endsWith('\nTail\n'));
});
