import { t } from './i18n.js?v=20261022k';
import { ensureAuth, setAuthLang } from './auth.js?v=20261022k';
import { generatePacket, STYLE_IDS, STYLE_THUMBS, STYLE_IMAGES, STYLES, getStylesByCategory, PRINT_SPEC, exportPngWithBleed, exportPngWithDiecut, canvasWithDiecut } from './generate.js?v=20261022k';

const STYLE_LABEL_KEYS = {
  style01: 'styleStyle01',
  style02: 'styleStyle02',
  style03: 'styleStyle03',
  style04: 'styleStyle04',
  style05: 'styleStyle05',
  style06: 'styleStyle06',
  style07: 'styleStyle07',
  style08: 'styleStyle08',
  style09: 'styleStyle09',
  style10: 'styleStyle10',
  style11: 'styleStyle11',
  style12: 'styleStyle12',
  style13: 'styleStyle13',
};

const GREETING_PRESETS_BY_CATEGORY = {
  pet: [
    { id: 'congrats', key: 'greetingCongrats', value: '恭喜發財' },
    { id: 'happy', key: 'greetingHappy', value: '新年快樂' },
    { id: 'health', key: 'greetingHealth', value: '身體健康' },
    { id: 'chubby', key: 'greetingChubby', value: '肥肥白白' },
    { id: 'treats', key: 'greetingTreats', value: '罐罐常滿' },
    { id: 'wish', key: 'greetingWish', value: '心想事成' },
    { id: 'hny', key: 'greetingHny', value: 'Happy New Year' },
    { id: 'custom', key: 'greetingCustom', value: '' },
  ],
  kids: [
    { id: 'congrats', key: 'greetingCongrats', value: '恭喜發財' },
    { id: 'grow', key: 'greetingGrow', value: '快高長大' },
    { id: 'smart', key: 'greetingSmart', value: '聰明伶俐' },
    { id: 'study', key: 'greetingStudy', value: '學業進步' },
    { id: 'happy', key: 'greetingHappy', value: '新年快樂' },
    { id: 'health', key: 'greetingHealth', value: '身體健康' },
    { id: 'hny', key: 'greetingHny', value: 'Happy New Year' },
    { id: 'custom', key: 'greetingCustom', value: '' },
  ],
};

function getGreetingPresets(cat = state.category) {
  return GREETING_PRESETS_BY_CATEGORY[cat === 'kids' ? 'kids' : 'pet'];
}

const state = {
  lang: 'zh-Hant',
  step: 1,
  agreed: false,
  category: 'pet', // 'pet' | 'kids'
  aspect: 'packet',
  style: null,
  photos: [], // { id, url, img }
  greetingId: 'congrats',
  customGreeting: '',
  message: '',
  tweak: '',
  previewView: 'diecut', // 'diecut' | 'front'
  result: null, // { canvas, diecutCanvas, blob, dataUrl }
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function toast(msg, opts = {}) {
  const el = $('#app-toast');
  if (!el) return;
  const isError = !!opts.error;
  el.textContent = msg;
  el.classList.toggle('is-error', isError);
  el.setAttribute('role', isError ? 'alert' : 'status');
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.classList.remove('show');
    el.classList.remove('is-error');
  }, 2600);
}

function tr(key, vars) {
  return t(state.lang, key, vars);
}

function applyI18n() {
  $$('[data-i18n]').forEach((el) => {
    if (el.closest('.lang-toggle')) return;
    if (el.children.length > 0) return;
    const key = el.getAttribute('data-i18n');
    el.textContent = tr(key);
  });
  $$('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = tr(el.getAttribute('data-i18n-placeholder'));
  });
  $$('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', tr(el.getAttribute('data-i18n-aria')));
  });
  // style card labels + captions
  $$('.style-card').forEach((card) => {
    const id = card.dataset.style;
    const styleMeta = STYLES.find((s) => s.id === id);
    const name = tr(STYLE_LABEL_KEYS[id]);
    const label = card.querySelector('.label');
    if (label) label.textContent = name;
    const thumb = card.querySelector('.style-thumb');
    if (thumb) thumb.alt = name;
    card.setAttribute('aria-label', name);
    const caption = card.querySelector('.caption');
    if (caption && styleMeta) {
      caption.textContent = state.lang === 'en' ? styleMeta.captionEn : styleMeta.captionZh;
    }
  });
  // photo remove buttons
  $$('.photo-thumb .remove').forEach((btn) => {
    btn.setAttribute('aria-label', tr('removePhoto'));
  });
  // greeting chips
  const presets = getGreetingPresets();
  $$('.greeting-chip').forEach((chip) => {
    const preset = presets.find((p) => p.id === chip.dataset.gid);
    if (preset) chip.textContent = tr(preset.key);
  });
  syncCategoryCopy();
  updateUploadCount();
  updateStepIndicator();
  document.documentElement.lang = state.lang === 'en' ? 'en' : 'zh-Hant';
}

