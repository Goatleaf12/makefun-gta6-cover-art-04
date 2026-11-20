// palette.js — the studio's post sizes, colour grades and cover recipes.
//
// A grade is more than a filter: it carries the photo wash (a two-stop
// gradient laid over every panel), the saturation/contrast bias the
// sliders start from, and the lettering colours — the title gradient,
// the neon script colour and the bottom band — so one click re-skins
// the whole cover, photos and type together.

export const SIZES = {
  landscape: { id: 'landscape', label: '1920 × 1080', w: 1920, h: 1080, file: 'cover-1920x1080.png' },
  portrait: { id: 'portrait', label: '1080 × 1350', w: 1080, h: 1350, file: 'cover-1080x1350.png' },
  square: { id: 'square', label: '1080 × 1080', w: 1080, h: 1080, file: 'cover-1080x1080.png' },
};
export const SIZE_ORDER = ['landscape', 'portrait', 'square'];

export const GRADES = {
  vice: {
    name: 'Vice Sunset', sat: 1.28, con: 1.09,
    washTop: [64, 20, 110], washBot: [255, 110, 60], washAlpha: 0.34,
    titleTop: '#fff3c4', titleBot: '#ff7847', script: '#ff5fa2',
    band: '#2a1030', bandText: '#ffd9a0', gutter: '#170a20',
  },
  neon: {
    name: 'Neon Night', sat: 1.32, con: 1.14,
    washTop: [10, 20, 80], washBot: [255, 60, 170], washAlpha: 0.30,
    titleTop: '#b8f6ff', titleBot: '#ff5fd0', script: '#5ff2ff',
    band: '#0b1030', bandText: '#aef4ff', gutter: '#0a0a1c',
  },
  golden: {
    name: 'Golden Hour', sat: 1.18, con: 1.04,
    washTop: [120, 70, 20], washBot: [255, 190, 90], washAlpha: 0.28,
    titleTop: '#fff8dc', titleBot: '#ffb340', script: '#ff8a5c',
    band: '#3a2410', bandText: '#ffe6b0', gutter: '#241203',
  },
  duotone: {
    name: 'Duotone Pink/Teal', sat: 1.0, con: 1.12, duotone: true,
    washTop: [10, 90, 100], washBot: [255, 110, 199], washAlpha: 0.22,
    titleTop: '#aef7f0', titleBot: '#ff6ec7', script: '#aef7f0',
    band: '#123a3f', bandText: '#d8fff8', gutter: '#0c2428',
  },
  comic: {
    name: 'Comic Ink', sat: 1.12, con: 1.24,
    washTop: [90, 30, 10], washBot: [255, 170, 60], washAlpha: 0.16,
    titleTop: '#fff200', titleBot: '#ff5722', script: '#ffe45c',
    band: '#14100c', bandText: '#fff3b0', gutter: '#f3e5c3',
  },
  painterly: {
    name: 'Painterly', sat: 1.16, con: 0.95, soften: 0.7,
    washTop: [80, 40, 80], washBot: [255, 150, 110], washAlpha: 0.24,
    titleTop: '#ffe9c9', titleBot: '#e2703a', script: '#ffb3c8',
    band: '#402030', bandText: '#ffd9c9', gutter: '#2a1420',
  },
  noir: {
    name: 'Noir', sat: 0.0, con: 1.26,
    washTop: [10, 10, 14], washBot: [70, 74, 84], washAlpha: 0.18,
    titleTop: '#ffffff', titleBot: '#9aa3ad', script: '#e8e8e8',
    band: '#0a0a0a', bandText: '#e8e8e8', gutter: '#050505',
  },
  chrome: {
    name: 'Chrome Dusk', sat: 1.2, con: 1.1,
    washTop: [30, 40, 90], washBot: [150, 70, 170], washAlpha: 0.26,
    titleTop: '#eaf6ff', titleMid: '#7fd0ff', titleBot: '#ff8ad8', script: '#8ad8ff',
    band: '#101828', bandText: '#cfeaff', gutter: '#0a0f1c',
  },
  natural: {
    name: 'Natural', sat: 1.02, con: 1.0,
    washTop: [60, 60, 40], washBot: [255, 220, 160], washAlpha: 0.08,
    titleTop: '#ffffff', titleBot: '#ffd76e', script: '#ffd76e',
    band: '#1c2a1e', bandText: '#f2ecd8', gutter: '#101410',
  },
};
export const GRADE_ORDER = [
  'vice', 'neon', 'golden', 'duotone', 'comic', 'painterly', 'noir', 'chrome', 'natural',
];

