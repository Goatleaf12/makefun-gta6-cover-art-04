// shots.js — screenshot scenes. The driver loads the app with
// ?shot=<scene>; each scene arranges a real cover (or the editor) and
// renders it at the exact pixel size the screenshot will be taken at,
// so every screenshot is the app's own output, never a composite.

import { RECIPES } from './palette.js';

// Sample photo indices (see SAMPLE_PHOTOS in editor.js):
// 0 sunset-beach · 1 neon-strip · 2 marina-speedboat · 3 rooftop-pool
// 4 desert-highway · 5 boardwalk-dusk · 6 skyline-neon · 7 palm-avenue
// 8 island-aerial · 9 storm-neon
const SCENES = {
  'cover-landscape': {
    w: 1280, h: 720, cover: true,
    view: {
      sizeId: 'landscape', layoutId: 'hero', gradeId: 'vice',
      captions: { ...RECIPES[0].captions },
      fx: { ...RECIPES[0].fx },
      photoOrder: [7, 1, 2, 5, 3, 0],
    },
  },
  'cover-portrait': {
    w: 1024, h: 1280, cover: true,
    view: {
      sizeId: 'portrait', layoutId: 'slant', gradeId: 'comic',
      captions: { ...RECIPES[2].captions },
      fx: { ...RECIPES[2].fx },
      photoOrder: [9, 6, 1, 4, 0],
    },
  },
  'cover-square': {
    w: 1280, h: 1280, cover: true,
    view: {
      sizeId: 'square', layoutId: 'grid', gradeId: 'neon',
      captions: { ...RECIPES[1].captions },
      fx: { ...RECIPES[1].fx },
      photoOrder: [1, 6, 9, 0, 2, 5, 3, 7, 8],
    },
  },
  editor: { w: 1280, h: 800, cover: false, view: null },
};

export async function applyShotScene(studio, params) {
  const scene = SCENES[params.get('shot')] || SCENES.editor;
  document.body.classList.add('shot');
  if (!scene.cover) document.body.classList.add('shot-editor');
  await studio.ready;
  if (scene.view) studio.setView(scene.view);
  if (scene.cover) {
    document.body.classList.add('shot-cover');
    const stage = studio.els.stage;
    stage.style.width = `${scene.w}px`;
    stage.style.height = `${scene.h}px`;
    studio.renderAt(scene.w, scene.h);
  }
  // One more frame so fonts and the final paint are on screen.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}