function syncCategoryCopy() {
  const isKids = state.category === 'kids';
  const styleHint = $('#pick-style-hint');
  if (styleHint) {
    const key = isKids ? 'pickStyleHintKids' : 'pickStyleHintPet';
    styleHint.setAttribute('data-i18n', key);
    styleHint.textContent = tr(key);
  }
  const upTitle = $('#upload-title');
  if (upTitle) {
    const key = isKids ? 'uploadTitleKids' : 'uploadTitlePet';
    upTitle.setAttribute('data-i18n', key);
    upTitle.textContent = tr(key);
  }
  const upHint = $('#upload-hint');
  if (upHint) {
    const key = isKids ? 'uploadHintKids' : 'uploadHintPet';
    upHint.setAttribute('data-i18n', key);
    upHint.textContent = tr(key);
  }
  const addBtn = $('#btn-add-photo');
  if (addBtn) {
    const key = isKids ? 'uploadAddKids' : 'uploadAddPet';
    addBtn.setAttribute('data-i18n', key);
    addBtn.textContent = tr(key);
  }
}

function updateStepIndicator() {
  const el = $('#step-indicator');
  if (state.step === 1) {
    el.textContent = '';
    el.hidden = true;
  } else {
    el.hidden = false;
    el.textContent = tr('stepOf', { n: state.step });
  }
}

function showScreen(step) {
  state.step = step;
  $$('.screen').forEach((s) => {
    const on = Number(s.dataset.step) === step;
    s.classList.toggle('active', on);
    s.hidden = !on;
    s.setAttribute('aria-hidden', on ? 'false' : 'true');
  });
  updateStepIndicator();
  updateFooter();
  // focus first heading / interactive
  const active = $(`.screen[data-step="${step}"]`);
  const focusTarget = active?.querySelector('h1, h2, [tabindex="0"], button, .dropzone');
  focusTarget?.focus?.({ preventScroll: true });
}

function updateFooter() {
  const footer = $('#footer-actions');
  const backBtn = $('#btn-back');
  const nextBtn = $('#btn-next');
  footer.classList.remove('hidden');

  if (state.step === 1 || state.step === 6) {
    footer.classList.add('hidden');
    return;
  }

  backBtn.classList.remove('hidden');
  nextBtn.classList.remove('hidden');

  if (state.step === 2) {
    nextBtn.textContent = tr('agree');
    nextBtn.disabled = !state.agreed;
  } else if (state.step === 5) {
    nextBtn.textContent = tr('generate');
    nextBtn.disabled = false;
  } else {
    nextBtn.textContent = tr('next');
    if (state.step === 3) nextBtn.disabled = !state.style;
    else if (state.step === 4) nextBtn.disabled = state.photos.length < 1;
    else nextBtn.disabled = false;
  }
}

function setLang(lang) {
  state.lang = lang;
  $$('.lang-toggle button').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
  });
  setAuthLang(lang);
  applyI18n();
  updateFooter();
}

