/**
 * Laisee packet compositor.
 * Prefers local /api/generate proxy (Gemini / OpenRouter); keys stay on the server.
 * Falls back to Canvas composite when proxy is missing, unconfigured, or fails.
 *
 * Never hardcode API keys in the browser.
 */

import { STYLES, CATEGORIES, PET_STYLES, KIDS_STYLES, getStylesByCategory, buildPacketPrompt } from './styles.js?v=20261022k';

export { STYLES, CATEGORIES, PET_STYLES, KIDS_STYLES, getStylesByCategory, buildPacketPrompt };

const STYLE_IDS = STYLES.map((s) => s.id);

/** Front-panel image paths (cropped from full die-cuts). */
const STYLE_IMAGES = Object.fromEntries(
  STYLES.map((s) => [s.id, s.image.includes('?') ? s.image : `${s.image}?v=20261022k`])
);

const STYLE_THUMBS = Object.fromEntries(
  STYLES.map((s) => [s.id, s.thumb])
);

export { STYLE_IDS, STYLE_IMAGES, STYLE_THUMBS };

/** Print-ready: 3.5×6.75 in @ 300 dpi → 1050×2025 (ratio 14:27). */
export const PRINT_SPEC = {
  widthIn: 3.5,
  heightIn: 6.75,
  dpi: 300,
  widthPx: 1050,
  heightPx: 2025,
  /** Approximate safe inset from trim (inches) for key text/faces */
  safeInsetIn: 0.15,
  /** Typical commercial bleed if shop requires it (inches) */
  bleedIn: 0.125,
  /**
   * With-bleed canvas (preferred neat inches):
   * (3.5+0.25)×(6.75+0.25) = 3.75×7 in @ 300 dpi → 1125×2100.
   * Trim 1050×2025 is centered; side pads are ~37–38 px.
   */
  bleedWidthPx: 1125,
  bleedHeightPx: 2100,
  /** Round(bleedIn × dpi); informational — actual pad from withBleed dims */
  bleedInsetPx: 38,
};

/** Layout for placing trim artwork inside the with-bleed canvas. */
export function getPrintBleedLayout(trimW = PRINT_SPEC.widthPx, trimH = PRINT_SPEC.heightPx) {
  const outW = PRINT_SPEC.bleedWidthPx;
  const outH = PRINT_SPEC.bleedHeightPx;
  const offsetX = Math.floor((outW - trimW) / 2);
  const offsetY = Math.floor((outH - trimH) / 2);
  return {
    trimW,
    trimH,
    outW,
    outH,
    offsetX,
    offsetY,
    padLeft: offsetX,
    padTop: offsetY,
    padRight: outW - offsetX - trimW,
    padBottom: outH - offsetY - trimH,
  };
}

/**
 * Edge-clamp / edge-extend RGBA into a larger buffer (no white borders).
 * Pixels outside trim sample the nearest trim-edge color.
 * @param {Uint8ClampedArray|Uint8Array} src RGBA length trimW*trimH*4
 * @returns {{ width: number, height: number, data: Uint8ClampedArray, offsetX: number, offsetY: number, trimW: number, trimH: number }}
 */
export function bleedExtendRgba(src, trimW, trimH, outW = PRINT_SPEC.bleedWidthPx, outH = PRINT_SPEC.bleedHeightPx) {
  const ox = Math.floor((outW - trimW) / 2);
  const oy = Math.floor((outH - trimH) / 2);
  const data = new Uint8ClampedArray(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    const sy = Math.min(trimH - 1, Math.max(0, y - oy));
    for (let x = 0; x < outW; x++) {
      const sx = Math.min(trimW - 1, Math.max(0, x - ox));
      const si = (sy * trimW + sx) * 4;
      const di = (y * outW + x) * 4;
      data[di] = src[si];
      data[di + 1] = src[si + 1];
      data[di + 2] = src[si + 2];
      data[di + 3] = src[si + 3];
    }
  }
  return { width: outW, height: outH, data, offsetX: ox, offsetY: oy, trimW, trimH };
}

/**
 * Build a with-bleed canvas from a trim-sized source (edge-extend red/edge colors).
 * Preview stays at trim; call this only for print download.
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {HTMLCanvasElement}
 */
