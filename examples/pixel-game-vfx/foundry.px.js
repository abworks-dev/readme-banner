// Repository Foundry: a room, not a UI / VFX preview card.
// Native logical pixels throughout; no blur, random texture, image imports or animation.
// Integration: official energy-core origin (355, 119), actual core around (355, 83).
// Effect support: x306..403 / y34..134; its own plinth occupies approximately y109..121.
// Keep x285..421 / y16..119 clear; tiny plinth standoffs bridge y120..122.
// The low receiving platform begins at y123.
// The renderer supplies the 5x7, scale-2 README-BANNER headline at approximately (27, 52).
// Only the two small, fixed, 3x5 scale-1 labels below are authored here.

const foundryThemes = {
  dark: {
    air: ['#0d121c', '#101722', '#121b27', '#16212c'],
    wall: ['#101722', '#17212c', '#1c2935', '#263441'],
    steel: ['#0b121b', '#18232e', '#293a49', '#435968', '#718895', '#a7bdc4'],
    floor: ['#0d141e', '#18232d', '#21313e', '#344654'],
    bronze: ['#28252a', '#51434a', '#81675e', '#b3987c', '#d3bea0'],
    plate: ['#23313c', '#3d505b', '#637984', '#8fa3a8', '#bccbc9'],
    violet: ['#302638', '#59425d', '#a67499', '#d6a7c7'],
    label: '#839aab', tiny: '#61788b', cold: '#91b1bc',
  },
  light: {
    air: ['#d7d9d5', '#e1e2da', '#e7e5db', '#ede9de'],
    wall: ['#d3d7d2', '#c9ceca', '#bfc8c5', '#b0bcb9'],
    steel: ['#374a53', '#596d75', '#82969b', '#a6b7b8', '#cdd6d0', '#f5f2df'],
    floor: ['#a7b2ad', '#b8c0b8', '#ced0c3', '#dde0d1'],
    bronze: ['#625954', '#8d7966', '#b49d7c', '#d7c3a0', '#eee1bf'],
    plate: ['#657a80', '#90a2a5', '#b5c2bd', '#d7ddd1', '#faf5df'],
    violet: ['#827580', '#a08c9e', '#c1a4b8', '#e7cad9'],
    label: '#586e79', tiny: '#72858a', cold: '#edf3e6',
  },
};

// A pixel polyline: hard 1px highlights over narrow, physical cable silhouettes.
function foundryPath(c, points, color, width = 1) {
  for (let i = 0; i < points.length - 2; i += 2)
    c.line(points[i], points[i + 1], points[i + 2], points[i + 3], color, width);
}

