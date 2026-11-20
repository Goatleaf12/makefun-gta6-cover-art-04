// editor.js — the studio around the cover renderer: the photo pool,
// per-panel assignment (photo, pan, zoom, location tag), every control
// in the three columns, the live preview, and the PNG exports.

import { SIZES, SIZE_ORDER, GRADES, GRADE_ORDER, RECIPES } from './palette.js';
import { LAYOUTS, LAYOUT_ORDER, LAYOUT_NAMES, quadBox } from './geometry.js';
import { drawCover, renderCoverCanvas } from './render.js';

export const SAMPLE_PHOTOS = [
  { file: 'sunset-beach.jpg', name: 'Sunset Beach' },
  { file: 'neon-strip.jpg', name: 'Neon Strip' },
  { file: 'marina-speedboat.jpg', name: 'Marina Speedboat' },
  { file: 'rooftop-pool.jpg', name: 'Rooftop Pool' },
  { file: 'desert-highway.jpg', name: 'Desert Highway' },
  { file: 'boardwalk-dusk.jpg', name: 'Boardwalk Dusk' },
  { file: 'skyline-neon.jpg', name: 'Skyline Neon' },
  { file: 'palm-avenue.jpg', name: 'Palm Avenue' },
  { file: 'island-aerial.jpg', name: 'Island Aerial' },
  { file: 'storm-neon.jpg', name: 'Storm Neon' },
];

