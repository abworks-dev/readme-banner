# Pinned Fusion Pixel bitmap font

This directory vendors the **complete official 12px monospaced zh_hans BDF** from
[Fusion Pixel Font 2026.10.25](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.10.25),
not a hand-written or sample-only Chinese subset. The BDF is merely gzip-compressed:
decompression yields the original 5,332,038 bytes exactly. No rasterization, glyph
editing, subsetting, font installation, new npm dependencies, or runtime font engine
is involved. Rendering reads local bytes only and never downloads a font.

## Source, integrity, and license

- Official source: [TakWolf/fusion-pixel-font](https://github.com/TakWolf/fusion-pixel-font).
- Release: `2026.10.25`; source commit: `3266d59c25c3fa8f8b5e163b29736a706fd9ab6f`.
- [Official BDF archive](https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.10.25/fusion-pixel-font-12px-monospaced-bdf-v2026.10.25.zip),
  entry `fusion-pixel-12px-monospaced-zh_hans.bdf`.
- Archive SHA-256: `d8788cf5ffd6a2dabec397c33c878261195fb9146cdb67d8afd418fe73db15bd`.
- Original BDF SHA-256: `bdb520006cddacccc1d3f780d5fab79007a4d6d1f3559d04665e652af4cdf50f`.
- [Local gzip asset](./fusion-pixel-12px-monospaced-zh_hans-v2026.10.25.bdf.gz):
  652,833 bytes; SHA-256 `41e1910f7836be732d404e01903bbba7d4a4c0bb7b7fa170b72b7976a070d3b9`.
- Machine-readable provenance, metrics, and every notice hash: [manifest](./manifest.json).

**Copyright (c) 2022, TakWolf (https://takwolf.com).** Font Software is distributed
under the **SIL Open Font License, Version 1.1**. The [full upstream notice and
license](./LICENSE-OFL.txt) is preserved verbatim. All additional notices bundled
with this official release are preserved verbatim too:

- [Ark Pixel Font](./LICENSES/ark-pixel/OFL.txt): Copyright (c) 2021, TakWolf (https://takwolf.com).
- [Cubic 11 / JF Dot M+H 12 / M+ Bitmap Fonts](./LICENSES/cubic-11/OFL.txt): includes
  the upstream permission notices, Copyright(c) 2005 M+ FONTS PROJECT, and
  Copyright (C) 2002-2004 COZ.
- [Galmuri](./LICENSES/galmuri/LICENSE.txt): Copyright (c) 2019–2025 Lee Minseo (quiple@quiple.dev).

Keep these full notices with redistributed font data. The shipped data is the
unmodified official BDF, not a renamed or rasterized font derivative. Gzip is only
a lossless transport wrapper; no Reserved Font Name is assigned to a modified font.
Future changes to glyphs, subsetting, or font format must independently respect the
OFL's Modified Version and Reserved Font Name conditions. Generated banner images
are not themselves required to use the OFL.

## Runtime contract

The [pure Node adapter](../fusion-font.mjs) exports `FUSION_FONT` and
`loadFusionFont(path?)`. The optional path is a local copy of the **same pinned
gzip bytes**, not an arbitrary font or a URL. The default font Promise is cached.
Compressed and decompressed SHA-256 values are checked before parsing. The result,
each glyph, and each row array are frozen.

```js
const font = await loadFusionFont();
const glyph = font.glyph('你'.codePointAt(0));
// { width: 11, height: 11, advance: 12, bearingX: 0, bearingY: 9, rows: [...] }
```

- Native pixels: `pixelSize=12`, `ascent=10`, `descent=2`, `lineHeight=12`.
- Latin and ASCII space normally advance 6; Han/fullwidth glyphs normally advance 12.
  Use each glyph's actual `advance`, not character counts or a universal width.
- `rows` are top-to-bottom integer bitmasks, with byte padding removed. Column `x`
  is on when `(rows[y] & (1 << (width - 1 - x))) !== 0`.
- Position the bitmap at `penX + bearingX`, `baseline - bearingY`; advance the pen
  by `advance`. This preserves lowercase descenders and Chinese/Latin baselines.
- Nominal line metrics do not imply an ink bound. The official vertical kana
  repeat marks U+3031/U+3032 have 22px-tall bitmaps (top 15, bottom 7 relative to
  baseline). These are the only glyphs outside the nominal 12px line box. Metadata
  exposes `maxInkAscent=15`, `maxInkDescent=7`; measure actual glyph ink to avoid
  clipping. All other supported glyphs fit ascent 10 / descent 2.
- Missing Unicode scalars, invalid inputs, and the original `.notdef` record at
  U+FFFE return `undefined`. The adapter never substitutes tofu or a system font.
  For example, 😀 and 🚀 are not supported. The caller must reject an unsupported
  input or explicitly choose a documented fallback.
- Strict parser/read limits: 2 MiB compressed, 8 MiB decompressed, 65,536 records,
  32×32 glyph bitmap bounds, 1,024 characters/line, and 1,000,000 lines. Font data
  is parsed as data only; it cannot execute JavaScript or trigger network access.

## Coverage and example metrics

There are 37,857 original records, including `.notdef`, and 37,856 renderable
Unicode scalars: all 95 printable ASCII characters, 19,466 CJK Unified Ideographs
(U+4E00–U+9FFF), 1,777 Extension A ideographs, and 1,760 supplementary-plane glyphs,
plus other scripts and punctuation. This is broad Chinese coverage, not universal
Unicode coverage. Missing rare characters must still be handled explicitly.

| Text | Advance at 1× | Ink above/below baseline |
| --- | ---: | ---: |
| 你好，像素世界！ | 96 | 9 / 2 |
| 你好 Pixel 世界 2026! | 126 | 9 / 2 |
| 开源项目 Readme Banner | 132 | 9 / 2 |
| 中文 English 混合排版 | 126 | 9 / 2 |

## Verification and reproducible acquisition

From the repository root, run the offline verification:

```sh
node examples/pixel-game-vfx/fonts/verify-font.mjs
```

It verifies both font hashes and all four license hashes, scans every Unicode
scalar and every bitmap row, verifies mixed Chinese/English advances and baseline
metrics, and rejects 11 malformed BDF cases. Network fetch is disabled during this
verification. It also tests immutable glyphs, shared loading, unsupported emoji,
`.notdef` rejection, local-only paths, and rejection of changed bytes.

The [maintenance-only acquisition script](./acquire-fusion-font.mjs) downloads the
exact official archive, checks its SHA-256 before reading its ZIP directory, and
copies only explicitly named font/license entries. It never extracts archive
paths. It preserves all glyphs and all four notice files and emits the manifest.
The rendering adapter never imports this script.

```sh
node examples/pixel-game-vfx/fonts/acquire-fusion-font.mjs
# Optional: inspect/use a separately downloaded, hash-verified official archive.
node examples/pixel-game-vfx/fonts/acquire-fusion-font.mjs --archive=/path/to/release.zip --inspect
```

The pinned gzip was produced with Node `v24.22.1`, zlib
`1.3.2.1-motley-285e94b`, gzip level 9 (zero timestamp). Acquisition fails rather
than silently changing bytes if another compression version emits a different
stream. The original BDF SHA-256 remains the cross-version source-of-truth;
rendering from the committed compressed asset needs no compression toolchain.
