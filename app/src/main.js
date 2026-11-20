// main.js — boots the Sunset State Cover Studio. With ?shot=<scene> in
// the URL it arranges a screenshot scene instead of the plain editor
// (see shots.js); the screenshot driver waits for window.__shotReady.

import { createStudio } from './editor.js';
import { applyShotScene } from './shots.js';

const studio = createStudio();
const params = new URLSearchParams(location.search);

if (params.has('shot')) {
  applyShotScene(studio, params).then(() => {
    window.__shotReady = true;
  });
} else {
  studio.ready.then(() => {
    window.__studioReady = true;
  });
}