export function canvasWithBleed(sourceCanvas) {
  const trimW = sourceCanvas.width;
  const trimH = sourceCanvas.height;
  const outW = PRINT_SPEC.bleedWidthPx;
  const outH = PRINT_SPEC.bleedHeightPx;
  const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const srcImg = srcCtx.getImageData(0, 0, trimW, trimH);
  const extended = bleedExtendRgba(srcImg.data, trimW, trimH, outW, outH);
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  out.getContext('2d').putImageData(new ImageData(extended.data, outW, outH), 0, 0);
  return out;
}

/**
 * @param {HTMLCanvasElement} sourceCanvas
 * @returns {Promise<{ canvas: HTMLCanvasElement, blob: Blob, dataUrl: string }>}
 */
export async function exportPngWithBleed(sourceCanvas) {
  const canvas = canvasWithBleed(sourceCanvas);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  return { canvas, blob, dataUrl: canvas.toDataURL('image/png') };
}

/**
 * Trace the full unfolded laisee die-cut outer contour in 930×1024 base coordinates.
 */
function traceDiecutOuterPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(81, 187);
  ctx.lineTo(456, 187);
  ctx.lineTo(478, 175);
  ctx.ellipse(667.5, 175, 189.5, 94, 0, Math.PI, 0, false);
  ctx.lineTo(926, 190);
  ctx.lineTo(926, 890);
  ctx.lineTo(857, 905);
  ctx.arcTo(843, 1004, 667.5, 1004, 24);
  ctx.arcTo(492, 1004, 478, 905, 24);
  ctx.lineTo(478, 905);
  ctx.lineTo(456, 893);
  ctx.lineTo(81, 893);
  ctx.closePath();
}

/**
 * Build a full unfolded die-cut panorama canvas (全景刀模展開圖) with the generated
 * front artwork embedded in the right-hand front panel and matching back/flaps/cut lines.
 * @param {HTMLCanvasElement} sourceCanvas - trim-sized front artwork canvas
 * @param {{ styleId?: string, scale?: number }} [opts]
 * @returns {HTMLCanvasElement}
 */
export function canvasWithDiecut(sourceCanvas, { styleId = 'style01', scale = 2 } = {}) {
  const baseW = 930;
  const baseH = 1024;
  const out = document.createElement('canvas');
  out.width = Math.round(baseW * scale);
  out.height = Math.round(baseH * scale);
  const ctx = out.getContext('2d');

  ctx.save();
  ctx.scale(scale, scale);

  // Clean white sheet background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, baseW, baseH);

  // Envelope body fill (slate-blue for style03 Snow Persimmon, classic crimson for all others)
  const envColor = styleId === 'style03' ? '#496f9a' : '#b52a2d';
  traceDiecutOuterPath(ctx);
  ctx.fillStyle = envColor;
  ctx.fill();

  // Draw the generated AI/Canvas front artwork into the front panel (478, 175, 379, 730)
  ctx.save();
  ctx.beginPath();
  ctx.rect(478, 175, 379, 730);
  ctx.clip();
  coverDrawImage(ctx, sourceCanvas, 478, 175, 379, 730);
  ctx.restore();

  // Dashed cyan fold lines around the front panel
  const dieLineColor = '#1682a7';
  ctx.save();
  ctx.strokeStyle = dieLineColor;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([12, 7]);
  ctx.strokeRect(478, 175, 379, 730);
  ctx.restore();

  // Solid cyan outer cut line around the entire unfolded envelope
  ctx.save();
  traceDiecutOuterPath(ctx);
  ctx.strokeStyle = dieLineColor;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  // Back flap insertion slot cut line on left back panel
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(163, 306);
  ctx.arc(192, 306, 29, Math.PI, 1.5 * Math.PI, false);
  ctx.lineTo(349, 277);
  ctx.arc(349, 306, 29, 1.5 * Math.PI, 0, false);
  ctx.strokeStyle = dieLineColor;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();

  ctx.restore();
  return out;
}

/**
 * Export full unfolded die-cut panorama PNG (全景刀模展開圖).
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {{ styleId?: string, scale?: number }} [opts]
 * @returns {Promise<{ canvas: HTMLCanvasElement, blob: Blob, dataUrl: string }>}
 */
export async function exportPngWithDiecut(sourceCanvas, opts = {}) {
  const canvas = canvasWithDiecut(sourceCanvas, opts);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  return { canvas, blob, dataUrl: canvas.toDataURL('image/png') };
}

