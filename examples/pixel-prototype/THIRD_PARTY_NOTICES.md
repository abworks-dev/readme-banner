# Third-party notices for the local pixel prototype

This example imports pinned local source checkouts; it does not bundle their implementation files or add them to the project's npm dependencies. Keep the original licenses/notices with any future redistribution or vendoring. The scene and layout are authored in this repository; the energy-core visual is generated using pixelfx's existing effect.

## Sources and scopes

- **pxl / claude-pxl** — https://github.com/crsolver/claude-pxl/tree/21fee41f7ecce00bc868d7567f24ffd0f3acc8fa — MIT, Copyright (c) 2026 crsolver. Used for scene rendering, built-in bitmap text, PNG and GIF encoding.
- **pixelfx** — https://github.com/patch-gg/pixelfx/tree/a84159688af3ca37a4be05a0d422b94451b2e24e — MIT, Copyright (c) 2026 Patch; Copyright (c) 2026 Hugo Duprez. Used for the energy-core effect and frame compositing.
- **Pixelbolt** — https://github.com/skulitom/Pixelbolt/tree/928287703637dc9d6b646adb1f4d2963fd28f6eb — MIT, Copyright (c) 2026 PixelForge contributors. Used for APNG encoding only.

## MIT permission and warranty notice

The following notice accompanies each respective copyright above:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Upstream pixelfx notices

The pinned pixelfx source includes these notices:

- **Hugo Duprez.** `src/core/sim.js` and effects marked at their file headers adapt Sprite Fusion's open-source pixel art VFX (https://www.spritefusion.com/pixel-art-vfx), Copyright (c) 2026 Hugo Duprez, MIT License. The energy-core header credits its plasma-ball inspiration here.
- **Hollow Crown.** `src/core/act.js` adapts skill playback from https://github.com/rehan-remade/hollow-crown, Copyright (c) 2026 rehan-remade, MIT License. The prototype does not use actor/skill playback; retain this notice if redistributing that upstream module.
- **Patch Pixel.** The font in pixelfx's `gallery/fonts` is Patch's own and is not covered by the repository's MIT license. This prototype does **not** use or redistribute it; its lettering comes from pxl's built-in 3×5 bitmap font.
