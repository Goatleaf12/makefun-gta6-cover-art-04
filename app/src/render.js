// render.js — the one canvas routine that draws a cover.
//
// The editor preview and every PNG export call this same function at
// different sizes, so what you see is byte-for-byte what you ship:
// panels with graded photos, gutters, location tags, then the full
// magazine dressing — ribbon, volume tag, stars and quote above the
// title block, gradient title, neon script subtitle, starburst seal,
// and the palm band along the bottom with the wanted pill on top of it.

import { LAYOUTS, quadBox } from './geometry.js';

const ANTON = '"Anton", sans-serif';
const PACIFICO = '"Pacifico", cursive';
const OSWALD = '"Oswald", sans-serif';

let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 64);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

function panelPath(ctx, pts, W, H) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * W, y * H);
    else ctx.lineTo(x * W, y * H);
  });
  ctx.closePath();
}

function fitFontSize(ctx, text, maxW, start, family, weight = 400) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  const w = ctx.measureText(text).width;
  if (w > maxW) size = Math.max(10, Math.floor(size * (maxW / w)));
  ctx.font = `${weight} ${size}px ${family}`;
  return size;
}

// Letter-spaced centred text (canvas has no portable letter-spacing).
function drawSpaced(ctx, text, cx, y, spacing) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + spacing;
  });
  ctx.textAlign = prevAlign;
  return total;
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function starburstPath(ctx, cx, cy, r) {
  ctx.beginPath();
  const points = 16;
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.82;
    const a = (i * Math.PI) / points;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// A palm silhouette for the bottom band: two-segment trunk, five fronds.
function drawBandPalm(ctx, x, baseY, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  const crownX = x + h * 0.14;
  const crownY = baseY - h;
  ctx.lineWidth = h * 0.10;
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + h * 0.02, baseY - h * 0.5, (x + crownX) / 2, (baseY + crownY) / 2);
  ctx.stroke();
  ctx.lineWidth = h * 0.055;
  ctx.beginPath();
  ctx.moveTo((x + crownX) / 2, (baseY + crownY) / 2);
  ctx.quadraticCurveTo(x + h * 0.08, baseY - h * 0.8, crownX, crownY);
  ctx.stroke();
  ctx.lineWidth = h * 0.045;
  for (const deg of [-168, -128, -86, -44, -8]) {
    const a = (deg * Math.PI) / 180;
    const ex = crownX + Math.cos(a) * h * 0.62;
    const ey = crownY + Math.sin(a) * h * 0.30 + h * 0.30;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(crownX + Math.cos(a) * h * 0.4, crownY + Math.sin(a) * h * 0.42 - h * 0.10, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPhotoPanel(ctx, pts, W, H, view, grade, fx) {
  const box = quadBox(pts);
  const bx = box.x * W;
  const by = box.y * H;
  const bw = box.w * W;
  const bh = box.h * H;
  panelPath(ctx, pts, W, H);
  ctx.save();
  ctx.clip();
  const img = view.img;
  if (img && img.width) {
    const sat = grade.sat * (fx.saturation / 50);
    const con = grade.con * (0.6 + (fx.contrast / 100) * 0.8);
    let filter = `saturate(${sat.toFixed(3)}) contrast(${con.toFixed(3)})`;
    if (grade.duotone) filter = `grayscale(1) contrast(${con.toFixed(3)}) brightness(1.03)`;
    if (grade.soften) filter += ` blur(${grade.soften}px)`;
    const scale = (Math.max(bw / img.width, bh / img.height) || 1) * (view.zoom || 1);
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = bx + (bw - dw) / 2 + (view.panX || 0) * bw;
    const dy = by + (bh - dh) / 2 + (view.panY || 0) * bh;
    ctx.filter = filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
  } else {
    const g = ctx.createLinearGradient(bx, by, bx, by + bh);
    g.addColorStop(0, grade.band);
    g.addColorStop(1, '#000');
    ctx.fillStyle = g;
    ctx.fillRect(bx, by, bw, bh);
  }
  // colour wash: the grade's two-stop gradient over the photo
  const washA = Math.min(0.62, grade.washAlpha * (fx.strength / 100) * 1.25);
  const wash = ctx.createLinearGradient(0, by, 0, by + bh);
  const [r1, g1, b1] = grade.washTop;
  const [r2, g2, b2] = grade.washBot;
  wash.addColorStop(0, `rgba(${r1},${g1},${b1},${washA})`);
  wash.addColorStop(1, `rgba(${r2},${g2},${b2},${washA * 0.9})`);
  if (grade.duotone) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = wash;
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.32;
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.fillStyle = wash;
    ctx.fillRect(bx, by, bw, bh);
  }
  // halftone print dots
  if (fx.halftone) {
    const cell = Math.max(6, W * 0.0075);
    const dot = document.createElement('canvas');
    dot.width = dot.height = Math.ceil(cell);
    const dg = dot.getContext('2d');
    dg.fillStyle = 'rgba(24,10,24,0.6)';
    dg.beginPath();
    dg.arc(cell / 2, cell / 2, cell * 0.30, 0, Math.PI * 2);
    dg.fill();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = ctx.createPattern(dot, 'repeat');
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  // gutter stroke
  panelPath(ctx, pts, W, H);
  ctx.strokeStyle = grade.gutter;
  ctx.lineWidth = Math.max(3, W * 0.0055);
  ctx.stroke();
}

function drawTag(ctx, pts, W, H, view, grade, titleRect, maxY, wantedRect) {
  if (!view.tag) return;
  const box = quadBox(pts);
  const bx = box.x * W;
  const by = box.y * H;
  const bw = box.w * W;
  const bh = box.h * H;
  if (bw < W * 0.13 || bh < H * 0.12) return; // too small to hold a tag
  let size = Math.max(11, W * 0.0155);
  ctx.font = `600 ${size}px ${OSWALD}`;
  let tw = ctx.measureText(view.tag.toUpperCase()).width;
  let subW = 0;
  if (view.sub) {
    ctx.font = `400 ${size * 0.72}px ${OSWALD}`;
    subW = ctx.measureText(view.sub.toUpperCase()).width;
  }
  // shrink the tag type until the text fits the panel, so a pill never
  // spills its words over the gutter
  const widest = Math.max(tw, subW);
  const maxText = bw - size * 1.9;
  if (widest > maxText) {
    const f = maxText / widest;
    size *= f;
    tw *= f;
    subW *= f;
  }
  const padX = size * 0.55;
  const pillW = Math.max(tw, subW) + padX * 2;
  const pillH = view.sub ? size * 2.15 : size * 1.45;
  // clamped inside the panel: never spilling over the gutter
  const px = Math.min(bx + size * 0.45, bx + bw - pillW - size * 0.3);
  let py = Math.max(by + size * 0.3, by + bh - pillH - size * 0.45);
  // the bottom band is painted after the tags: keep pills above it
  if (maxY !== undefined) py = Math.min(py, maxY - pillH);
  // if the title block or the wanted pill would slice the tag in half,
  // move the tag to the panel's top — or leave it off rather than show
  // it broken
  const avoid = [titleRect, wantedRect].filter(Boolean);
  if (avoid.length) {
    const hits = (y) => avoid.some((r) => px < r.x + r.w && px + pillW > r.x
      && y < r.y + r.h && y + pillH > r.y);
    if (hits(py)) {
      const topY = by + size * 0.45;
      if (!hits(topY)) py = topY;
      else return;
    }
  }
  ctx.save();
  ctx.fillStyle = 'rgba(10,7,16,0.74)';
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, size * 0.22);
  ctx.fill();
  ctx.fillStyle = '#ffd76e';
  ctx.font = `600 ${size}px ${OSWALD}`;
  ctx.textAlign = 'left';
  ctx.fillText(view.tag.toUpperCase(), px + padX, py + size * 1.02);
  if (view.sub) {
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.font = `400 ${size * 0.72}px ${OSWALD}`;
    ctx.fillText(view.sub.toUpperCase(), px + padX, py + size * 1.78);
  }
  ctx.restore();
}

export function drawCover(ctx, W, H, view) {
  const { grade, captions: cap, fx } = view;
  const panels = LAYOUTS[view.sizeId][view.layoutId];
  ctx.save();
  ctx.fillStyle = grade.band;
  ctx.fillRect(0, 0, W, H);

  // Title metrics first: the panel tags steer around the title block,
  // and the block is guaranteed room for quote + stars above the title.
  const titleText = (cap.title || '').toUpperCase();
  const titleStart = W * (view.sizeId === 'portrait' ? 0.205 : 0.168);
  const titleSize = fitFontSize(ctx, titleText, W * 0.93, titleStart, ANTON);
  const titleBase = Math.max(
    H * (view.sizeId === 'portrait' ? 0.295 : view.sizeId === 'square' ? 0.315 : 0.33),
    titleSize * 1.78,
  );
  ctx.font = `400 ${titleSize}px ${ANTON}`;
  const titleW = ctx.measureText(titleText).width;
  const titleRect = {
    x: W / 2 - titleW / 2 - titleSize * 0.12,
    y: titleBase - titleSize * 1.62,
    w: titleW + titleSize * 0.24,
    h: titleSize * 2.15,
  };

  // Band geometry is needed early: tags must stay above the band.
  const bandH = H * (view.sizeId === 'portrait' ? 0.068 : view.sizeId === 'square' ? 0.08 : 0.088);
  const bandTop = H - bandH;
  // The wanted pill's footprint too: it is painted last, over the band's
  // top edge, and tags steer around it like they steer around the title.
  let wantedRect = null;
  if (cap.wanted) {
    ctx.font = `700 ${W * 0.0175}px ${OSWALD}`;
    const pw = ctx.measureText(cap.wanted.toUpperCase()).width + W * 0.034;
    const ph = W * 0.033;
    wantedRect = {
      x: W * 0.868 - pw / 2 - 4, y: bandTop - ph * 0.12 - ph / 2 - 4, w: pw + 8, h: ph + 8,
    };
  }

  // 1 — photo panels, then tags on top of them
  panels.forEach((pts, i) => drawPhotoPanel(ctx, pts, W, H, view.panels[i] || {}, grade, fx));
  if (view.showTags) panels.forEach((pts, i) => drawTag(ctx, pts, W, H, view.panels[i] || {}, grade, titleRect, bandTop - 4, wantedRect));

  // 2 — global vignette over the photos, under the lettering
  if (fx.vignette > 0) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${(fx.vignette / 100) * 0.55})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // 3 — catalog dateline along the top edge
  ctx.fillStyle = 'rgba(255,246,224,0.85)';
  ctx.font = `500 ${Math.max(10, W * 0.0105)}px ${OSWALD}`;
  ctx.textAlign = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText(cap.catalog.toUpperCase(), W * 0.018, H * 0.028);
  ctx.shadowBlur = 0;

  // 4 — corner ribbon (top-left), volume tag (top-right)
  if (cap.ribbon) {
    const rh = W * 0.034;
    ctx.save();
    ctx.translate(W * 0.08, W * 0.08);
    ctx.rotate(-Math.PI / 4);
    const rg = ctx.createLinearGradient(-W * 0.2, 0, W * 0.2, 0);
    rg.addColorStop(0, '#8f1d26');
    rg.addColorStop(0.5, '#c1272d');
    rg.addColorStop(1, '#8f1d26');
    ctx.fillStyle = rg;
    ctx.fillRect(-W * 0.2, -rh / 2, W * 0.4, rh);
    ctx.fillStyle = '#fff6e0';
    // the visible band across the corner is ~0.25W long: fit the words to it
    const rSize = fitFontSize(ctx, cap.ribbon.toUpperCase(), W * 0.235, rh * 0.44, OSWALD, 700);
    ctx.font = `700 ${rSize}px ${OSWALD}`;
    ctx.textAlign = 'center';
    ctx.fillText(cap.ribbon.toUpperCase(), 0, rSize * 0.36);
    ctx.restore();
  }
  if (cap.volume) {
    ctx.save();
    ctx.translate(W * 0.972, H * 0.045);
    ctx.rotate(0.035);
    ctx.font = `700 ${W * 0.019}px ${OSWALD}`;
    const vw = ctx.measureText(cap.volume.toUpperCase()).width + W * 0.024;
    const vh = W * 0.034;
    ctx.fillStyle = grade.band;
    ctx.fillRect(-vw, -vh / 2, vw, vh);
    ctx.strokeStyle = grade.bandText;
    ctx.lineWidth = Math.max(1.5, W * 0.0016);
    ctx.strokeRect(-vw, -vh / 2, vw, vh);
    ctx.fillStyle = grade.bandText;
    ctx.textAlign = 'center';
    ctx.fillText(cap.volume.toUpperCase(), -vw / 2, W * 0.0068);
    ctx.restore();
  }

  // 5 — stars + quote ABOVE the title block, then title, then subtitle
  // (titleText / titleSize / titleBase were computed before the panels)
  const cx = W / 2;
  if (cap.quote) {
    ctx.fillStyle = 'rgba(255,248,230,0.96)';
    ctx.font = `500 ${Math.max(11, W * 0.0165)}px ${OSWALD}`;
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 5;
    drawSpaced(ctx, cap.quote.toUpperCase(), cx, titleBase - titleSize * 1.46, W * 0.004);
    ctx.shadowBlur = 0;
  }
  const starN = Math.max(0, Math.min(5, cap.stars | 0));
  if (starN > 0) {
    const sr = titleSize * 0.155;
    const gap = sr * 2.5;
    const totalW = gap * (starN - 1);
    for (let i = 0; i < starN; i++) {
      starPath(ctx, cx - totalW / 2 + i * gap, titleBase - titleSize * 1.13, sr);
      ctx.fillStyle = '#ffd76e';
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,6,15,0.85)';
      ctx.lineWidth = sr * 0.14;
      ctx.stroke();
    }
  }
  // title: hard shadow copy, thick outline, gradient fill
  ctx.textAlign = 'center';
  ctx.font = `400 ${titleSize}px ${ANTON}`;
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(12,3,10,0.88)';
  ctx.fillText(titleText, cx + titleSize * 0.055, titleBase + titleSize * 0.075);
  ctx.strokeStyle = '#14060f';
  ctx.lineWidth = titleSize * 0.17;
  ctx.strokeText(titleText, cx, titleBase);
  const tg = ctx.createLinearGradient(0, titleBase - titleSize * 0.78, 0, titleBase + titleSize * 0.1);
  tg.addColorStop(0, grade.titleTop);
  if (grade.titleMid) tg.addColorStop(0.52, grade.titleMid);
  tg.addColorStop(1, grade.titleBot);
  ctx.fillStyle = tg;
  ctx.fillText(titleText, cx, titleBase);
  // subtitle: neon script with a dark stroke so it holds over bright art
  if (cap.subtitle) {
    const subSize = fitFontSize(ctx, cap.subtitle, W * 0.8, W * 0.047, PACIFICO);
    const subY = titleBase + subSize * 1.32;
    ctx.font = `400 ${subSize}px ${PACIFICO}`;
    ctx.strokeStyle = 'rgba(20,4,16,0.92)';
    ctx.lineWidth = subSize * 0.16;
    ctx.strokeText(cap.subtitle, cx, subY);
    ctx.shadowColor = grade.script;
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillStyle = grade.script;
    ctx.fillText(cap.subtitle, cx, subY);
    ctx.fillText(cap.subtitle, cx, subY);
    ctx.shadowBlur = 0;
  }

  // 6 — starburst seal (right side, clear of the volume tag)
  if (cap.seal) {
    const sr = W * (view.sizeId === 'portrait' ? 0.068 : 0.056);
    const sx = W * (view.sizeId === 'portrait' ? 0.845 : 0.878);
    const sy = H * (view.sizeId === 'portrait' ? 0.128 : 0.185);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(-0.14);
    starburstPath(ctx, 0, 0, sr);
    const sg = ctx.createRadialGradient(-sr * 0.3, -sr * 0.3, sr * 0.1, 0, 0, sr);
    sg.addColorStop(0, '#ffe9a8');
    sg.addColorStop(1, '#e8a93a');
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.strokeStyle = '#7a4a08';
    ctx.lineWidth = Math.max(1.5, sr * 0.045);
    ctx.stroke();
    ctx.fillStyle = '#40160a';
    ctx.textAlign = 'center';
    const words = cap.seal.toUpperCase().split(/\s+/);
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > 9 && line) {
        lines.push(line);
        line = w;
      } else line = (line + ' ' + w).trim();
    }
    if (line) lines.push(line);
    const ls = sr * 0.30;
    ctx.font = `700 ${ls}px ${OSWALD}`;
    lines.slice(0, 3).forEach((ln, i) => {
      ctx.fillText(ln, 0, (i - (Math.min(lines.length, 3) - 1) / 2) * ls * 1.12 + ls * 0.35);
    });
    ctx.restore();
  }

  // 7 — bottom band: gradient, palm silhouettes, tagline — in that order,
  //     so nothing in the band can garble what is drawn after it
  //     (bandH / bandTop were computed before the panels)
  const bg = ctx.createLinearGradient(0, bandTop, 0, H);
  bg.addColorStop(0, grade.band);
  bg.addColorStop(1, '#06030a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, bandTop, W, bandH);
  ctx.fillStyle = grade.bandText;
  ctx.fillRect(0, bandTop, W, Math.max(2, H * 0.0035));
  const palmH = bandH * 0.92;
  drawBandPalm(ctx, W * 0.045, H - bandH * 0.06, palmH, 'rgba(0,0,0,0.6)');
  drawBandPalm(ctx, W * 0.115, H - bandH * 0.06, palmH * 0.78, 'rgba(0,0,0,0.5)');
  drawBandPalm(ctx, W * 0.80, H - bandH * 0.06, palmH * 0.82, 'rgba(0,0,0,0.5)');
  if (cap.tagline) {
    const tSize = fitFontSize(ctx, cap.tagline.toUpperCase(), W * 0.56, W * 0.021, OSWALD, 600);
    ctx.font = `600 ${tSize}px ${OSWALD}`;
    ctx.fillStyle = grade.bandText;
    ctx.textAlign = 'center';
    drawSpaced(ctx, cap.tagline.toUpperCase(), cx, bandTop + bandH * 0.64, W * 0.0035);
  }
  // barcode, bottom-right inside the band
  {
    const bw = W * 0.072;
    const bh = bandH * 0.6;
    const bx = W - bw - W * 0.016;
    const by = bandTop + bandH * 0.2;
    ctx.fillStyle = '#f7f2df';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#14100c';
    let seed = 7;
    for (const ch of cap.catalog || 'SS') seed = (seed * 31 + ch.charCodeAt(0)) % 9973;
    let x = bx + bw * 0.06;
    while (x < bx + bw * 0.92) {
      seed = (seed * 137 + 71) % 9973;
      const wdt = (1 + (seed % 3)) * (bw * 0.016);
      if (seed % 5 !== 0) ctx.fillRect(x, by + bh * 0.08, wdt, bh * 0.84);
      x += wdt + bw * 0.014;
    }
  }

  // 8 — wanted pill AFTER the band: opaque fill, nothing bleeds through
  if (cap.wanted) {
    ctx.save();
    ctx.font = `700 ${W * 0.0175}px ${OSWALD}`;
    const label = cap.wanted.toUpperCase();
    const pw = ctx.measureText(label).width + W * 0.034;
    const ph = W * 0.033;
    ctx.translate(W * 0.868, bandTop - ph * 0.12);
    ctx.rotate(-0.03);
    ctx.fillStyle = '#f5e7c6';
    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph, ph * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#40160a';
    ctx.lineWidth = Math.max(1.5, W * 0.0018);
    ctx.stroke();
    ctx.fillStyle = '#a31621';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, W * 0.0062);
    ctx.restore();
  }

  // 9 — film grain + paper warmth over everything photographic
  if (fx.grain > 0) {
    ctx.save();
    ctx.globalAlpha = (fx.grain / 100) * 0.16;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(getNoiseTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (fx.paper) {
    ctx.fillStyle = 'rgba(250,240,214,0.05)';
    ctx.fillRect(0, 0, W, H);
  }

  // 10 — selected-panel outline (editor only, never on exports)
  if (!view.forExport && view.selected >= 0) {
    const pts = panels[view.selected];
    if (pts) {
      panelPath(ctx, pts, W, H);
      ctx.strokeStyle = '#ff5fa2';
      ctx.lineWidth = Math.max(2, W * 0.0035);
      ctx.setLineDash([W * 0.012, W * 0.008]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

// Render a view onto a fresh canvas at exact pixel size (exports, shots).
export function renderCoverCanvas(view, W, H) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  drawCover(c.getContext('2d'), W, H, view);
  return c;
}