const ASPECT_MAP = {
  '2:3': { w: PRINT_SPEC.widthPx, h: PRINT_SPEC.heightPx }, // alias → packet
  packet: { w: PRINT_SPEC.widthPx, h: PRINT_SPEC.heightPx }, // 3.5×6.75 in @ 300 dpi
  '3:2': { w: PRINT_SPEC.heightPx, h: PRINT_SPEC.widthPx },
  '1:1': { w: 1080, h: 1080 },
};

const imageCache = new Map();

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function loadImage(src) {
  if (!src) return Promise.reject(new Error('missing image src'));
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

/** object-fit: cover */
function coverDrawImage(ctx, img, dx, dy, dw, dh, ox = 0, oy = 0, scaleMul = 1) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(dw / iw, dh / ih) * scaleMul;
  const sw = dw / scale;
  const sh = dh / scale;
  let sx = (iw - sw) / 2 + ox * iw;
  let sy = (ih - sh) / 2 + oy * ih;
  sx = Math.max(0, Math.min(iw - sw, sx));
  sy = Math.max(0, Math.min(ih - sh, sy));
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

function drawGoldBorder(ctx, w, h, inset = 33, thickness = 8, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#f5e0a0');
  grad.addColorStop(0.35, '#e1bd62');
  grad.addColorStop(0.7, '#c9a03a');
  grad.addColorStop(1, '#f0d078');
  ctx.strokeStyle = grad;
  ctx.lineWidth = thickness;
  const rOuter = Math.round(Math.min(w, h) * 0.023);
  const rInner = Math.round(Math.min(w, h) * 0.014);
  const innerPad = Math.round(Math.min(w, h) * 0.011);
  roundRect(ctx, inset, inset, w - inset * 2, h - inset * 2, rOuter);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,180,0.45)';
  ctx.lineWidth = Math.max(1, thickness * 0.3);
  roundRect(ctx, inset + innerPad, inset + innerPad, w - (inset + innerPad) * 2, h - (inset + innerPad) * 2, rInner);
  ctx.stroke();
  ctx.restore();
}

