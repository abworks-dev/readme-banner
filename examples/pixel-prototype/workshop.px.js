// Original banner scene authored with the pxl DSL. No image model or remote assets.
// Logical pixels only: exported previews are exact 2x nearest-neighbour copies.
const themes = {
  dark: {
    bg: '#101724', grid: '#182235', panel: '#141e30', edge: '#2d3c55',
    ink: '#edf6ff', muted: '#94a9c2', accent: '#58dec0', accentDark: '#237d79',
    paper: '#d2e5f1', paperShade: '#7f9db8', violet: '#a8a2ef', floor: '#213047',
  },
  light: {
    bg: '#f3eee2', grid: '#e7e0d1', panel: '#eee6d8', edge: '#c2b49e',
    ink: '#233448', muted: '#627485', accent: '#18756e', accentDark: '#265d60',
    paper: '#fffdf6', paperShade: '#c5d0d2', violet: '#66588f', floor: '#d9ceba',
  },
};
for (const [variant, p] of Object.entries(themes)) {
  scene(`workshop-${variant}`, { w: 480, h: 160, bg: p.bg }, (c) => {
    // Restrained blueprint field, not a blur or an anti-aliased illustration.
    for (let y = 10; y < 154; y += 12)
      for (let x = 10; x < 476; x += 12) c.px(x, y, p.grid);
    c.rect(0, 0, 480, 3, p.accentDark);
    c.rect(0, 157, 480, 3, p.accentDark);
    c.rect(18, 20, 3, 9, p.accent);
    c.text(28, 22, 'PROJECT WORKSHOP  /  001', p.muted);

    c.text(29, 48, 'README-BANNER', p.ink, { scale: 4 });
    c.rect(30, 76, 24, 2, p.accent);
    c.text(30, 88, 'ONE CONFIG. EVERY REPOSITORY.', p.muted);
    c.box(28, 109, 54, 15, p.accentDark);
    c.text(36, 114, 'PIXEL', p.accent);
    c.box(89, 109, 72, 15, p.edge);
    c.text(97, 114, 'LOCAL BUILD', p.muted);
    c.text(29, 141, 'NATIVE PIXELS / FIXED SEED / NO API', p.muted);

    // An output stack and pixel conveyor: the scene tells a README-building story.
    c.rect(274, 135, 181, 4, p.floor);
    c.rect(280, 139, 171, 2, p.edge);
    c.poly([280, 106, 311, 106, 318, 112, 318, 130, 280, 130], p.edge);
    c.rect(279, 104, 32, 23, p.paperShade);
    c.rect(276, 100, 32, 23, p.paper);
    c.rect(272, 95, 32, 23, p.paperShade);
    c.rect(270, 91, 32, 23, p.paper);
    c.rect(275, 96, 13, 3, p.accent);
    c.rect(275, 103, 20, 1, p.muted);
    c.rect(275, 107, 15, 1, p.muted);
    c.line(304, 126, 343, 126, p.edge);
    for (let x = 310; x < 341; x += 8) c.rect(x, 124, 3, 5, p.accentDark);

    // Dedicated VFX stage. No logo, title or document is in its receiving region.
    c.rect(324, 19, 128, 116, p.panel);
    c.hline(324, 18, 21, p.edge);
    c.vline(323, 19, 17, p.edge);
    c.hline(432, 18, 20, p.edge);
    c.vline(452, 19, 17, p.edge);
    c.hline(324, 135, 21, p.edge);
    c.vline(323, 118, 17, p.edge);
    c.hline(432, 135, 20, p.edge);
    c.vline(452, 118, 17, p.edge);
    c.text(356, 145, 'POWERED BY PIXELFX', p.muted);
  });
}
