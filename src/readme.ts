import path from 'node:path';

export const START_MARKER = '<!-- readme-banner:start -->';
export const END_MARKER = '<!-- readme-banner:end -->';

export function escapeHtml(input: string): string {
  return input.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;').replace(/'/gu, '&#39;');
}

export function bannerSnippet(title: string, outputDir: string, readme = 'README.md'): string {
  const prefix = path.posix.relative(path.posix.dirname(readme.replace(/\\/gu, '/')), outputDir.replace(/\\/gu, '/'));
  const url = (name: string) => [...(prefix ? prefix.split('/') : []), name].map((part) => encodeURIComponent(part)).join('/');
  return [
    START_MARKER,
    '<picture>',
    `  <source media="(prefers-color-scheme: dark)" srcset="${url('banner.dark.svg')}">`,
    `  <img alt="${escapeHtml(title)}" src="${url('banner.light.svg')}" width="960">`,
    '</picture>',
    END_MARKER,
  ].join('\n');
}

/** Only replace our unambiguous managed block; preserve all other text. */
export function updateReadme(current: string, snippet: string): string {
  const starts = current.split(START_MARKER).length - 1;
  const ends = current.split(END_MARKER).length - 1;
  if (starts === 0 && ends === 0) {
    const bom = current.startsWith('\uFEFF') ? '\uFEFF' : '';
    const body = bom ? current.slice(1) : current;
    const eol = current.includes('\r\n') ? '\r\n' : '\n';
    return `${bom}${snippet.replace(/\n/gu, eol)}${eol}${eol}${body}`;
  }
  const start = current.indexOf(START_MARKER);
  const end = current.indexOf(END_MARKER);
  if (starts !== 1 || ends !== 1 || end < start) {
    throw new Error('README banner markers are incomplete, duplicated, or reversed. Fix them before generating.');
  }
  const eol = current.includes('\r\n') ? '\r\n' : '\n';
  return current.slice(0, start) + snippet.replace(/\n/gu, eol) + current.slice(end + END_MARKER.length);
}