function drawCornerOrnaments(ctx, w, h, color, rng, opacity = 0.85) {
  const size = Math.min(w, h) * 0.07;
  const m = Math.round(Math.min(w, h) * 0.051); // ~36 @ 700-wide
  const positions = [
    [m, m, 0],
    [w - m, m, Math.PI / 2],
    [w - m, h - m, Math.PI],
    [m, h - m, -Math.PI / 2],
  ];
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  for (const [x, y, rot] of positions) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.2, size * 0.55, size, size * 0.15);
    ctx.quadraticCurveTo(size * 0.55, size * 0.2, size * 0.15, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.35, size * 0.35, 2.5 + rng() * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawGoldText(ctx, text, x, y, fontSize, maxWidth) {
  ctx.save();
  ctx.font = `700 ${fontSize}px "Noto Serif TC", "Songti TC", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(40,10,8,0.45)';
  ctx.fillText(text, x + 2, y + 3, maxWidth);
  const grad = ctx.createLinearGradient(x - maxWidth / 2, y - fontSize, x + maxWidth / 2, y + fontSize);
  grad.addColorStop(0, '#fff8d6');
  grad.addColorStop(0.4, '#f0d078');
  grad.addColorStop(0.7, '#e1bd62');
  grad.addColorStop(1, '#c9a03a');
  ctx.fillStyle = grad;
  ctx.fillText(text, x, y, maxWidth);
  ctx.strokeStyle = 'rgba(90,50,10,0.55)';
  ctx.lineWidth = Math.max(1, fontSize / 28);
  ctx.strokeText(text, x, y, maxWidth);
  ctx.restore();
}

function parseTweak(tweak = '') {
  const t = (tweak || '').toLowerCase();
  return {
    moreGold: /金|gold|金色/.test(t),
    biggerText: /大|bigger|larger|賀詞/.test(t),
    moreDecor: /裝飾|decor|多/.test(t),
    shiftLayout: /佈局|layout|換/.test(t) || t.length > 0,
  };
}

function drawPhotoWindow(ctx, photos, area, rng, tweak) {
  const { x, y, w, h } = area;
  const n = Math.min(photos.length, 5);
  if (n === 0) return;

  const scaleMul = tweak.shiftLayout ? 1 + (rng() - 0.5) * 0.12 : 1;
  const ox = tweak.shiftLayout ? (rng() - 0.5) * 0.08 : 0;
  const oy = tweak.shiftLayout ? (rng() - 0.5) * 0.08 : 0;
  const radius = 18;

  ctx.save();
  // soft shadow behind window
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();

  if (n === 1) {
    coverDrawImage(ctx, photos[0], x, y, w, h, ox, oy, scaleMul);
  } else if (n === 2) {
    const half = w / 2;
    coverDrawImage(ctx, photos[0], x, y, half, h, ox, oy, scaleMul);
    coverDrawImage(ctx, photos[1], x + half, y, half, h, -ox, oy, scaleMul);
  } else {
    const mainW = w * 0.62;
    coverDrawImage(ctx, photos[0], x, y, mainW, h, ox, oy, scaleMul);
    const sideW = w - mainW;
    const sideH = h / (n - 1);
    for (let i = 1; i < n; i++) {
      coverDrawImage(
        ctx,
        photos[i],
        x + mainW,
        y + (i - 1) * sideH,
        sideW,
        sideH,
        0,
        (rng() - 0.5) * 0.05,
        scaleMul
      );
    }
  }

  // soft inner vignette for blend with packet art
  const vg = ctx.createRadialGradient(
    x + w / 2, y + h / 2, Math.min(w, h) * 0.2,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.72
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(80,15,15,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  // gold frame
  ctx.save();
  const fg = ctx.createLinearGradient(x, y, x + w, y + h);
  fg.addColorStop(0, '#fff3c4');
  fg.addColorStop(0.5, '#e1bd62');
  fg.addColorStop(1, '#c9a03a');
  ctx.strokeStyle = fg;
  ctx.lineWidth = 4;
  roundRect(ctx, x - 1, y - 1, w + 2, h + 2, radius + 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,240,180,0.5)';
  ctx.lineWidth = 1.25;
  roundRect(ctx, x + 5, y + 5, w - 10, h - 10, radius - 4);
  ctx.stroke();
  ctx.restore();
}

/** Rich crimson contrast header plaque under top greeting (cleanly covers baked-in sample calligraphy on template backgrounds). */
function drawTopScrim(ctx, w, h, scrimBottom) {
  ctx.save();
  const g = ctx.createLinearGradient(0, 0, 0, scrimBottom);
  g.addColorStop(0, '#6e1214');
  g.addColorStop(0.82, '#8a1b1e');
  g.addColorStop(1, 'rgba(138,27,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, scrimBottom);
  ctx.restore();
}

/** Paint a rich crimson-and-gold festive backdrop for styles whose template image is a wireframe placeholder (style09/style10). */
function drawFestiveFallbackBase(ctx, w, h, rng) {
  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#a61c20');
  bg.addColorStop(0.5, '#c93437');
  bg.addColorStop(1, '#7c1619');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Warm central radial glow behind subject area
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.45, w * 0.08, w * 0.5, h * 0.45, w * 0.65);
  glow.addColorStop(0, 'rgba(245, 224, 160, 0.22)');
  glow.addColorStop(1, 'rgba(181, 42, 45, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Subtle festive gold bokeh / blossoms
  ctx.fillStyle = 'rgba(240, 208, 120, 0.16)';
  for (let i = 0; i < 18; i++) {
    const cx = (0.08 + rng() * 0.84) * w;
    const cy = (0.12 + rng() * 0.78) * h;
    const r = (0.012 + rng() * 0.028) * w;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}


/** Max edge for photos sent to the AI proxy (keeps payload small and fast). */
const AI_PHOTO_MAX_EDGE = 896;

/**
 * Encode an HTMLImageElement as a JPEG data URL for /api/generate.
 * Fills white backdrop first so transparent PNGs never turn black in JPEG.
 * @param {HTMLImageElement} img
 * @returns {string}
 */
function imageToJpegDataUrl(img, maxEdge = AI_PHOTO_MAX_EDGE) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) throw new Error('empty photo');
  const scale = Math.min(1, maxEdge / Math.max(iw, ih));
  const w = Math.max(1, Math.round(iw * scale));
  const h = Math.max(1, Math.round(ih * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/jpeg', 0.82);
}

/**
 * Load a data URL into a canvas sized to packet aspect (or natural size).
 * @param {string} dataUrl
 * @param {{ w: number, h: number }} dims
 */
async function dataUrlToCanvas(dataUrl, dims) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext('2d');
  coverDrawImage(ctx, img, 0, 0, dims.w, dims.h);
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  return { canvas, blob, dataUrl: canvas.toDataURL('image/png') };
}

/**
 * Call local serverless/proxy. No API key in the browser.
 * @returns {Promise<object|null>} null means soft-skip to canvas
 */
async function tryProxyGenerate({ prompt, photos, style, endpoint }) {
  const url = endpoint || '/api/generate';
  // Style template FIRST, then user photos (max 2–3 user shots; Image API ~3 refs total).
  // Skip sending wireframe placeholder templates (style09/style10) so AI doesn't copy placeholder stick-figures/text.
  const styleMeta = STYLES.find((s) => s.id === style);
  let styleImage = null;
  if (!styleMeta?.skipTemplateImage) {
    try {
      const styleSrc = STYLE_IMAGES[style] || STYLE_IMAGES.style01;
      if (styleSrc) {
        const styleImg = await loadImage(styleSrc);
        // Keep template compact and readable to the model.
        styleImage = imageToJpegDataUrl(styleImg, 1024);
      }
    } catch (err) {
      console.warn('[laisee] style template encode failed', err);
    }
  }

  let photoPayload = [];
  try {
    const maxUser = styleImage ? 2 : 3;
    photoPayload = photos.slice(0, maxUser).map((img) => imageToJpegDataUrl(img));
  } catch (err) {
    console.warn('[laisee] photo encode failed', err);
  }

  const body = { prompt, photos: photoPayload };
  if (styleImage) body.styleImage = styleImage;

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    throw new Error(`AI proxy non-JSON (${res.status})`);
  }

  if (!res.ok || !json?.ok) {
    const err = new Error(json?.message || `AI proxy HTTP ${res.status}`);
    err.code = json?.error || 'PROXY_ERROR';
    err.fallback = json?.fallback !== false;
    err.ai = json?.ai;
    throw err;
  }

  const dataUrl = json.dataUrl || (json.imageBase64
    ? `data:${json.mime || 'image/png'};base64,${json.imageBase64}`
    : null);
  if (!dataUrl) {
    const err = new Error('AI proxy returned no image');
    err.fallback = true;
    throw err;
  }
  return {
    dataUrl,
    provider: json.provider,
    model: json.model,
    mode: json.mode || 'ai',
  };
}

/**
 * Generate a front-face laisee packet on a canvas.
 * @param {object} opts
 * @param {string} opts.style - style id (style01…style10)
 * @param {string} opts.aspect - '2:3' | '3:2' | '1:1'
 * @param {HTMLImageElement[]} opts.photos
 * @param {string} opts.greeting
 * @param {string} [opts.message]
 * @param {string} [opts.tweak]
 * @param {object} [opts.api] - { useProxy?: boolean, endpoint?: string, requireRemote?: boolean }
 */
export async function generatePacket({
  style = 'style01',
  category = '',
  aspect = 'packet',
  photos = [],
  greeting = '恭喜發財',
  message = '',
  tweak = '',
  api = null,
} = {}) {
  // Always vertical packet aspect (print 3.5×6.75; OpenRouter aspect_ratio 2:3).
  aspect = 'packet';

  const promptText = buildPacketPrompt({
    styleId: style,
    category,
    greeting,
    message,
    tweak,
  });

  const dims = ASPECT_MAP[aspect] || ASPECT_MAP.packet;

  // Prefer local /api/generate proxy (default on). Browser never holds the key.
  // api: { useProxy?: boolean, endpoint?: string, requireRemote?: boolean }
  // Legacy api.apiKey in the browser is ignored on purpose — use server env instead.
  const useProxy = !api || api.useProxy !== false;
  let limitNotice = null;
  if (useProxy) {
    try {
      const remote = await tryProxyGenerate({
        prompt: promptText,
        photos,
        style,
        endpoint: api?.endpoint,
      });
      const painted = await dataUrlToCanvas(remote.dataUrl, dims);
      const diecutCanvas = canvasWithDiecut(painted.canvas, { styleId: style });
      console.info(
        `[laisee] AI OK via proxy (${remote.provider || '?'} / ${remote.model || '?'})`
      );
      return {
        ...painted,
        diecutCanvas,
        styleId: style,
        prompt: promptText,
        mode: 'ai',
        provider: remote.provider,
        model: remote.model,
      };
    } catch (err) {
      const soft = err?.fallback !== false && !api?.requireRemote;
      console.warn(
        `[laisee] AI proxy → Canvas fallback (mode=canvas, not AI replace): ${err?.code || ''} ${err?.message || err}`
      );
      if (!soft) throw err;
      if (err?.code === 'RATE_LIMITED') {
        limitNotice = err.message;
      } else if (err?.message && err?.code !== 'AI_MOCK') {
        limitNotice = `${err.message}（已改用本地合成）`;
      }
      // continue to canvas composite (style base + photo window + user greeting)
    }
  }
  const w = dims.w;
  const h = dims.h;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const seedBase = `${style}|${aspect}|${greeting}|${message}|${tweak}|${Date.now() % 100000}`;
  const rng = mulberry32(hashSeed(seedBase));
  const tw = parseTweak(tweak);

  const styleMeta = STYLES.find((s) => s.id === style);
  const styleSrc = STYLE_IMAGES[style] || STYLE_IMAGES.style01;
  let styleImg = null;
  if (!styleMeta?.skipTemplateImage) {
    try {
      styleImg = await loadImage(styleSrc);
    } catch {
      styleImg = null;
    }
  }

  // Base layer: style front cover-fitted to canvas (or festive crimson backdrop for placeholder-template styles)
  if (styleImg) {
    const baseScale = tw.shiftLayout ? 1 + (rng() - 0.5) * 0.06 : 1;
    const baseOx = tw.shiftLayout ? (rng() - 0.5) * 0.04 : 0;
    const baseOy = tw.shiftLayout ? (rng() - 0.5) * 0.03 : 0;
    coverDrawImage(ctx, styleImg, 0, 0, w, h, baseOx, baseOy, baseScale);
  } else {
    drawFestiveFallbackBase(ctx, w, h, rng);
  }

  // Photo window — mid band; leave upper reserved for greeting (classic laisee)
  const winPadX = aspect === '3:2' ? w * 0.04 : w * 0.08;
  const winTop = h * 0.18;
  const winH = h * 0.50;
  const winW = w - winPadX * 2;
  let photoArea = {
    x: winPadX,
    y: winTop,
    w: winW,
    h: winH,
  };
  if (tw.shiftLayout) {
    photoArea.y += Math.floor((rng() - 0.5) * (h * 0.015));
    photoArea.x += Math.floor((rng() - 0.5) * (w * 0.017));
    photoArea.w = Math.min(winW, photoArea.w - Math.floor(rng() * (w * 0.011)));
  }
  if (aspect === '3:2') {
    photoArea = {
      x: w * 0.04,
      y: h * 0.08,
      w: w * 0.50,
      h: h * 0.72,
    };
  }

  if (photos.length) {
    drawPhotoWindow(ctx, photos, photoArea, rng, tw);
  }

  // Upper reserved band for greeting (match pack art / PRINT_SPEC safe inset ≥0.15in)
  const safePx = Math.round(PRINT_SPEC.safeInsetIn * PRINT_SPEC.dpi);
  const scrimBottom = message ? h * 0.24 : h * 0.18;
  drawTopScrim(ctx, w, h, scrimBottom);

  const ornamentOpacity = tw.moreDecor ? 0.95 : 0.55 + rng() * 0.35;
  drawCornerOrnaments(ctx, w, h, tw.moreGold ? '#f5e0a0' : '#e1bd62', rng, ornamentOpacity);
  drawGoldBorder(ctx, w, h, Math.round(w * 0.029), tw.moreGold ? Math.round(w * 0.01) : Math.round(w * 0.007), tw.moreGold ? 1 : 0.85);

  const greetSize = Math.round(
    (tw.biggerText ? 1.18 : 1) * Math.min(w, h) * (greeting.length > 8 ? 0.055 : 0.072)
  );
  // Center of greeting below safe inset; ~0.09–0.12 of height (classic upper plaque)
  const greetY = Math.max(
    safePx + Math.round(greetSize * 0.55),
    Math.round(h * (message ? 0.09 : 0.10))
  );
  drawGoldText(ctx, greeting, w / 2, greetY, greetSize, w - Math.round(w * 0.143));

  if (message) {
    ctx.save();
    ctx.font = `500 ${Math.round(Math.min(w, h) * 0.032)}px "Noto Sans TC", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,245,210,0.95)';
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 4;
    // Short message sits just under the greeting, still in the upper band
    ctx.fillText(message, w / 2, greetY + greetSize * 0.85, w - Math.round(w * 0.171));
    ctx.restore();
  }

  // year seal
  ctx.save();
  const sealR = Math.round(Math.min(w, h) * 0.037);
  const sealX = w - Math.round(w * 0.091);
  const sealY = h - Math.round(w * 0.091);
  ctx.beginPath();
  ctx.arc(sealX, sealY, sealR, 0, Math.PI * 2);
  ctx.fillStyle = '#8a1f22';
  ctx.fill();
  ctx.strokeStyle = '#e1bd62';
  ctx.lineWidth = Math.max(2, Math.round(w * 0.003));
  ctx.stroke();
  ctx.fillStyle = '#e1bd62';
  ctx.font = `700 ${Math.round(w * 0.019)}px "Noto Serif TC", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('2026', sealX, sealY);
  ctx.restore();

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  const dataUrl = canvas.toDataURL('image/png');
  const diecutCanvas = canvasWithDiecut(canvas, { styleId: style });
  console.info('[laisee] mode=canvas (local composite: style base + photo window; not AI template-replace)');
  return { canvas, diecutCanvas, styleId: style, blob, dataUrl, prompt: promptText, mode: 'canvas', notice: limitNotice };
}

/**
 * @deprecated Back / surname / 「福」 panel removed from UI (2026-10-22).
 * Kept for reference only — do not call from any UI path.
 */
async function generateBack({ surname = '', aspect = 'packet' } = {}) {
  aspect = 'packet';
  const text = String(surname || '').trim().slice(0, 2);
  if (!text) {
    throw new Error('Surname required');
  }
  const dims = ASPECT_MAP[aspect] || ASPECT_MAP.packet;
  const w = dims.w;
  const h = dims.h;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#c93437');
  g.addColorStop(1, '#8a1f22');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  drawGoldBorder(ctx, w, h, Math.round(w * 0.043), Math.round(w * 0.009));

  // subtle lattice
  ctx.save();
  ctx.strokeStyle = '#e1bd62';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.12;
  const margin = Math.round(w * 0.057);
  const step = Math.round(w * 0.051);
  for (let x = margin; x < w - margin; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, margin);
    ctx.lineTo(x, h - margin);
    ctx.stroke();
  }
  for (let y = margin; y < h - margin; y += step) {
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(w - margin, y);
    ctx.stroke();
  }
  ctx.restore();

  const size = text.length === 1 ? Math.min(w, h) * 0.38 : Math.min(w, h) * 0.28;
  ctx.save();
  ctx.font = `700 ${size}px "Noto Serif TC", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillText(text, w / 2 + 4, h / 2 + 6);
  const grad = ctx.createLinearGradient(w / 2 - size, h / 2 - size, w / 2 + size, h / 2 + size);
  grad.addColorStop(0, '#fff3c4');
  grad.addColorStop(0.5, '#e1bd62');
  grad.addColorStop(1, '#c9a03a');
  ctx.fillStyle = grad;
  ctx.fillText(text, w / 2, h / 2);
  ctx.strokeStyle = 'rgba(100,60,10,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeText(text, w / 2, h / 2);
  ctx.restore();

  ctx.save();
  ctx.translate(w * 0.18, h * 0.5);
  ctx.rotate(-Math.PI / 2);
  ctx.font = `600 ${Math.round(w * 0.031)}px "Noto Serif TC", serif`;
  ctx.fillStyle = 'rgba(225,189,98,0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('新春利是', 0, 0);
  ctx.restore();

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
  return { canvas, blob, dataUrl: canvas.toDataURL('image/png') };
}

/** Draw real front-panel thumbnail into a style card canvas (cover). */
export function paintStylePreview(canvas, styleId) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || 120;
  const cssH = canvas.clientHeight || 180;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = cssW;
  const h = cssH;

  ctx.fillStyle = '#8a1f22';
  ctx.fillRect(0, 0, w, h);

  const src = STYLE_THUMBS[styleId] || STYLE_IMAGES[styleId];
  if (!src) return;

  loadImage(src)
    .then((img) => {
      coverDrawImage(ctx, img, 0, 0, w, h);
      // thin gold edge
      ctx.save();
      ctx.strokeStyle = 'rgba(225,189,98,0.7)';
      ctx.lineWidth = 2;
      roundRect(ctx, 1, 1, w - 2, h - 2, 6);
      ctx.stroke();
      ctx.restore();
    })
    .catch(() => {
      ctx.fillStyle = '#b52a2d';
      ctx.fillRect(0, 0, w, h);
    });
}
