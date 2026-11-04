import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function markdownFiles(directory) {
  const files = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) files.push(...await markdownFiles(path));
    else if (item.isFile() && item.name.endsWith('.md')) files.push(path);
  }
  return files;
}

function links(source) {
  const prose = source.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
  return [
    ...Array.from(prose.matchAll(/!?\[[^\]]*\]\(\s*(?:<([^>]+)>|([^\s)]+))/g), (m) => m[1] ?? m[2]),
    ...Array.from(prose.matchAll(/\b(?:src|srcset|href)\s*=\s*["']([^"']+)["']/g), (m) => m[1].split(/\s/)[0]),
  ];
}

test('published Markdown links resolve without ignored local caches', async () => {
  const top = (await readdir(root)).filter((name) => name.endsWith('.md')).map((name) => resolve(root, name));
  const files = top.concat(...await Promise.all(['docs', 'examples', 'skills'].map((name) => markdownFiles(resolve(root, name)))));
  let checked = 0;
  for (const file of files) for (const href of links(await readFile(file, 'utf8'))) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) continue;
    const path = decodeURIComponent(href.split(/[?#]/)[0]);
    if (!path) continue;
    const target = resolve(dirname(file), path);
    const local = relative(root, target);
    assert(local !== '..' && !local.startsWith(`..${sep}`), `Outside-repository link in ${relative(root, file)}: ${href}`);
    assert(!local.split(sep).some((part) => ['.verification', 'node_modules', 'dist', '.git'].includes(part)), `Ignored-cache link in ${relative(root, file)}: ${href}`);
    assert(await stat(target).catch(() => null), `Broken link in ${relative(root, file)}: ${href}`);
    checked++;
  }
  assert(checked > 100, 'Documentation and HTML picture sources must both be covered');
});

test('root README retains exactly one generated banner marker pair', async () => {
  const source = await readFile(resolve(root, 'README.md'), 'utf8');
  assert.equal(source.split('<!-- readme-banner:start -->').length - 1, 1);
  assert.equal(source.split('<!-- readme-banner:end -->').length - 1, 1);
  assert(source.indexOf('<!-- readme-banner:start -->') < source.indexOf('<!-- readme-banner:end -->'));
});