function foundryRoom(c, p, labels = true) {
  const s = p.steel;
  const f = p.floor;
  const b = p.bronze;
  const a = p.plate;

  // Quiet atmospheric depth. Broad, nearly adjacent value bands, never a grid.
  c.rect(0, 0, 480, 24, p.air[0]);
  c.rect(0, 24, 480, 47, p.air[1]);
  c.rect(0, 71, 480, 33, p.air[2]);
  c.rect(0, 104, 480, 16, p.air[3]);
  // A distant masonry return below the text, not a panel around it.
  c.poly([0, 108, 15, 108, 15, 113, 182, 113, 182, 117, 251, 117,
    251, 126, 0, 126], p.wall[1]);
  c.hline(16, 112, 165, p.wall[2]);
  c.hline(184, 116, 66, p.wall[2]);

  // Receding overhead service girder: broken silhouette and thin machined lips.
  c.poly([0, 0, 290, 0, 290, 7, 281, 7, 281, 14, 247, 14,
    247, 11, 0, 11], s[1]);
  c.hline(0, 10, 247, s[2]);
  c.hline(248, 13, 32, s[3]);
  c.hline(0, 2, 276, s[2]);
  c.hline(0, 3, 220, p.wall[2]);
  for (const x of [43, 109, 190, 247]) {
    c.rect(x, 0, 4, 10, s[0]);
    c.vline(x + 4, 1, 8, s[3]);
    c.px(x + 2, 4, s[3]);
  }
  c.rect(8, 11, 7, 106, p.wall[0]);
  c.vline(15, 13, 93, p.wall[2]);
  c.rect(0, 12, 5, 111, s[1]);
  c.vline(5, 18, 100, s[2]);
  // A conduit leaves the girder and enters the archive tower; it never crosses the hero.
  foundryPath(c, [264, 14, 264, 24, 272, 32, 272, 41], s[0], 4);
  foundryPath(c, [263, 14, 263, 25, 270, 32, 270, 40], b[1]);
  foundryPath(c, [266, 15, 266, 23, 274, 31, 274, 40], s[3]);

  // Small archive machinery is on the seam between the empty title wall and open air.
  // Its drawers are physical dark slots, not HUD / menu controls.
  c.poly([252, 48, 258, 42, 275, 42, 281, 48, 281, 122,
    252, 122], s[0]);
  c.poly([253, 49, 258, 44, 273, 44, 273, 119, 253, 119], s[2]);
  c.poly([274, 44, 280, 49, 280, 119, 274, 119], s[1]);
  c.hline(258, 43, 15, s[4]);
  c.vline(253, 50, 67, s[3]);
  c.vline(273, 46, 71, s[3]);
  for (const y of [53, 71, 89, 107]) {
    c.rect(257, y, 13, 9, s[0]);
    c.hline(257, y, 13, s[3]);
    c.hline(258, y + 1, 10, s[1]);
    c.hline(258, y + 7, 10, s[2]);
    c.rect(260, y + 4, 4, 1, a[2]);
    c.px(269, y + 4, s[3]);
    c.px(278, y + 5, s[2]);
  }
  c.rect(260, 38, 9, 4, s[0]);
  c.hline(261, 39, 6, b[3]);
  c.hline(261, 40, 6, b[1]);
  c.rect(256, 119, 24, 5, s[1]);
  c.hline(256, 119, 23, s[3]);

  // Far-right service wall: asymmetric and cropped by the room edge, not a VFX box.
  c.poly([454, 0, 480, 0, 480, 123, 444, 123, 444, 32,
    449, 32, 449, 18, 454, 18], p.wall[1]);
  c.poly([461, 0, 480, 0, 480, 120, 458, 120, 458, 28,
    461, 28], s[1]);
  c.vline(458, 29, 89, s[3]);
  c.vline(460, 31, 86, s[0]);
  c.rect(428, 0, 52, 8, s[1]);
  c.hline(431, 8, 49, s[3]);
  c.rect(441, 9, 39, 6, s[0]);
  c.hline(443, 14, 37, s[2]);
  // Paired metal pipes have a 1px lit shoulder, a broad midtone and a dark return.
  c.rect(435, 31, 7, 82, s[0]);
  c.rect(436, 32, 4, 79, s[2]);
  c.vline(436, 33, 76, s[4]);
  c.vline(439, 34, 76, s[1]);
  c.poly([435, 29, 440, 24, 457, 24, 457, 30, 443, 30,
    442, 32, 435, 32], s[1]);
  foundryPath(c, [436, 29, 441, 25, 456, 25], s[4]);
  c.poly([435, 109, 442, 109, 442, 116, 449, 122, 448, 128,
    442, 128, 435, 119], s[1]);
  foundryPath(c, [436, 110, 436, 117, 444, 124], s[3]);
  for (const y of [42, 78, 105]) {
    c.rect(433, y, 11, 3, s[0]);
    c.hline(433, y, 10, s[3]);
    c.px(442, y + 1, s[4]);
  }
  c.rect(468, 20, 6, 99, s[0]);
  c.rect(469, 20, 3, 98, b[1]);
  c.vline(469, 20, 96, b[3]);
  c.vline(472, 21, 95, b[0]);
  for (const y of [31, 65, 100]) {
    c.rect(466, y, 10, 4, s[1]);
    c.hline(467, y, 8, s[4]);
    c.px(474, y + 2, s[0]);
  }
  // Louvered maintenance housing recedes behind the pipework.
  c.rect(447, 44, 10, 48, s[0]);
  c.vline(447, 44, 47, s[2]);
  for (let y = 48; y <= 86; y += 6) {
    c.hline(450, y, 6, s[3]);
    c.hline(450, y + 1, 6, s[1]);
  }

  // A continuous floor under everything. Sparse seams follow the room perspective.
  c.rect(0, 124, 480, 36, f[1]);
  c.poly([0, 124, 244, 124, 263, 136, 480, 136, 480, 160,
    0, 160], f[2]);
  c.poly([0, 149, 152, 149, 163, 154, 268, 154, 275, 160,
    0, 160], f[1]);
  c.poly([414, 124, 480, 124, 480, 131, 427, 131], f[3]);
  foundryPath(c, [28, 159, 56, 144, 112, 144], f[0]);
  foundryPath(c, [30, 159, 57, 145, 111, 145], f[3]);
  foundryPath(c, [151, 159, 170, 148, 223, 148], f[0]);
  foundryPath(c, [154, 159, 171, 149, 221, 149], f[3]);
  foundryPath(c, [389, 159, 406, 151, 479, 151], f[0]);
  c.hline(407, 152, 72, f[3]);

  // Foreground transfer bed with a genuine top plane, fascia and supporting feet.
  c.rect(10, 144, 13, 16, s[0]);
  c.rect(12, 145, 7, 15, s[2]);
  c.vline(12, 146, 13, s[3]);
  c.rect(206, 142, 12, 18, s[0]);
  c.rect(208, 144, 6, 16, s[1]);
  c.vline(208, 145, 14, s[3]);
  c.poly([0, 130, 213, 130, 226, 136, 226, 145, 217, 150,
    0, 150], s[0]);
  c.poly([0, 133, 213, 133, 224, 138, 217, 143, 0, 143], s[2]);
  c.poly([0, 125, 205, 125, 219, 131, 219, 135, 0, 135], s[3]);
  c.hline(0, 125, 205, s[4]);
  foundryPath(c, [206, 126, 218, 131, 218, 134], s[5]);
  c.hline(0, 135, 218, s[0]);
  c.hline(0, 136, 211, s[4]);
  c.hline(0, 143, 216, s[1]);
  c.hline(0, 145, 214, s[2]);
  for (const x of [31, 77, 126, 177]) {
    c.rect(x, 139, 19, 2, s[0]);
    c.hline(x + 1, 141, 17, s[3]);
    c.px(x - 5, 138, s[4]);
    c.px(x - 5, 139, s[0]);
  }
  // A narrow bronze roller guide: highlights, not a saturated accent strip.
  c.hline(16, 128, 139, b[1]);
  c.hline(17, 129, 137, b[3]);
  c.hline(17, 130, 137, b[0]);
  for (const x of [25, 55, 85, 115, 145]) {
    c.rect(x, 127, 2, 5, s[1]);
    c.vline(x, 127, 4, s[4]);
  }

  // An archive master plate on the transfer bed: clipped corners, folded return,
  // three engraved strokes and a recessed spine instead of flat paper rectangles.
  c.poly([167, 121, 190, 121, 204, 128, 204, 136, 179, 136,
    167, 130], s[0]);
  c.poly([168, 119, 190, 119, 201, 125, 201, 132, 179, 132,
    168, 126], a[1]);
  c.poly([168, 119, 190, 119, 201, 125, 179, 125], a[3]);
  foundryPath(c, [168, 119, 189, 119, 199, 124], a[4]);
  c.poly([179, 126, 201, 126, 201, 132, 179, 132], a[2]);
  c.hline(180, 132, 20, a[0]);
  c.line(170, 121, 177, 124, a[1]);
  c.hline(176, 121, 10, a[1]);
  c.hline(181, 123, 10, a[2]);
  // Small engraved code-angle marks on the master plate's vertical return.
  foundryPath(c, [185, 127, 183, 129, 185, 131], a[0]);
  foundryPath(c, [193, 127, 195, 129, 193, 131], a[0]);
  c.hline(188, 129, 3, a[1]);
  c.px(198, 128, a[4]);
  c.vline(178, 126, 5, a[4]);

  // Two narrow, faceted standoffs join the native plinth's underside to the casting.
  // Drawn before the casting, so their foot flanges disappear behind its top plane.
  for (const x of [334, 371]) {
    c.poly([x, 120, x + 5, 120, x + 5, 124, x + 7, 124,
      x + 7, 126, x - 1, 126, x - 1, 124, x, 124], s[2]);
    c.hline(x, 120, 4, s[4]);
    c.vline(x, 121, 4, s[3]);
    c.vline(x + 4, 121, 3, s[1]);
  }

  // Low reactor foundation: a broad chamfered casting physically joins the floor.
  // Nothing passes in front of the native effect; standoffs stay below its plinth.
  c.poly([313, 145, 326, 145, 326, 154, 313, 154], s[0]);
  c.poly([386, 145, 399, 145, 399, 154, 386, 154], s[0]);
  c.hline(314, 152, 10, s[3]);
  c.hline(387, 152, 10, s[3]);
  c.poly([299, 132, 318, 139, 394, 139, 412, 132, 412, 142,
    394, 150, 318, 150, 299, 142], s[0]);
  c.poly([301, 134, 319, 141, 393, 141, 410, 134, 410, 140,
    393, 147, 319, 147, 301, 140], s[2]);
  c.poly([318, 141, 394, 141, 394, 147, 318, 147], s[1]);
  c.poly([318, 123, 394, 123, 412, 129, 412, 134, 394, 141,
    318, 141, 299, 134, 299, 129], s[3]);
  c.poly([320, 125, 392, 125, 406, 130, 392, 136, 320, 136,
    305, 130], s[2]);
  c.poly([333, 128, 379, 128, 390, 132, 379, 136, 333, 136,
    321, 132], s[1]);
  c.hline(320, 123, 73, s[4]);
  foundryPath(c, [300, 129, 318, 124], s[4]);
  foundryPath(c, [394, 124, 411, 129], s[4]);
  foundryPath(c, [300, 134, 318, 140, 393, 140, 410, 134], s[5]);
  c.hline(321, 146, 71, s[3]);
  // The inset starts below the native effect's last solid sparks at y127.
  c.hline(333, 128, 46, p.violet[1]);
  c.hline(339, 129, 34, p.violet[2]);
  c.hline(334, 136, 44, p.violet[0]);
  for (const x of [324, 337, 372, 385]) {
    c.rect(x, 143, 5, 2, s[0]);
    c.hline(x, 143, 5, s[3]);
  }
  for (const x of [316, 392]) {
    c.hline(x, 130, 3, s[0]);
    c.px(x, 129, s[5]);
  }

  // Floor-level braided power leads connect the tower, casting and foreground bed.
  // Each lead has a dark contact silhouette and one unbroken metallic shoulder.
  const leads = [
    [300, 142, 291, 142, 284, 148, 265, 148, 257, 153, 235, 153],
    [300, 145, 292, 145, 285, 151, 267, 151, 259, 157, 235, 157],
    [277, 123, 277, 130, 271, 136, 251, 136, 245, 142, 227, 142],
  ];
  for (const points of leads) foundryPath(c, points, s[0], 3);
  foundryPath(c, leads[0], b[2]);
  foundryPath(c, leads[1], s[3]);
  foundryPath(c, leads[2], b[1]);
  c.rect(281, 147, 5, 9, s[0]);
  c.vline(282, 148, 7, s[3]);
  c.rect(245, 150, 4, 9, s[0]);
  c.vline(246, 151, 7, s[3]);

  // Lower-right archive blanks are thick, angled, document-etched metal sheets.
  // The stepped corners, folded spine and narrow edges make their thickness legible.
  c.poly([419, 139, 450, 133, 474, 141, 474, 153, 443, 159,
    419, 151], s[0]);
  c.poly([420, 140, 449, 135, 472, 142, 472, 151, 443, 156,
    420, 149], a[1]);
  c.poly([420, 140, 449, 135, 472, 142, 443, 148], a[2]);
  foundryPath(c, [420, 140, 443, 147, 471, 142], a[4]);
  c.line(443, 148, 443, 155, a[0]);
  c.line(447, 150, 468, 146, a[0]);
  c.line(447, 153, 468, 149, a[2]);
  // The upper plate has a different cut and an exposed, rolled bronze binding.
  c.poly([425, 132, 447, 128, 466, 134, 470, 139, 442, 145,
    423, 138, 423, 134], a[0]);
  c.poly([425, 130, 446, 126, 465, 132, 465, 137, 441, 142,
    423, 136, 423, 132], a[2]);
  c.poly([425, 130, 446, 126, 465, 132, 441, 137, 423, 132], a[3]);
  foundryPath(c, [425, 130, 446, 126, 464, 132], a[4]);
  c.line(424, 133, 440, 138, b[3]);
  c.line(424, 135, 440, 140, b[0]);
  c.line(441, 138, 463, 134, a[0]);
  c.line(441, 140, 462, 136, a[1]);
  c.line(433, 130, 445, 128, a[1]);
  c.line(438, 132, 452, 130, a[1]);
  c.line(443, 134, 454, 132, a[2]);
  c.px(428, 132, a[4]);
  c.px(460, 133, a[4]);

  // The cropped nearest rail strengthens depth without an enclosing outer frame.
  c.poly([0, 156, 88, 156, 95, 160, 0, 160], s[0]);
  c.hline(0, 156, 87, s[3]);
  c.poly([461, 157, 480, 151, 480, 160, 461, 160], s[0]);
  c.line(462, 156, 479, 151, s[3]);

  if (labels) {
    c.text(27, 25, 'THE REPOSITORY FOUNDRY', p.label, { scale: 1 });
    c.text(27, 101, 'ONE CONFIG. EVERY REPOSITORY.', p.label, { scale: 1 });
  }
}

