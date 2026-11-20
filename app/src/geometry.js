// geometry.js — panel geometry for every layout in every post size.
//
// A panel is a quad: four [x, y] corners in unit space (0..1 across the
// cover). Rectangles are quads too; the comic layouts lean their corners
// so the gutters slant. Each size gets its own hand-tuned arrangement —
// a portrait cover is composed, not a landscape cover squeezed.

const R = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// A quad leaning right as it descends (parallelogram panels).
const lean = (x, y, w, h, dx) => [[x, y], [x + w, y], [x + w + dx, y + h], [x + dx, y + h]];
// A quad whose top edge sits higher at the right (slanted gutter rows).
const tilt = (x, y, w, h, rise) => [[x, y + rise], [x + w, y], [x + w, y + h], [x, y + h + rise]];

function gridPanels(cols, rows, gap) {
  const out = [];
  const cw = (1 - gap * (cols + 1)) / cols;
  const ch = (1 - gap * (rows + 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out.push(R(gap + c * (cw + gap), gap + r * (ch + gap), cw, ch));
    }
  }
  return out;
}

const LANDSCAPE = {
  hero: [
    R(0, 0, 0.5, 1),
    R(0.515, 0, 0.485, 0.32),
    R(0.515, 0.34, 0.235, 0.32), R(0.765, 0.34, 0.235, 0.32),
    R(0.515, 0.68, 0.235, 0.32), R(0.765, 0.68, 0.235, 0.32),
  ],
  heroRight: [
    R(0.5, 0, 0.5, 1),
    R(0, 0, 0.485, 0.32),
    R(0, 0.34, 0.235, 0.32), R(0.25, 0.34, 0.235, 0.32),
    R(0, 0.68, 0.235, 0.32), R(0.25, 0.68, 0.235, 0.32),
  ],
  slant: [
    lean(0, 0, 0.3, 1, -0.03),
    lean(0.315, 0, 0.265, 0.49, -0.015), lean(0.30, 0.51, 0.265, 0.49, -0.015),
    lean(0.595, 0, 0.405, 0.30, -0.008), lean(0.587, 0.32, 0.405, 0.26, -0.008),
    lean(0.579, 0.60, 0.405, 0.40, -0.008),
  ],
  grid: gridPanels(3, 3, 0.012),
  mosaic: [
    R(0, 0, 0.36, 0.52),
    R(0.375, 0, 0.3, 0.34), R(0.69, 0, 0.31, 0.34),
    R(0.375, 0.355, 0.625, 0.29),
    R(0, 0.535, 0.36, 0.465),
    R(0.375, 0.66, 0.3, 0.34), R(0.69, 0.66, 0.31, 0.34),
  ],
  single: [
    R(0, 0, 1, 0.72),
    R(0, 0.735, 0.2425, 0.265), R(0.2525, 0.735, 0.2425, 0.265),
    R(0.505, 0.735, 0.2425, 0.265), R(0.7575, 0.735, 0.2425, 0.265),
  ],
  duo: [
    R(0, 0, 0.49, 0.62), R(0, 0.635, 0.49, 0.365),
    R(0.51, 0, 0.49, 0.49),
    R(0.51, 0.51, 0.24, 0.49), R(0.765, 0.51, 0.235, 0.49),
  ],
  stack: [
    R(0, 0, 1, 0.34),
    R(0, 0.355, 0.49, 0.3), R(0.51, 0.355, 0.49, 0.3),
    R(0, 0.67, 0.323, 0.33), R(0.338, 0.67, 0.324, 0.33), R(0.677, 0.67, 0.323, 0.33),
  ],
  frame: [
    R(0, 0, 1, 0.16), R(0, 0.84, 1, 0.16),
    R(0, 0.175, 0.085, 0.65), R(0.915, 0.175, 0.085, 0.65),
    R(0.10, 0.175, 0.80, 0.65),
  ],
};

