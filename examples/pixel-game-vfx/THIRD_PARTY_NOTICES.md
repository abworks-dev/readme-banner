# Third-party notices — Repository Foundry

The environment, composition, material masks, typography treatment and orchestration in this example are original work in this repository. The energy-core visual and bitmap glyph designs are existing upstream assets/code; this example does not claim authorship of them. Imported source-code checkouts are local and pinned, not bundled here. The complete unmodified Fusion bitmap font is bundled separately under its own OFL notices. Preserve the original licenses and notices if redistributing them or generated work where applicable.

## Pinned sources

- **claude-pxl** — [21fee41f7ecce00bc868d7567f24ffd0f3acc8fa](https://github.com/crsolver/claude-pxl/tree/21fee41f7ecce00bc868d7567f24ffd0f3acc8fa), MIT, Copyright (c) 2026 crsolver. Scene rendering, tiny built-in labels, PNG encoding.
- **pixelfx** — [a84159688af3ca37a4be05a0d422b94451b2e24e](https://github.com/patch-gg/pixelfx/tree/a84159688af3ca37a4be05a0d422b94451b2e24e), MIT, Copyright (c) 2026 Patch; Copyright (c) 2026 Hugo Duprez. Existing Energy core effect, frame compositing and the core MIT bitmap fonts. The proprietary **Patch Pixel** font in the upstream gallery is NOT used or redistributed.
- **Pixelbolt** — [928287703637dc9d6b646adb1f4d2963fd28f6eb](https://github.com/skulitom/Pixelbolt/tree/928287703637dc9d6b646adb1f4d2963fd28f6eb), MIT, Copyright (c) 2026 PixelForge contributors. APNG encoder. Its pixel data is retained; the example patches exact rational frame timing and recomputes CRCs without editing the upstream source.

## MIT notice

The following notice accompanies the respective copyrights above:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Additional upstream credits

- Energy core's plasma ball follows [Sprite Fusion's open-source energy orb](https://www.spritefusion.com/pixel-art-vfx/energy), MIT, Copyright (c) 2026 Hugo Duprez, as credited in the upstream effect header.
- Upstream pixelfx also includes a [Hollow Crown](https://github.com/rehan-remade/hollow-crown) adaptation in its actor/skill module, Copyright (c) 2026 rehan-remade, MIT. This sample does not use actor playback; retain its notice if redistributing that upstream module.

## Fusion Pixel Font — bundled font data, not MIT

The localized profiles use **Fusion Pixel Font 12px monospaced zh_hans, release 2026.10.25**, Copyright (c) 2022, TakWolf (https://takwolf.com), licensed under **SIL Open Font License 1.1**. The full official BDF is merely losslessly gzip-compressed, with no glyph edits, subsetting, renaming or rasterization. This is separate from the repository's MIT code license.

Preserve the [complete font notice](fonts/LICENSE-OFL.txt) and all inherited notices: [Ark Pixel](fonts/LICENSES/ark-pixel/OFL.txt), [Cubic 11 / JF Dot M+H 12](fonts/LICENSES/cubic-11/OFL.txt), and [Galmuri](fonts/LICENSES/galmuri/LICENSE.txt). The exact official release, source commit, SHA-256 values, and notice hashes are in the [font manifest](fonts/manifest.json); acquisition and coverage are documented in the [font README](fonts/README.md). Generated banner images are not required to be OFL-licensed merely because this font was used.

No external image, image-generation provider, system font or proprietary gallery typeface is used.