const TAG_POOL = [
  ['OCEAN DRIVE', '6:42 PM · LOOKING FOR TROUBLE'],
  ['PORT OF LEONIDA', 'DOCK 9 · NO QUESTIONS ASKED'],
  ['THE STRIP', 'MIDNIGHT · NEON RAIN'],
  ['VICE BEACH', 'LOW TIDE · HIGH STAKES'],
  ['DOWNTOWN', 'ROOFTOP · LAST CALL'],
  ['THE KEYS', 'MILE 0 · NO WAY BACK'],
  ['MIDTOWN', 'RUSH HOUR · CLEAN GETAWAY'],
  ['HARBOR LIGHTS', '3:17 AM · RADIO STATIC'],
  ['PALM ROW', 'GOLDEN HOUR · THIN SMOKE'],
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function createStudio() {
  const $ = (sel) => document.querySelector(sel);
  const stage = $('#stage');
  const ctx = stage.getContext('2d');
  const status = $('#status');

  const state = {
    sizeId: 'landscape',
    layoutId: 'hero',
    gradeId: 'vice',
    photos: [],
    assign: [],
    selected: 0,
    activePhoto: 0,
    captions: { ...RECIPES[0].captions },
    fx: { ...RECIPES[0].fx },
    showTags: true,
  };

  const setStatus = (text) => { status.textContent = text; };
  const panelsNow = () => LAYOUTS[state.sizeId][state.layoutId];

  function defaultAssign(i) {
    const [tag, sub] = TAG_POOL[i % TAG_POOL.length];
    return { photo: i % Math.max(1, state.photos.length), panX: 0, panY: 0, zoom: 1, tag, sub };
  }

  function ensureAssign() {
    const n = panelsNow().length;
    while (state.assign.length < n) state.assign.push(defaultAssign(state.assign.length));
    state.assign.length = n;
    state.selected = clamp(state.selected, 0, n - 1);
  }

  function buildView(forExport, sizeId = state.sizeId) {
    const layout = LAYOUTS[sizeId][state.layoutId];
    return {
      sizeId,
      layoutId: state.layoutId,
      grade: GRADES[state.gradeId],
      captions: state.captions,
      fx: state.fx,
      showTags: state.showTags,
      selected: forExport ? -1 : state.selected,
      forExport: !!forExport,
      panels: layout.map((_, i) => {
        const a = state.assign[i] || defaultAssign(i);
        const photo = state.photos[a.photo % Math.max(1, state.photos.length)];
        return { img: photo ? photo.img : null, panX: a.panX, panY: a.panY, zoom: a.zoom, tag: a.tag, sub: a.sub };
      }),
    };
  }

  function render() {
    const size = SIZES[state.sizeId];
    stage.width = size.w;
    stage.height = size.h;
    drawCover(ctx, size.w, size.h, buildView(false));
  }

  // Render the current cover onto the stage at an exact size (shots).
  function renderAt(W, H) {
    stage.width = W;
    stage.height = H;
    drawCover(ctx, W, H, buildView(true));
  }

  // ---------------------------------------------------------- photos
  function refreshThumbs() {
    const box = $('#thumbs');
    box.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const el = document.createElement('div');
      el.className = 'thumb' + (i === state.activePhoto ? ' active' : '');
      el.draggable = true;
      const im = document.createElement('img');
      im.src = photo.img.src;
      im.alt = photo.name;
      const label = document.createElement('span');
      label.textContent = photo.name;
      el.append(im, label);
      el.title = 'Click to select · drag onto a panel to use it there';
      el.addEventListener('click', () => {
        state.activePhoto = i;
        refreshThumbs();
        setStatus(`Photo ${i + 1} selected: ${photo.name}. “Fill all panels” uses it everywhere.`);
      });
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/x-sunset-photo', String(i));
      });
      box.append(el);
    });
    $('#photoCount').textContent = `${state.photos.length} photos`;
  }

  async function addPhotoFiles(files) {
    let added = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(file);
      try {
        const img = await loadImage(url);
        state.photos.push({ img, name: file.name.replace(/\.[^.]+$/, '') });
        added++;
      } catch { /* unreadable file: skip it */ }
    }
    if (added) {
      ensureAssign();
      refreshThumbs();
      render();
      setStatus(`${added} photo${added > 1 ? 's' : ''} added — your photos never leave this machine.`);
    }
  }

  // ---------------------------------------------------------- panel interaction
  function unitPos(e) {
    const r = stage.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * stage.width,
      y: ((e.clientY - r.top) / r.height) * stage.height,
    };
  }

  function hitPanel(px, py) {
    const panels = panelsNow();
    for (let i = panels.length - 1; i >= 0; i--) {
      const path = new Path2D();
      panels[i].forEach(([x, y], j) => {
        if (j === 0) path.moveTo(x * stage.width, y * stage.height);
        else path.lineTo(x * stage.width, y * stage.height);
      });
      path.closePath();
      if (ctx.isPointInPath(path, px, py)) return i;
    }
    return -1;
  }

  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    const p = unitPos(e);
    const hit = hitPanel(p.x, p.y);
    if (hit < 0) return;
    state.selected = hit;
    const a = state.assign[hit];
    drag = { panel: hit, sx: p.x, sy: p.y, panX: a.panX, panY: a.panY };
    stage.setPointerCapture(e.pointerId);
    syncPanelBox();
    render();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const p = unitPos(e);
    const box = quadBox(panelsNow()[drag.panel]);
    const a = state.assign[drag.panel];
    a.panX = clamp(drag.panX + (p.x - drag.sx) / (box.w * stage.width), -0.6, 0.6);
    a.panY = clamp(drag.panY + (p.y - drag.sy) / (box.h * stage.height), -0.6, 0.6);
    render();
  });
  stage.addEventListener('pointerup', () => { drag = null; });
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = unitPos(e);
    const hit = hitPanel(p.x, p.y);
    const i = hit >= 0 ? hit : state.selected;
    state.selected = i;
    const a = state.assign[i];
    a.zoom = clamp(a.zoom * (e.deltaY < 0 ? 1.09 : 0.92), 0.4, 4);
    syncPanelBox();
    render();
  }, { passive: false });
  stage.addEventListener('dblclick', (e) => {
    const p = unitPos(e);
    const hit = hitPanel(p.x, p.y);
    if (hit < 0) return;
    const a = state.assign[hit];
    a.panX = 0;
    a.panY = 0;
    a.zoom = 1;
    state.selected = hit;
    syncPanelBox();
    render();
    setStatus(`Panel ${hit + 1} re-centred.`);
  });
  stage.addEventListener('dragover', (e) => e.preventDefault());
  stage.addEventListener('drop', (e) => {
    e.preventDefault();
    const p = unitPos(e);
    const hit = hitPanel(p.x, p.y);
    const idx = e.dataTransfer.getData('application/x-sunset-photo');
    if (idx !== '' && hit >= 0) {
      state.assign[hit].photo = Number(idx);
      state.selected = hit;
      syncPanelBox();
      render();
      setStatus(`Panel ${hit + 1} now shows photo ${Number(idx) + 1}.`);
    } else if (e.dataTransfer.files.length) {
      addPhotoFiles([...e.dataTransfer.files]);
    }
  });

  // ---------------------------------------------------------- controls
  function buildLayoutButtons() {
    const box = $('#layouts');
    box.innerHTML = '';
    const size = SIZES[state.sizeId];
    const ratio = size.h / size.w;
    for (const id of LAYOUT_ORDER) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'layout-btn' + (id === state.layoutId ? ' active' : '');
      const mini = document.createElement('canvas');
      mini.width = 84;
      mini.height = Math.round(84 * ratio);
      const mg = mini.getContext('2d');
      mg.fillStyle = '#241335';
      mg.fillRect(0, 0, mini.width, mini.height);
      LAYOUTS[state.sizeId][id].forEach((pts, i) => {
        mg.beginPath();
        pts.forEach(([x, y], j) => {
          if (j === 0) mg.moveTo(x * mini.width, y * mini.height);
          else mg.lineTo(x * mini.width, y * mini.height);
        });
        mg.closePath();
        mg.fillStyle = i === 0 ? '#ff7847' : `rgba(255,95,162,${0.35 + (i % 4) * 0.13})`;
        mg.fill();
        mg.strokeStyle = '#12081c';
        mg.stroke();
      });
      const label = document.createElement('span');
      label.textContent = LAYOUT_NAMES[id];
      btn.append(mini, label);
      btn.addEventListener('click', () => {
        state.layoutId = id;
        ensureAssign();
        buildLayoutButtons();
        syncPanelBox();
        render();
      });
      box.append(btn);
    }
  }

  function buildGradeButtons() {
    const box = $('#grades');
    box.innerHTML = '';
    for (const id of GRADE_ORDER) {
      const g = GRADES[id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'grade-btn' + (id === state.gradeId ? ' active' : '');
      const dot = document.createElement('span');
      dot.className = 'grade-dot';
      dot.style.background = `linear-gradient(180deg, rgb(${g.washTop}), rgb(${g.washBot}))`;
      btn.append(dot, document.createTextNode(g.name));
      btn.addEventListener('click', () => {
        state.gradeId = id;
        buildGradeButtons();
        render();
      });
      box.append(btn);
    }
  }

  function buildRecipeButtons() {
    const box = $('#recipes');
    box.innerHTML = '';
    for (const recipe of RECIPES) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recipe-btn';
      btn.textContent = recipe.name;
      btn.addEventListener('click', () => applyRecipe(recipe));
      box.append(btn);
    }
  }

  function applyRecipe(recipe) {
    state.sizeId = recipe.size;
    state.layoutId = recipe.layout;
    state.gradeId = recipe.grade;
    state.captions = { ...recipe.captions };
    state.fx = { ...recipe.fx };
    ensureAssign();
    syncAllControls();
    render();
    setStatus(`Recipe applied: ${recipe.name}. Tweak anything — it is a starting point.`);
  }

  function syncAllControls() {
    document.querySelectorAll('[data-size]').forEach((b) => {
      b.classList.toggle('active', b.dataset.size === state.sizeId);
    });
    document.querySelectorAll('[data-fx]').forEach((input) => {
      input.value = state.fx[input.dataset.fx];
    });
    $('#fxHalftone').checked = state.fx.halftone;
    $('#fxPaper').checked = state.fx.paper;
    $('#showTags').checked = state.showTags;
    document.querySelectorAll('[data-cap]').forEach((input) => {
      input.value = state.captions[input.dataset.cap] ?? '';
    });
    buildLayoutButtons();
    buildGradeButtons();
    syncPanelBox();
  }

  function syncPanelBox() {
    const a = state.assign[state.selected];
    if (!a) return;
    $('#panelTitle').textContent = `Panel ${state.selected + 1} of ${panelsNow().length}`;
    $('#tagInput').value = a.tag;
    $('#subInput').value = a.sub;
    $('#zoomRange').value = Math.round(a.zoom * 100);
  }

  function wireControls() {
    document.querySelectorAll('[data-size]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.sizeId = btn.dataset.size;
        ensureAssign();
        syncAllControls();
        render();
      });
    });
    document.querySelectorAll('[data-fx]').forEach((input) => {
      input.addEventListener('input', () => {
        state.fx[input.dataset.fx] = Number(input.value);
        render();
      });
    });
    $('#fxHalftone').addEventListener('change', (e) => { state.fx.halftone = e.target.checked; render(); });
    $('#fxPaper').addEventListener('change', (e) => { state.fx.paper = e.target.checked; render(); });
    $('#showTags').addEventListener('change', (e) => { state.showTags = e.target.checked; render(); });
    document.querySelectorAll('[data-cap]').forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.cap;
        state.captions[key] = key === 'stars' ? clamp(Number(input.value) || 0, 0, 5) : input.value;
        render();
      });
    });
    $('#tagInput').addEventListener('input', (e) => { state.assign[state.selected].tag = e.target.value; render(); });
    $('#subInput').addEventListener('input', (e) => { state.assign[state.selected].sub = e.target.value; render(); });
    $('#zoomRange').addEventListener('input', (e) => {
      state.assign[state.selected].zoom = Number(e.target.value) / 100;
      render();
    });
    $('#recentreBtn').addEventListener('click', () => {
      const a = state.assign[state.selected];
      a.panX = 0; a.panY = 0; a.zoom = 1;
      syncPanelBox();
      render();
    });
    $('#fillAllBtn').addEventListener('click', () => {
      state.assign.forEach((a) => { a.photo = state.activePhoto; });
      render();
      setStatus(`Every panel now shows photo ${state.activePhoto + 1}.`);
    });
    $('#spreadBtn').addEventListener('click', () => {
      state.assign.forEach((a, i) => { a.photo = i % state.photos.length; });
      render();
      setStatus('Photos spread across the panels.');
    });
    $('#fileInput').addEventListener('change', (e) => {
      addPhotoFiles([...e.target.files]);
      e.target.value = '';
    });
    document.querySelectorAll('[data-export]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.export === 'all') exportAll();
        else exportOne(btn.dataset.export);
      });
    });
  }

  // ---------------------------------------------------------- exports
  function saveCanvas(canvas, filename) {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      setStatus(`Saved ${filename} — check your downloads.`);
    }, 'image/png');
  }

  function exportOne(sizeId) {
    const size = SIZES[sizeId];
    const canvas = renderCoverCanvas(buildView(true, sizeId), size.w, size.h);
    saveCanvas(canvas, size.file);
  }

  function exportAll() {
    SIZE_ORDER.forEach((sizeId, i) => {
      setTimeout(() => exportOne(sizeId), i * 350);
    });
  }

  // ---------------------------------------------------------- boot
  const ready = (async () => {
    try {
      await Promise.all([
        document.fonts.load('100px Anton'),
        document.fonts.load('40px Pacifico'),
        document.fonts.load('600 20px Oswald'),
        document.fonts.load('700 20px Oswald'),
        document.fonts.ready,
      ]);
    } catch { /* fonts fall back gracefully */ }
    const imgs = await Promise.all(
      SAMPLE_PHOTOS.map((s) => loadImage(`./samples/${s.file}`)),
    );
    state.photos = imgs.map((img, i) => ({ img, name: SAMPLE_PHOTOS[i].name }));
    ensureAssign();
    buildLayoutButtons();
    buildGradeButtons();
    buildRecipeButtons();
    wireControls();
    syncAllControls();
    refreshThumbs();
    render();
    setStatus(`READY — ${state.photos.length} SAMPLE PHOTOS LOADED. Add your own, pick a size, export.`);
  })();

  return {
    state,
    ready,
    render,
    renderAt,
    buildView,
    els: { stage, status },
    // Patch the whole view at once (recipes and screenshot scenes).
    setView(patch) {
      if (patch.sizeId) state.sizeId = patch.sizeId;
      if (patch.layoutId) state.layoutId = patch.layoutId;
      if (patch.gradeId) state.gradeId = patch.gradeId;
      if (patch.captions) state.captions = { ...state.captions, ...patch.captions };
      if (patch.fx) state.fx = { ...state.fx, ...patch.fx };
      if (patch.showTags !== undefined) state.showTags = patch.showTags;
      ensureAssign();
      if (patch.photoOrder) {
        patch.photoOrder.forEach((photoIdx, i) => {
          if (state.assign[i]) state.assign[i].photo = photoIdx;
        });
      }
      if (patch.pans) {
        patch.pans.forEach((pan, i) => {
          if (state.assign[i] && pan) Object.assign(state.assign[i], pan);
        });
      }
      syncAllControls();
      render();
    },
  };
}