// One-click recipes: layout + grade + size + captions + effects together,
// in the shape of the winning covers — a starting point, not a cage.
export const RECIPES = [
  {
    id: 'vice-classic', name: 'Vice Classic', size: 'landscape', layout: 'hero', grade: 'vice',
    captions: {
      title: 'SUNSET STATE', subtitle: 'Vice & Virtue', quote: 'THE SUNSET NEVER LIES',
      seal: 'ORIGINAL COVER ART', volume: 'VOL. 06', wanted: 'MOST WANTED',
      tagline: 'LEONIDA · EST. 2026 · POP. TROUBLE', catalog: 'SS-2026 · COVER STUDIO PRESS · PRINTED IN LEONIDA',
      ribbon: "COLLECTOR'S EDITION",
      stars: 5,
    },
    fx: { strength: 80, contrast: 55, saturation: 60, grain: 35, vignette: 45, halftone: false, paper: true },
  },
  {
    id: 'neon-nights', name: 'Neon Nights', size: 'square', layout: 'grid', grade: 'neon',
    captions: {
      title: 'AFTERGLOW', subtitle: 'City of Palms', quote: 'NOBODY SLEEPS IN NEON',
      seal: 'AFTER DARK EDITION', volume: 'VOL. 13', wanted: 'STILL AT LARGE',
      tagline: 'THE STRIP · OPEN ALL NIGHT', catalog: 'NG-2026 · AFTERGLOW PRESS · PRINTED IN LEONIDA',
      ribbon: 'AFTER DARK',
      stars: 4,
    },
    fx: { strength: 85, contrast: 62, saturation: 70, grain: 30, vignette: 55, halftone: false, paper: false },
  },
  {
    id: 'print-comic', name: 'Print Comic', size: 'portrait', layout: 'slant', grade: 'comic',
    captions: {
      title: 'NEON HARVEST', subtitle: 'Midnight Radio', quote: 'INK, SWEAT AND STATIC',
      seal: '10¢ THRILLER', volume: 'NO. 42', wanted: 'REWARD OFFERED',
      tagline: 'A LEONIDA PULP · NOT FOR THE FAINT', catalog: 'PC-1949 · PULP PRESS · PRINTED IN LEONIDA',
      ribbon: 'PULP CLASSIC',
      stars: 5,
    },
    fx: { strength: 70, contrast: 72, saturation: 58, grain: 48, vignette: 38, halftone: true, paper: true },
  },
  {
    id: 'golden-coast', name: 'Golden Coast', size: 'landscape', layout: 'mosaic', grade: 'golden',
    captions: {
      title: 'GOLDEN COAST', subtitle: 'Salt & Honey', quote: 'EVERY HOUR IS GOLDEN SOMEWHERE',
      seal: 'COASTAL EDITION', volume: 'VOL. 02', wanted: 'HEARTBREAKER',
      tagline: 'FROM THE KEYS TO THE CITY · ONE TANK OF GAS', catalog: 'GC-2026 · COAST PRESS · PRINTED IN LEONIDA',
      ribbon: 'COASTAL CLASSIC',
      stars: 4,
    },
    fx: { strength: 65, contrast: 48, saturation: 55, grain: 26, vignette: 40, halftone: false, paper: true },
  },
  {
    id: 'chrome-dusk', name: 'Chrome Dusk', size: 'portrait', layout: 'frame', grade: 'chrome',
    captions: {
      title: 'CHROME DUSK', subtitle: 'Electric Confession', quote: 'THE CITY REFLECTS EVERYTHING',
      seal: 'MIRROR EDITION', volume: 'VOL. 09', wanted: 'UNTOUCHABLE',
      tagline: 'DOWNTOWN · AFTER THE RAIN', catalog: 'CD-2026 · MIRROR PRESS · PRINTED IN LEONIDA',
      ribbon: 'MIRROR CLASSIC',
      stars: 5,
    },
    fx: { strength: 78, contrast: 60, saturation: 62, grain: 32, vignette: 50, halftone: false, paper: false },
  },
];