const PORTRAIT = {
  hero: [
    R(0, 0, 1, 0.42),
    R(0, 0.435, 0.49, 0.27), R(0.51, 0.435, 0.49, 0.27),
    R(0, 0.72, 0.32, 0.28), R(0.34, 0.72, 0.32, 0.28), R(0.68, 0.72, 0.32, 0.28),
  ],
  heroRight: [
    R(0, 0.58, 1, 0.42),
    R(0, 0, 0.49, 0.28), R(0.51, 0, 0.49, 0.28),
    R(0, 0.295, 0.49, 0.27), R(0.51, 0.295, 0.49, 0.27),
  ],
  slant: [
    tilt(0, 0, 1, 0.30, 0.06),
    tilt(0, 0.375, 0.49, 0.255, 0.03), tilt(0.51, 0.343, 0.49, 0.257, 0.028),
    tilt(0, 0.675, 0.49, 0.325, 0.03), tilt(0.51, 0.642, 0.49, 0.358, 0.033),
  ],
  grid: gridPanels(2, 4, 0.012),
  mosaic: [
    R(0, 0, 0.58, 0.30), R(0.595, 0, 0.405, 0.30),
    R(0, 0.315, 0.405, 0.26), R(0.42, 0.315, 0.58, 0.26),
    R(0, 0.59, 0.58, 0.41),
    R(0.595, 0.59, 0.405, 0.195), R(0.595, 0.80, 0.405, 0.20),
  ],
  single: [
    R(0, 0, 1, 0.80),
    R(0, 0.815, 0.2425, 0.185), R(0.2525, 0.815, 0.2425, 0.185),
    R(0.505, 0.815, 0.2425, 0.185), R(0.7575, 0.815, 0.2425, 0.185),
  ],
  duo: [
    R(0, 0, 0.49, 0.49), R(0.51, 0, 0.49, 0.49),
    R(0, 0.51, 0.49, 0.49),
    R(0.51, 0.51, 0.49, 0.24), R(0.51, 0.765, 0.49, 0.235),
  ],
  stack: [
    R(0, 0, 1, 0.24),
    R(0, 0.255, 0.49, 0.24), R(0.51, 0.255, 0.49, 0.24),
    R(0, 0.51, 1, 0.23),
    R(0, 0.755, 0.49, 0.245), R(0.51, 0.755, 0.49, 0.245),
  ],
  frame: [
    R(0, 0, 1, 0.12), R(0, 0.88, 1, 0.12),
    R(0, 0.135, 0.145, 0.73), R(0.855, 0.135, 0.145, 0.73),
    R(0.16, 0.135, 0.68, 0.73),
  ],
};

const SQUARE = {
  hero: [
    R(0, 0, 0.52, 1),
    R(0.535, 0, 0.465, 0.32),
    R(0.535, 0.335, 0.225, 0.33), R(0.775, 0.335, 0.225, 0.33),
    R(0.535, 0.68, 0.465, 0.32),
  ],
  heroRight: [
    R(0.48, 0, 0.52, 1),
    R(0, 0, 0.465, 0.32),
    R(0, 0.335, 0.225, 0.33), R(0.24, 0.335, 0.225, 0.33),
    R(0, 0.68, 0.465, 0.32),
  ],
  slant: [
    lean(0, 0, 0.32, 1, -0.035),
    lean(0.335, 0, 0.30, 0.49, -0.017), lean(0.318, 0.51, 0.30, 0.49, -0.017),
    lean(0.65, 0, 0.35, 0.32, -0.01), lean(0.64, 0.34, 0.35, 0.30, -0.01),
    lean(0.63, 0.66, 0.35, 0.34, -0.01),
  ],
  grid: gridPanels(3, 3, 0.012),
  mosaic: [
    R(0, 0, 0.485, 0.62),
    R(0.50, 0, 0.50, 0.30), R(0.50, 0.315, 0.50, 0.305),
    R(0, 0.635, 0.485, 0.365),
    R(0.50, 0.635, 0.24, 0.365), R(0.755, 0.635, 0.245, 0.365),
  ],
  single: [
    R(0, 0, 1, 0.76),
    R(0, 0.775, 0.2425, 0.225), R(0.2525, 0.775, 0.2425, 0.225),
    R(0.505, 0.775, 0.2425, 0.225), R(0.7575, 0.775, 0.2425, 0.225),
  ],
  duo: [
    R(0, 0, 0.49, 0.62), R(0, 0.635, 0.49, 0.365),
    R(0.51, 0, 0.49, 0.49),
    R(0.51, 0.51, 0.24, 0.49), R(0.765, 0.51, 0.235, 0.49),
  ],
  stack: [
    R(0, 0, 1, 0.32),
    R(0, 0.335, 0.49, 0.325), R(0.51, 0.335, 0.49, 0.325),
    R(0, 0.675, 0.323, 0.325), R(0.338, 0.675, 0.324, 0.325), R(0.677, 0.675, 0.323, 0.325),
  ],
  frame: [
    R(0, 0, 1, 0.14), R(0, 0.86, 1, 0.14),
    R(0, 0.155, 0.10, 0.69), R(0.90, 0.155, 0.10, 0.69),
    R(0.115, 0.155, 0.77, 0.69),
  ],
};

export const LAYOUTS = { landscape: LANDSCAPE, portrait: PORTRAIT, square: SQUARE };

export const LAYOUT_ORDER = [
  'hero', 'heroRight', 'slant', 'grid', 'mosaic', 'single', 'duo', 'stack', 'frame',
];

export const LAYOUT_NAMES = {
  hero: 'Hero', heroRight: 'Hero Right', slant: 'Comic Slant', grid: 'Grid',
  mosaic: 'Mosaic', single: 'Single', duo: 'Split Duo', stack: 'Skyline Stack',
  frame: 'Poster Frame',
};

// Bounding box of a quad, in unit space — the frame the photo cover-fit
// and the location tag are computed against.
export function quadBox(pts) {
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