function buildStyleGrid() {
  const grid = $('#style-grid');
  grid.innerHTML = '';
  const visibleStyles = getStylesByCategory(state.category);
  visibleStyles.forEach((styleMeta) => {
    const id = styleMeta.id;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'style-card';
    btn.dataset.style = id;
    btn.dataset.category = styleMeta.category;
    btn.setAttribute('aria-pressed', state.style === id ? 'true' : 'false');
    btn.setAttribute('aria-label', tr(STYLE_LABEL_KEYS[id]));
    const img = document.createElement('img');
    img.className = 'style-thumb';
    img.alt = tr(STYLE_LABEL_KEYS[id]);
    img.decoding = 'async';
    img.loading = 'lazy';
    img.src = (STYLE_THUMBS[id] || STYLE_IMAGES[id] || '').replace(/(\?v=)\w+/, '$1ratio') || STYLE_IMAGES[id];
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = tr(STYLE_LABEL_KEYS[id]);
    const caption = document.createElement('span');
    caption.className = 'caption';
    caption.textContent = styleMeta
      ? (state.lang === 'en' ? styleMeta.captionEn : styleMeta.captionZh)
      : '';
    btn.append(img, label, caption);
    btn.addEventListener('click', () => selectStyle(id));
    grid.appendChild(btn);
  });
}

function selectCategory(category) {
  const cat = category === 'kids' ? 'kids' : 'pet';
  state.category = cat;
  $$('.mode-card').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.category === cat ? 'true' : 'false');
  });
  $$('#category-tabs .category-tab').forEach((tab) => {
    tab.setAttribute('aria-selected', tab.dataset.category === cat ? 'true' : 'false');
  });
  // Reset style if the selected style doesn't belong to the active category
  if (state.style) {
    const currentMeta = STYLES.find((s) => s.id === state.style);
    if (!currentMeta || currentMeta.category !== cat) {
      state.style = null;
    }
  }
  // Ensure greeting preset exists in the new category
  const presets = getGreetingPresets(cat);
  if (!presets.some((p) => p.id === state.greetingId)) {
    state.greetingId = 'congrats';
  }
  syncCategoryCopy();
  buildStyleGrid();
  renderGreetingChips();
  updateFooter();
}

function selectStyle(id) {
  state.style = id;
  $$('.style-card').forEach((c) => {
    c.setAttribute('aria-pressed', c.dataset.style === id ? 'true' : 'false');
  });
  updateFooter();
}

function selectAspect(_aspect) {
  // Locked to vertical 2:3 — no other aspect choices.
  state.aspect = 'packet';
}

function updateUploadCount() {
  const el = $('#upload-count');
  if (el) el.textContent = tr('uploadCount', { n: state.photos.length });
}

function renderThumbs() {
  const grid = $('#photo-grid');
  grid.innerHTML = '';
  state.photos.forEach((p) => {
    const wrap = document.createElement('div');
    wrap.className = 'photo-thumb';
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = '';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'remove';
    rm.setAttribute('aria-label', tr('removePhoto'));
    rm.textContent = '×';
    rm.addEventListener('click', () => removePhoto(p.id));
    wrap.append(img, rm);
    grid.appendChild(wrap);
  });
  updateUploadCount();
  $('#btn-add-photo').disabled = state.photos.length >= 5;
  updateFooter();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, url, img, file });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('bad image'));
    };
    img.src = url;
  });
}

async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  const room = 5 - state.photos.length;
  for (const f of files.slice(0, room)) {
    try {
      const item = await loadImageFromFile(f);
      state.photos.push(item);
    } catch {
      /* skip bad */
    }
  }
  renderThumbs();
}

function removePhoto(id) {
  const idx = state.photos.findIndex((p) => p.id === id);
  if (idx >= 0) {
    URL.revokeObjectURL(state.photos[idx].url);
    state.photos.splice(idx, 1);
    renderThumbs();
  }
}

function currentGreeting() {
  if (state.greetingId === 'custom') {
    return (state.customGreeting || '').trim().slice(0, 30);
  }
  const p = getGreetingPresets().find((g) => g.id === state.greetingId);
  return p?.value || '恭喜發財';
}

