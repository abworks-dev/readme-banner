// Maintenance-only acquisition: rendering never imports this network-enabled script.
// Run with Node 22+; no packages, global fonts, rasterizers, or system fonts required.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync, inflateRawSync } from 'node:zlib';

const RELEASE = '2026.10.25';
const ARCHIVE_URL = `https://github.com/TakWolf/fusion-pixel-font/releases/download/${RELEASE}/fusion-pixel-font-12px-monospaced-bdf-v${RELEASE}.zip`;
const ARCHIVE_SHA256 = 'd8788cf5ffd6a2dabec397c33c878261195fb9146cdb67d8afd418fe73db15bd';
const MAX_ARCHIVE_BYTES = 48 * 1024 * 1024;
const MAX_ENTRY_BYTES = 32 * 1024 * 1024;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function fetchBytes(url, maxBytes) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status} for ${url}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > maxBytes) throw new Error(`Download exceeds ${maxBytes} bytes`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function entries(zip) {
  // Read only this pinned ZIP's central directory; never extract paths from it.
  let end = -1;
  for (let pos = zip.length - 22; pos >= Math.max(0, zip.length - 65_557); pos--) {
    if (zip.readUInt32LE(pos) === 0x06054b50) { end = pos; break; }
  }
  if (end < 0 || zip.readUInt16LE(end + 4) !== 0 || zip.readUInt16LE(end + 6) !== 0) {
    throw new Error('Unsupported ZIP end/disk layout');
  }
  const count = zip.readUInt16LE(end + 10);
  const directorySize = zip.readUInt32LE(end + 12);
  let pos = zip.readUInt32LE(end + 16);
  if (count > 100 || pos + directorySize !== end) throw new Error('Invalid ZIP central directory');
  const result = [];
  for (let index = 0; index < count; index++) {
    if (pos + 46 > end || zip.readUInt32LE(pos) !== 0x02014b50) throw new Error('Invalid ZIP entry');
    const nameLength = zip.readUInt16LE(pos + 28);
    const extraLength = zip.readUInt16LE(pos + 30);
    const commentLength = zip.readUInt16LE(pos + 32);
    const next = pos + 46 + nameLength + extraLength + commentLength;
    if (next > end) throw new Error('Truncated ZIP entry');
    result.push({
      name: zip.toString('utf8', pos + 46, pos + 46 + nameLength),
      flags: zip.readUInt16LE(pos + 8),
      method: zip.readUInt16LE(pos + 10),
      compressedSize: zip.readUInt32LE(pos + 20),
      size: zip.readUInt32LE(pos + 24),
      offset: zip.readUInt32LE(pos + 42),
    });
    pos = next;
  }
  if (pos !== end) throw new Error('ZIP directory size mismatch');
  return result;
}

function extract(zip, entry) {
  const offset = entry.offset;
  if (entry.flags & 1 || entry.size > MAX_ENTRY_BYTES || offset + 30 > zip.length ||
      zip.readUInt32LE(offset) !== 0x04034b50) throw new Error('Unsupported ZIP payload');
  const start = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
  if (start + entry.compressedSize > zip.length) throw new Error('Truncated ZIP payload');
  const compressed = zip.subarray(start, start + entry.compressedSize);
  const bytes = entry.method === 0 ? compressed : entry.method === 8
    ? inflateRawSync(compressed, { maxOutputLength: MAX_ENTRY_BYTES }) : undefined;
  if (!bytes || bytes.length !== entry.size) throw new Error('ZIP payload size/method mismatch');
  return bytes;
}

async function acquire() {
  const cachedPath = process.argv.find(value => value.startsWith('--archive='))?.slice(10);
  const archive = cachedPath ? await readFile(cachedPath) : await fetchBytes(ARCHIVE_URL, MAX_ARCHIVE_BYTES);
  if (archive.length > MAX_ARCHIVE_BYTES || sha256(archive) !== ARCHIVE_SHA256) {
    throw new Error('Official release archive SHA-256 mismatch');
  }
  const files = entries(archive);
  console.log(JSON.stringify(files.map(({ name, size }) => ({ name, size })), null, 2));
  if (process.argv.includes('--inspect')) return;
  const fontEntry = files.find(entry => /(?:^|\/)fusion-pixel-12px-monospaced-zh_hans\.bdf$/.test(entry.name));
  if (!fontEntry) throw new Error('Official zh_hans BDF not found');
  const font = extract(archive, fontEntry);
  if (sha256(font) !== 'bdb520006cddacccc1d3f780d5fab79007a4d6d1f3559d04665e652af4cdf50f') {
    throw new Error('Official BDF SHA-256 mismatch');
  }
  const licensePaths = [
    ['OFL.txt', 'LICENSE-OFL.txt'],
    ['LICENSES/ark-pixel/OFL.txt', 'LICENSES/ark-pixel/OFL.txt'],
    ['LICENSES/cubic-11/OFL.txt', 'LICENSES/cubic-11/OFL.txt'],
    ['LICENSES/galmuri/LICENSE.txt', 'LICENSES/galmuri/LICENSE.txt'],
  ];
  const licenses = licensePaths.map(([source, destination]) => {
    const entry = files.find(value => value.name === source);
    if (!entry) throw new Error(`Missing official license: ${source}`);
    const bytes = extract(archive, entry);
    if (!bytes.toString('utf8').includes('SIL OPEN FONT LICENSE Version 1.1')) {
      throw new Error(`Expected full SIL Open Font License 1.1: ${source}`);
    }
    return { source, destination, bytes };
  });
  const compressed = gzipSync(font, { level: 9 });
  if (sha256(compressed) !== '41e1910f7836be732d404e01903bbba7d4a4c0bb7b7fa170b72b7976a070d3b9') {
    throw new Error('Compressed bytes differ from pinned asset; use documented Node/zlib version');
  }
  const filename = `fusion-pixel-12px-monospaced-zh_hans-v${RELEASE}.bdf.gz`;
  await writeFile(new URL(filename, import.meta.url), compressed);
  for (const license of licenses) {
    const destination = new URL(license.destination, import.meta.url);
    await mkdir(new URL('./', destination), { recursive: true });
    await writeFile(destination, license.bytes);
  }
  const manifest = {
    schemaVersion: 1,
    id: `fusion-pixel-12px-monospaced-zh_hans@${RELEASE}`,
    family: 'Fusion Pixel 12px Mono zh_Hans',
    license: 'SIL Open Font License 1.1',
    copyright: 'Copyright (c) 2022, TakWolf (https://takwolf.com)',
    source: {
      repository: 'https://github.com/TakWolf/fusion-pixel-font',
      release: RELEASE,
      commit: '3266d59c25c3fa8f8b5e163b29736a706fd9ab6f',
      releaseUrl: `https://github.com/TakWolf/fusion-pixel-font/releases/tag/${RELEASE}`,
      archiveUrl: ARCHIVE_URL,
      archiveBytes: archive.length,
      archiveSha256: ARCHIVE_SHA256,
      archiveEntry: fontEntry.name,
      bdfBytes: font.length,
      bdfSha256: sha256(font),
    },
    asset: { filename, format: 'BDF 2.1, losslessly gzip-compressed', bytes: compressed.length,
      sha256: sha256(compressed), glyphCount: 37857, pixelSize: 12, ascent: 10, descent: 2,
      lineHeight: 12, halfwidthAdvance: 6, fullwidthAdvance: 12,
      maxInkAscent: 15, maxInkDescent: 7, oversizedGlyphs: ['U+3031', 'U+3032'] },
    conversion: {
      kind: 'Lossless compression only; no glyphs subsetted, renamed, rasterized, or changed',
      command: 'node examples/pixel-game-vfx/fonts/acquire-fusion-font.mjs',
      node: 'v24.22.1', zlib: '1.3.2.1-motley-285e94b', gzipLevel: 9,
    },
    notices: licenses.map(({ source, destination, bytes }) => ({
      archiveEntry: source, filename: destination, bytes: bytes.length, sha256: sha256(bytes),
    })),
  };
  await writeFile(new URL('manifest.json', import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify(manifest, null, 2));
}

await acquire();