for (const [variant, palette] of Object.entries(foundryThemes)) {
  scene(`foundry-${variant}`, { w: 480, h: 160, bg: palette.air[1] },
    (c) => foundryRoom(c, palette));
  // Localized text is authored once on an actual unlabeled room, never painted over old glyphs.
  scene(`foundry-${variant}-unlabeled`, { w: 480, h: 160, bg: palette.air[1] },
    (c) => foundryRoom(c, palette, false));
}

// Binary, material-aware integration masks. Neither mask is visible artwork.
// WHITE = exposed receiver / protected shadow; BLACK = not in that mask.
// They use the exact scene geometry, not a threshold on dark material colors.
scene('foundry-receivers', { w: 480, h: 160, bg: '#000000' }, (c) => {
  const yes = '#ffffff';
  const no = '#000000';
  // Casting top and its upper chamfer, excluding the recessed well and bolt holes.
  c.poly([318, 123, 394, 123, 412, 129, 412, 134, 394, 141,
    318, 141, 299, 134, 299, 129], yes);
  c.poly([333, 128, 379, 128, 390, 132, 379, 136, 333, 136,
    321, 132], no);
  c.hline(334, 136, 44, no);
  for (const x of [316, 392]) c.hline(x, 130, 3, no);
  // The standoffs' exposed upper lips and 1px shoulders, not their darker side facets.
  // No new protected area here: native effect sparks can pass in front of the supports.
  for (const x of [334, 371]) {
    c.hline(x, 120, 4, yes);
    c.vline(x, 121, 2, yes);
  }
  // Archive tower upper-facing drawer lips only: every dark drawer interior stays dark.
  c.hline(258, 43, 15, yes);
  for (const y of [53, 71, 89, 107]) c.hline(257, y, 13, yes);
  c.hline(256, 119, 23, yes);
  // Pipe elbow and collar upper lips; not the dark pipe returns or their contact shadows.
  foundryPath(c, [436, 29, 441, 25, 456, 25], yes);
  for (const y of [42, 78, 105]) c.hline(433, y, 10, yes);
  for (const y of [31, 65, 100]) c.hline(467, y, 8, yes);
  // Pipe returns take priority where their dark 1px edge meets a collar lip.
  for (const y of [42, 78, 105]) c.px(439, y, no);
  for (const y of [31, 65, 100]) c.px(472, y, no);
  // Sheet top planes. Subtract the foreground sheet's complete silhouette first.
  c.poly([420, 140, 449, 135, 472, 142, 443, 148], yes);
  c.poly([425, 132, 447, 128, 466, 134, 470, 139, 442, 145,
    423, 138, 423, 134], no);
  c.poly([425, 130, 446, 126, 465, 132, 465, 137, 441, 142,
    423, 136, 423, 132], no);
  c.poly([425, 130, 446, 126, 465, 132, 441, 137, 423, 132], yes);
  // Etched grooves are not illuminated upper material surfaces.
  c.line(433, 130, 445, 128, no);
  c.line(438, 132, 452, 130, no);
  c.line(443, 134, 454, 132, no);
});