function setLoading(on) {
  const ov = $('#loading-overlay');
  ov.classList.toggle('active', on);
  ov.setAttribute('aria-hidden', on ? 'false' : 'true');
  ov.setAttribute('aria-busy', on ? 'true' : 'false');
  if (on) $('#loading-text').textContent = tr('generating');
  // Keep footer / chrome inert while generating
  ['#btn-back', '#btn-next', '#btn-regenerate', '#btn-download-diecut', '#btn-download', '#btn-download-trim', '#btn-share', '#btn-restart'].forEach((sel) => {
    const b = $(sel);
    if (!b) return;
    if (on) {
      b.dataset.wasDisabled = b.disabled ? '1' : '0';
      b.disabled = true;
    } else if (b.dataset.wasDisabled != null) {
      b.disabled = b.dataset.wasDisabled === '1';
      delete b.dataset.wasDisabled;
    }
  });
  if (!on) updateFooter();
}

async function runGenerate() {
  const greeting = currentGreeting();
  if (!greeting) {
    toast(tr('errGreeting'), { error: true });
    return false;
  }
  if (!state.style) {
    toast(tr('errStyle'), { error: true });
    return false;
  }
  if (!state.photos.length) {
    toast(tr('errPhotos'), { error: true });
    return false;
  }

  setLoading(true);
  // brief delay so overlay paints
  await new Promise((r) => setTimeout(r, 80));
  try {
    state.aspect = 'packet';
    const result = await generatePacket({
      style: state.style,
      category: state.category,
      aspect: 'packet',
      photos: state.photos.map((p) => p.img),
      greeting,
      message: state.message.trim().slice(0, 30),
      tweak: state.tweak,
      // Keys live on the server (.env). Browser only hits /api/generate.
    });
    state.result = { ...result };
    if (result.mode === 'ai') {
      toast(tr('genAiOk'));
      console.info('[laisee] generation mode=ai', result.provider, result.model);
    } else if (result.notice) {
      toast(result.notice, { error: true });
    } else {
      toast(tr('genCanvasFallback'));
      console.info('[laisee] generation mode=canvas (AI unavailable or failed)');
    }
    return true;
  } catch (err) {
    toast(String(err?.message || err), { error: true });
    return false;
  } finally {
    setLoading(false);
  }
}

/* Preview pan/zoom */
const preview = {
  scale: 1,
  x: 0,
  y: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  pointers: new Map(),
  pinchStartDist: 0,
  pinchStartScale: 1,
};

function getActivePreviewCanvas() {
  if (!state.result) return null;
  if (state.previewView === 'diecut') {
    if (!state.result.diecutCanvas && state.result.canvas) {
      state.result.diecutCanvas = canvasWithDiecut(state.result.canvas, { styleId: state.style || 'style01' });
    }
    return state.result.diecutCanvas || state.result.canvas;
  }
  return state.result.canvas;
}

function selectPreviewView(view) {
  const v = view === 'front' ? 'front' : 'diecut';
  state.previewView = v;
  $$('.preview-view-tab').forEach((tab) => {
    tab.setAttribute('aria-selected', tab.dataset.view === v ? 'true' : 'false');
  });
  const activeCanvas = getActivePreviewCanvas();
  if (activeCanvas) paintPreview(activeCanvas);
}

function fitPreviewToStage(cv) {
  const stage = $('#preview-stage');
  if (!stage || !cv || !cv.width || !cv.height) return;
  const sw = stage.clientWidth || 320;
  const sh = stage.clientHeight || 400;
  const fit = Math.min(sw / cv.width, sh / cv.height) * 0.92;
  preview.scale = Number.isFinite(fit) && fit > 0 ? fit : 0.3;
  preview.x = 0;
  preview.y = 0;
  applyPreviewTransform(cv);
}

function paintPreview(sourceCanvas) {
  const stage = $('#preview-stage');
  let cv = stage.querySelector('canvas');
  if (!cv) {
    cv = document.createElement('canvas');
    stage.appendChild(cv);
  }
  cv.width = sourceCanvas.width;
  cv.height = sourceCanvas.height;
  cv.getContext('2d').drawImage(sourceCanvas, 0, 0);

  fitPreviewToStage(cv);
  // if stage was still settling, relayout once more
  requestAnimationFrame(() => fitPreviewToStage(cv));
}

function applyPreviewTransform(cv) {
  // Flexbox centers the canvas; pan/zoom via translate + scale around center
  cv.style.width = `${cv.width}px`;
  cv.style.height = `${cv.height}px`;
  cv.style.transform = `translate(${preview.x}px, ${preview.y}px) scale(${preview.scale})`;
}

function setupPreviewGestures() {
  const stage = $('#preview-stage');
  if (typeof ResizeObserver !== 'undefined' && stage) {
    const ro = new ResizeObserver(() => {
      const cv = stage.querySelector('canvas');
      if (cv && !preview.dragging && preview.pointers.size === 0) {
        fitPreviewToStage(cv);
      }
    });
    ro.observe(stage);
  }

  stage.addEventListener('pointerdown', (e) => {
    stage.setPointerCapture(e.pointerId);
    preview.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (preview.pointers.size === 1) {
      preview.dragging = true;
      preview.lastX = e.clientX;
      preview.lastY = e.clientY;
    } else if (preview.pointers.size === 2) {
      const pts = [...preview.pointers.values()];
      preview.pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      preview.pinchStartScale = preview.scale;
    }
  });

  stage.addEventListener('pointermove', (e) => {
    if (!preview.pointers.has(e.pointerId)) return;
    preview.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const cv = stage.querySelector('canvas');
    if (!cv) return;

    if (preview.pointers.size === 2) {
      const pts = [...preview.pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (preview.pinchStartDist > 0) {
        preview.scale = Math.min(4, Math.max(0.3, preview.pinchStartScale * (dist / preview.pinchStartDist)));
        applyPreviewTransform(cv);
      }
    } else if (preview.dragging) {
      preview.x += e.clientX - preview.lastX;
      preview.y += e.clientY - preview.lastY;
      preview.lastX = e.clientX;
      preview.lastY = e.clientY;
      applyPreviewTransform(cv);
    }
  });

  const end = (e) => {
    preview.pointers.delete(e.pointerId);
    if (preview.pointers.size < 2) {
      preview.pinchStartDist = 0;
    }
    if (preview.pointers.size === 0) preview.dragging = false;
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const cv = stage.querySelector('canvas');
    if (!cv) return;
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    preview.scale = Math.min(4, Math.max(0.3, preview.scale * delta));
    applyPreviewTransform(cv);
  }, { passive: false });
}

function downloadStamp() {
  const ts = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
}

function triggerPngDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}


function isLocalOrPrivateUrl(href) {
  try {
    const u = new URL(href);
    if (u.protocol === 'file:') return true;
    const h = u.hostname;
    if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h.endsWith('.local')) return true;
    // private LAN ranges — not useful as a public share link
    if (/^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
    return false;
  } catch {
    return true;
  }
}

async function canvasToPngFile(canvas, filename) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
  const name = filename || `laisee-2026-${downloadStamp()}.png`;
  try {
    return new File([blob], name, { type: 'image/png' });
  } catch {
    return blob;
  }
}

async function shareResult() {
  if (!state.result?.canvas && !state.result?.blob) {
    toast(tr('shareUnavailable'), { error: true });
    return;
  }
  const title = tr('shareTitle');
  const text = tr('shareText');
  const pageUrl = typeof location !== 'undefined' ? location.href : '';
  const canShareUrl = pageUrl && !isLocalOrPrivateUrl(pageUrl);

  // 1) Prefer Web Share with file/PNG when supported
  try {
    let file = null;
    const shareCv = getActivePreviewCanvas() || state.result.canvas;
    const shareSuffix = state.previewView === 'diecut' ? '-diecut.png' : '.png';
    if (shareCv) {
      file = await canvasToPngFile(shareCv, `laisee-2026-${downloadStamp()}${shareSuffix}`);
    } else if (state.result.blob) {
      try {
        file = new File([state.result.blob], `laisee-2026-${downloadStamp()}.png`, { type: 'image/png' });
      } catch {
        file = state.result.blob;
      }
    }
    if (file && typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      const withFile = { title, text, files: [file] };
      if (navigator.canShare(withFile)) {
        await navigator.share(withFile);
        toast(tr('shareFileOk'));
        return;
      }
    }
    // Share URL + title when we have a non-local URL
    if (typeof navigator !== 'undefined' && navigator.share && canShareUrl) {
      await navigator.share({ title, text, url: pageUrl });
      toast(tr('shareFileOk'));
      return;
    }
  } catch (err) {
    // user cancel — silent
    if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) return;
    console.warn('[laisee] share failed', err);
  }

  // 2) Fallback: copy link if public-ish
  if (canShareUrl && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast(tr('shareCopied'));
      return;
    } catch {
      /* fall through */
    }
  }

  // 3) Local / no share: toast → download instead
  toast(tr(canShareUrl ? 'shareUnavailable' : 'shareNoUrl'));
}