scene('foundry-protected', { w: 480, h: 160, bg: '#000000' }, (c) => {
  const yes = '#ffffff';
  const no = '#000000';
  // Foot pads, contact silhouette and the entire downward-facing casting extrusion.
  c.rect(313, 145, 13, 9, yes);
  c.rect(386, 145, 13, 9, yes);
  c.poly([299, 132, 318, 139, 394, 139, 412, 132, 412, 142,
    394, 150, 318, 150, 299, 142], yes);
  // A top plane is not a shadow: remove it, then restore its actual recessed voids.
  c.poly([318, 123, 394, 123, 412, 129, 412, 134, 394, 141,
    318, 141, 299, 134, 299, 129], no);
  c.poly([333, 128, 379, 128, 390, 132, 379, 136, 333, 136,
    321, 132], yes);
  c.hline(334, 136, 44, yes);
  for (const x of [316, 392]) c.hline(x, 130, 3, yes);
  // Cable contact silhouettes. Their thin metallic shoulders are not shadow pixels.
  const leads = [
    [300, 142, 291, 142, 284, 148, 265, 148, 257, 153, 235, 153],
    [300, 145, 292, 145, 285, 151, 267, 151, 259, 157, 235, 157],
    [277, 123, 277, 130, 271, 136, 251, 136, 245, 142, 227, 142],
  ];
  for (const points of leads) foundryPath(c, points, yes, 3);
  for (const points of leads) foundryPath(c, points, no);
  c.rect(281, 147, 5, 9, yes);
  c.rect(245, 150, 4, 9, yes);
  c.vline(282, 148, 7, no);
  c.vline(246, 151, 7, no);
  // Archive slots and pipe dark returns; the actual bright lip remains unprotected.
  for (const y of [53, 71, 89, 107]) {
    c.rect(257, y + 1, 13, 8, yes);
    c.rect(260, y + 4, 4, 1, no);
    c.px(269, y + 4, no);
  }
  c.vline(439, 34, 76, yes);
  c.vline(472, 21, 95, yes);
  // Thick plate undersides and their ground-contact silhouette, not top-facing metal.
  c.poly([419, 139, 450, 133, 474, 141, 474, 153, 443, 159,
    419, 151], yes);
  c.poly([420, 140, 449, 135, 472, 142, 443, 148], no);
  c.poly([425, 132, 447, 128, 466, 134, 470, 139, 442, 145,
    423, 138, 423, 134], yes);
  c.poly([425, 130, 446, 126, 465, 132, 465, 137, 441, 142,
    423, 136, 423, 132], yes);
  c.poly([425, 130, 446, 126, 465, 132, 441, 137, 423, 132], no);
  c.line(433, 130, 445, 128, yes);
  c.line(438, 132, 452, 130, yes);
  c.line(443, 134, 454, 132, yes);
});