/** Primary panorama: Full unfolded die-cut PNG (1860×2048). */
async function downloadResultDiecut() {
  if (!state.result?.canvas) return;
  try {
    const { blob } = await exportPngWithDiecut(state.result.canvas, { styleId: state.style || 'style01' });
    if (!blob) return;
    triggerPngDownload(blob, `laisee-2026-${downloadStamp()}-diecut.png`);
  } catch (err) {
    console.error('[laisee] diecut export failed', err);
    toast(String(err?.message || err), { error: true });
  }
}

/** With-bleed front PNG for print shops (1125×2100). */
async function downloadResultBleed() {
  if (!state.result?.canvas) return;
  try {
    const { blob } = await exportPngWithBleed(state.result.canvas);
    if (!blob) return;
    triggerPngDownload(blob, `laisee-2026-${downloadStamp()}-bleed.png`);
  } catch (err) {
    console.error('[laisee] bleed export failed', err);
    toast(String(err?.message || err), { error: true });
  }
}

/** Secondary: trim-only PNG (1050×2025). */
function downloadResultTrim() {
  if (!state.result?.blob) return;
  triggerPngDownload(state.result.blob, `laisee-2026-${downloadStamp()}.png`);
}

function restart() {
  state.photos.forEach((p) => URL.revokeObjectURL(p.url));
  Object.assign(state, {
    step: 1,
    agreed: false,
    aspect: 'packet',
    style: null,
    photos: [],
    greetingId: 'congrats',
    customGreeting: '',
    message: '',
    tweak: '',
    result: null,
  });
  $('#terms-scroll').scrollTop = 0;
  $('#custom-greeting-wrap').classList.add('hidden');
  $('#custom-greeting').value = '';
  $('#message-input').value = '';
  $('#tweak-input').value = '';
  selectAspect('2:3');
  selectCategory('pet');
  renderThumbs();
  showScreen(1);
}

function setupTerms() {
  const scroller = $('#terms-scroll');
  const check = () => {
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8;
    if (atBottom) state.agreed = true;
    updateFooter();
    $('#terms-hint').classList.toggle('hidden', state.agreed);
  };
  scroller.addEventListener('scroll', check, { passive: true });
  // if content fits without scroll
  requestAnimationFrame(() => {
    if (scroller.scrollHeight <= scroller.clientHeight + 4) {
      state.agreed = true;
      updateFooter();
      $('#terms-hint').classList.add('hidden');
    }
  });
}

function setupUpload() {
  const dz = $('#dropzone');
  const input = $('#file-input');

  const openPicker = () => input.click();
  dz.addEventListener('click', openPicker);
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });
  $('#btn-add-photo').addEventListener('click', openPicker);

  input.addEventListener('change', () => {
    if (input.files?.length) addFiles(input.files);
    input.value = '';
  });

  ['dragenter', 'dragover'].forEach((ev) => {
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((ev) => {
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
    });
  });
  dz.addEventListener('drop', (e) => {
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  });
}

function renderGreetingChips() {
  const grid = $('#greeting-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const presets = getGreetingPresets();
  presets.forEach((g) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip greeting-chip';
    btn.dataset.gid = g.id;
    btn.textContent = tr(g.key);
    btn.setAttribute('aria-pressed', g.id === state.greetingId ? 'true' : 'false');
    btn.addEventListener('click', () => {
      state.greetingId = g.id;
      $$('.greeting-chip').forEach((c) => {
        c.setAttribute('aria-pressed', c.dataset.gid === g.id ? 'true' : 'false');
      });
      $('#custom-greeting-wrap').classList.toggle('hidden', g.id !== 'custom');
      if (g.id === 'custom') $('#custom-greeting').focus();
    });
    grid.appendChild(btn);
  });
}

function setupGreeting() {
  renderGreetingChips();

  const custom = $('#custom-greeting');
  const customCount = $('#custom-greeting-count');
  custom.addEventListener('input', () => {
    state.customGreeting = custom.value.slice(0, 30);
    if (custom.value.length > 30) custom.value = state.customGreeting;
    customCount.textContent = `${state.customGreeting.length}/30`;
  });

  const msg = $('#message-input');
  const msgCount = $('#message-count');
  msg.addEventListener('input', () => {
    state.message = msg.value.slice(0, 30);
    if (msg.value.length > 30) msg.value = state.message;
    msgCount.textContent = `${state.message.length}/30`;
  });
}

async function goNext() {
  if (state.step === 2) {
    if (!state.agreed) return;
    showScreen(3);
  } else if (state.step === 3) {
    if (!state.style) {
      toast(tr('errStyle'), { error: true });
      return;
    }
    showScreen(4);
  } else if (state.step === 4) {
    if (state.photos.length < 1) {
      toast(tr('errPhotos'), { error: true });
      return;
    }
    showScreen(5);
  } else if (state.step === 5) {
    const ok = await runGenerate();
    if (ok) {
      showScreen(6);
      requestAnimationFrame(() => {
        selectPreviewView(state.previewView || 'diecut');
      });
    }
  }
}

function goBack() {
  if (state.step <= 1) return;
  if (state.step === 3) state.agreed = false;
  showScreen(state.step - 1);
  if (state.step === 2) {
    // re-check terms scroll
    const scroller = $('#terms-scroll');
    state.agreed = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8
      || scroller.scrollHeight <= scroller.clientHeight + 4;
    updateFooter();
  }
}

function bindChrome() {
  $$('.lang-toggle button').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang));
  });
  $$('.mode-card').forEach((card) => {
    card.addEventListener('click', () => selectCategory(card.dataset.category));
  });
  $$('#category-tabs .category-tab').forEach((tab) => {
    tab.addEventListener('click', () => selectCategory(tab.dataset.category));
  });
  $$('.preview-view-tab').forEach((tab) => {
    tab.addEventListener('click', () => selectPreviewView(tab.dataset.view));
  });
  $('#btn-start').addEventListener('click', () => showScreen(2));
  $('#btn-back').addEventListener('click', goBack);
  $('#btn-next').addEventListener('click', goNext);

  $('#btn-download-diecut')?.addEventListener('click', () => { downloadResultDiecut(); });
  $('#btn-download').addEventListener('click', () => { downloadResultBleed(); });
  $('#btn-download-trim')?.addEventListener('click', downloadResultTrim);
  $('#btn-share')?.addEventListener('click', () => { shareResult(); });
  $('#btn-restart').addEventListener('click', restart);
  $('#btn-regenerate').addEventListener('click', async () => {
    state.tweak = $('#tweak-input').value;
    const ok = await runGenerate();
    if (ok && state.result?.canvas) {
      requestAnimationFrame(() => selectPreviewView(state.previewView || 'diecut'));
    }
  });

}

function init() {
  buildStyleGrid();
  setupTerms();
  setupUpload();
  setupGreeting();
  setupPreviewGestures();
  bindChrome();
  setLang('zh-Hant');
  selectAspect('2:3');
  showScreen(1);

  // expose for playwright / debugging without console noise
  window.__laisee = {
    getState: () => ({ ...state, photos: state.photos.length, result: !!state.result }),
    generatePacket,
    PRINT_SPEC,
    exportPngWithBleed,
    exportPngWithDiecut,
    canvasWithDiecut,
  };
}

// Lang toggle works on login gate too (before session)
$$('.lang-toggle button').forEach((b) => {
  b.addEventListener('click', () => setLang(b.dataset.lang));
});
setAuthLang('zh-Hant');

// Auth gate: login page until /api/me succeeds (or AUTH_DISABLED bypass on server)
ensureAuth(init);
