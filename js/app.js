import { t } from './i18n.js?v=20261023n';
import { ensureAuth, setAuthLang } from './auth.js?v=20261023d';
import { generatePacket, STYLE_IDS, STYLE_THUMBS, STYLE_IMAGES, STYLES, getStylesByCategory, getStyleMaxSubjects, PRINT_SPEC, exportPngWithBleed, exportPngWithDiecut, canvasWithDiecut } from './generate.js?v=20261023n';

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
    { id: 'lucky', key: 'greetingLucky', value: '大吉大利' },
    { id: 'wish', key: 'greetingWish', value: '心想事成' },
    { id: 'allwell', key: 'greetingAllWell', value: '萬事勝意' },
    { id: 'chubby', key: 'greetingChubby', value: '肥肥白白' },
    { id: 'treats', key: 'greetingTreats', value: '罐罐常滿' },
    { id: 'spirit', key: 'greetingSpirit', value: '龍馬精神' },
    { id: 'boss', key: 'greetingBoss', value: '主子萬歲' },
    { id: 'wealth', key: 'greetingWealth', value: '招財進寶' },
    { id: 'star', key: 'greetingStar', value: '吉星高照' },
    { id: 'peace', key: 'greetingPeace', value: '出入平安' },
    { id: 'abundance', key: 'greetingAbundance', value: '年年有餘' },
    { id: 'smile', key: 'greetingSmile', value: '笑口常開' },
    { id: 'bliss', key: 'greetingBliss', value: '幸福滿滿' },
  ],
  kids: [
    { id: 'congrats', key: 'greetingCongrats', value: '恭喜發財' },
    { id: 'grow', key: 'greetingGrow', value: '快高長大' },
    { id: 'smart', key: 'greetingSmart', value: '聰明伶俐' },
    { id: 'study', key: 'greetingStudy', value: '學業進步' },
    { id: 'happy', key: 'greetingHappy', value: '新年快樂' },
    { id: 'health', key: 'greetingHealth', value: '身體健康' },
    { id: 'lucky', key: 'greetingLucky', value: '大吉大利' },
    { id: 'wish', key: 'greetingWish', value: '心想事成' },
    { id: 'allwell', key: 'greetingAllWell', value: '萬事勝意' },
    { id: 'obedient', key: 'greetingObedient', value: '聽教聽話' },
    { id: 'loved', key: 'greetingLoved', value: '人見人愛' },
    { id: 'smile', key: 'greetingSmile', value: '笑口常開' },
    { id: 'spirit', key: 'greetingSpirit', value: '龍馬精神' },
    { id: 'family', key: 'greetingFamily', value: '闔家平安' },
    { id: 'goldjade', key: 'greetingGoldJade', value: '金玉滿堂' },
    { id: 'peace', key: 'greetingPeace', value: '出入平安' },
  ],
};

const COMMON_SURNAMES = [
  '陳', '李', '黃', '張', '林', '梁', '吳', '劉', '何',
  '周', '鄭', '蔡', '楊', '許', '鄧', '馮', '曾', '謝',
  '馬', '胡', '蘇', '葉', '盧', '潘', '朱', '鍾', '袁',
  '高', '羅', '郭', '莫', '余', '伍', '彭', '司徒', '歐陽',
];

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
  surnameChar: '',
  customSurname: '',
  surnameFormat: 'none', // 'none' | 'char' | 'shi' | 'fu' | 'jia'
  message: '',
  tweak: '',
  previewView: 'front', // 'diecut' | 'front'
  result: null, // { canvas, diecutCanvas, blob, dataUrl }
  usage: null,
  usageLoading: false,
  generating: false,
  guardianConsent: false,
  generationError: null,
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
  // style card labels + captions (both mounted and cached)
  STYLES.forEach((styleMeta) => {
    if (styleCardCache.has(styleMeta.id)) {
      getOrCreateStyleCard(styleMeta);
    }
  });
  // photo remove buttons
  $$('.photo-thumb .remove').forEach((btn, i) => {
    btn.setAttribute('aria-label', tr('removePhotoAt', { n: i + 1 }));
  });
  // greeting chips
  const presets = getGreetingPresets();
  $$('.greeting-chip').forEach((chip) => {
    const preset = presets.find((p) => p.id === chip.dataset.gid);
    if (preset) chip.textContent = tr(preset.key);
  });
  syncSurnameUI();
  syncCategoryCopy();
  updateUploadCount();
  updateStepIndicator();
  renderUsage();
  renderResultMode();
  if (state.generationError) showGenerationError(state.generationError, false);
  document.documentElement.lang = state.lang === 'en' ? 'en' : 'zh-Hant';
}

function currentMaxPhotos() {
  if (!state.style) return 1;
  const styleMeta = STYLES.find((s) => s.id === state.style);
  return styleMeta?.maxSubjects || 1;
}

function syncCategoryCopy() {
  const isKids = state.category === 'kids';
  const maxSubs = currentMaxPhotos();
  const isDuo = maxSubs > 1;

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
    const key = isKids
      ? (isDuo ? 'uploadHintKidsDuo' : 'uploadHintKids')
      : (isDuo ? 'uploadHintPetDuo' : 'uploadHintPet');
    upHint.setAttribute('data-i18n', key);
    upHint.textContent = tr(key);
  }
  const addBtn = $('#btn-add-photo');
  if (addBtn) {
    const key = isKids ? 'uploadAddKids' : 'uploadAddPet';
    addBtn.setAttribute('data-i18n', key);
    addBtn.textContent = tr(key);
    // Only show "加另一個主體 / 成員" button if this style supports 2 subjects
    addBtn.classList.toggle('hidden', !isDuo);
    addBtn.disabled = state.photos.length >= maxSubs;
  }
  const fileInput = $('#file-input');
  if (fileInput) {
    fileInput.multiple = isDuo;
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
  $('.screens').scrollTop = 0;
  const active = $(`.screen[data-step="${step}"]`);
  const focusTarget = active?.querySelector('h1, h2, [tabindex="0"], button, .dropzone');
  if (focusTarget?.matches('h1, h2')) focusTarget.tabIndex = -1;
  focusTarget?.focus?.({ preventScroll: true });
  if (step === 2) requestAnimationFrame(checkTerms);
  if (step === 6) renderResultMode();
  if (step === 5 || step === 6) refreshUsage();
}

function updateFooter() {
  const footer = $('#footer-actions');
  const backBtn = $('#btn-back');
  const nextBtn = $('#btn-next');
  const panel = $('#generation-panel');
  const slot = state.step === 6 ? $('#generation-result-slot') : $('#generation-step5-slot');
  if (panel.parentElement !== slot) slot.append(panel);
  panel.hidden = state.step !== 5 && state.step !== 6;
  $('#btn-return-result').hidden = !state.result || state.step === 6;
  const valid = !!state.style && state.photos.length > 0 && !!currentGreeting()
    && (state.category !== 'kids' || state.guardianConsent);
  $('#greeting-required').hidden = state.greetingId !== 'custom' || !!currentGreeting();
  $('#custom-greeting').setAttribute('aria-invalid', state.greetingId === 'custom' && !currentGreeting() ? 'true' : 'false');
  $('#btn-local').disabled = state.generating || !valid;
  $('#btn-regenerate').disabled = state.generating || !valid || !canGenerateAi();
  footer.classList.remove('hidden');

  if (state.step === 1 || state.step === 6) {
    footer.classList.add('hidden');
    return;
  }

  backBtn.classList.remove('hidden');
  nextBtn.classList.remove('hidden');

  if (state.step === 2) {
    nextBtn.textContent = tr('agreeContinue');
    nextBtn.disabled = !state.agreed;
  } else if (state.step === 5) {
    nextBtn.textContent = tr('generate');
    nextBtn.disabled = state.generating || !valid || !canGenerateAi();
  } else {
    nextBtn.textContent = tr(state.step === 3 ? 'nextUpload' : state.step === 4 ? 'nextGreeting' : 'next');
    if (state.step === 3) nextBtn.disabled = !state.style;
    else if (state.step === 4) nextBtn.disabled = state.photos.length < 1 || (state.category === 'kids' && !state.guardianConsent);
    else nextBtn.disabled = false;
  }
}

function canGenerateAi() {
  return !!state.usage?.ai?.ready && state.usage?.usage?.available !== false
    && !state.usageLoading && !state.usage?.usage?.busy;
}

function renderUsage() {
  const el = $('#usage-status');
  if (!el) return;
  const data = state.usage;
  if (state.usageLoading) el.textContent = tr('usageLoading');
  else if (!data) el.textContent = tr('usageUnavailable');
  else if (!data.ai?.ready) el.textContent = tr('usageNotReady');
  else if (data.usage?.busy) el.textContent = tr('usageBusy');
  else if (data.usage?.available === false && data.usage?.scope === 'storage') el.textContent = tr('usageUnavailable');
  else if (data.usage?.available === false && data.usage?.scope === 'ip') el.textContent = tr('genLimit');
  else {
    const u = data.usage;
    const remaining = Math.min(u.userRemaining ?? u.remaining, u.remaining);
    el.textContent = tr(remaining > 0 ? 'usageRemaining' : 'usageDepleted', { n: remaining });
  }
}

async function refreshUsage() {
  if (state.usageLoading) return;
  state.usageLoading = true;
  renderUsage();
  updateFooter();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch('/api/usage', { credentials: 'same-origin', signal: controller.signal });
    const data = await res.json();
    if (res.status === 401) {
      showGenerationError('UNAUTHORIZED');
      state.usage = null;
    } else if (!res.ok || !data.ok) throw new Error('usage unavailable');
    else {
      state.usage = data;
      if (!$('#btn-relogin').hidden) {
        $('#btn-relogin').hidden = true;
        $('#generation-notice').hidden = true;
        state.generationError = null;
      }
    }
  } catch {
    state.usage = null;
  } finally {
    clearTimeout(timer);
    state.usageLoading = false;
    renderUsage();
    updateFooter();
  }
}

function showGenerationError(code, scroll = true) {
  state.generationError = code || 'UNKNOWN';
  const keys = { UNAUTHORIZED: 'genSessionExpired', RATE_LIMITED: 'genLimit', BUSY: 'usageBusy',
    AI_DISABLED: 'usageNotReady', AI_MOCK: 'usageNotReady', AI_NOT_CONFIGURED: 'usageNotReady',
    UPSTREAM_TIMEOUT: 'genTimeout', NETWORK_ERROR: 'genNetworkError', IMAGE_ASPECT_MISMATCH: 'genAspectError' };
  const el = $('#generation-notice');
  el.textContent = tr(keys[code] || 'genFailed');
  el.hidden = false;
  $('#btn-relogin').hidden = code !== 'UNAUTHORIZED';
  if (scroll && (state.step === 5 || state.step === 6)) {
    if (state.step === 6) $('#edit-design').open = true;
    requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest' }));
  }
}

function designSignature() {
  return JSON.stringify([state.category, state.style, state.photos.map((p) => p.id), currentGreeting(),
    state.message.trim().slice(0, 30), $('#tweak-input').value.trim().slice(0, 300)]);
}

function renderResultMode() {
  if (!state.result) return;
  const mode = tr(state.result.mode === 'ai' ? 'modeAi' : state.result.mode === 'mock' ? 'modeMock' : 'modeLocal');
  $('#result-mode').textContent = mode + (state.result.inputSignature !== designSignature() ? ' ' + tr('resultUnsaved') : '');
}

function setLang(lang) {
  state.lang = lang;
  if (state.step === 2) state.agreed = false;
  $$('.lang-toggle button').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
  });
  setAuthLang(lang);
  applyI18n();
  updateFooter();
  if (state.step === 2) requestAnimationFrame(checkTerms);
}

const preloadedImages = new Map();
const styleCardCache = new Map();

function preloadImageUrl(url) {
  if (!url || preloadedImages.has(url)) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  img.decode?.().catch(() => {});
  preloadedImages.set(url, img);
}

function getOrCreateStyleCard(styleMeta) {
  const id = styleMeta.id;
  let btn = styleCardCache.get(id);
  if (!btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'style-card';
    btn.dataset.style = id;
    btn.dataset.category = styleMeta.category;
    const img = document.createElement('img');
    img.className = 'style-thumb';
    img.decoding = 'async';
    img.loading = 'eager';
    img.src = STYLE_THUMBS[id] || STYLE_IMAGES[id];
    img.decode?.().catch(() => {});
    const label = document.createElement('span');
    label.className = 'label';
    const caption = document.createElement('span');
    caption.className = 'caption';
    btn.append(img, label, caption);
    btn.addEventListener('click', () => selectStyle(id));
    styleCardCache.set(id, btn);
  }
  const name = tr(STYLE_LABEL_KEYS[id]);
  btn.setAttribute('aria-pressed', state.style === id ? 'true' : 'false');
  btn.setAttribute('aria-label', name);
  const img = btn.querySelector('.style-thumb');
  if (img) img.alt = name;
  const label = btn.querySelector('.label');
  if (label) label.textContent = name;
  const caption = btn.querySelector('.caption');
  if (caption) {
    caption.textContent = state.lang === 'en' ? styleMeta.captionEn : styleMeta.captionZh;
  }
  return btn;
}

function preloadAllStyleThumbs() {
  STYLES.forEach((styleMeta) => {
    preloadImageUrl(STYLE_THUMBS[styleMeta.id] || STYLE_IMAGES[styleMeta.id]);
    getOrCreateStyleCard(styleMeta);
  });
}

function buildStyleGrid() {
  const grid = $('#style-grid');
  grid.replaceChildren(
    ...getStylesByCategory(state.category).map((styleMeta) => getOrCreateStyleCard(styleMeta))
  );
}

function selectCategory(category) {
  const cat = category === 'kids' ? 'kids' : 'pet';
  state.category = cat;
  $$('.mode-card').forEach((btn) => {
    btn.setAttribute('aria-pressed', btn.dataset.category === cat ? 'true' : 'false');
  });
  $$('#category-tabs .category-tab').forEach((tab) => {
    tab.setAttribute('aria-pressed', tab.dataset.category === cat ? 'true' : 'false');
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
  if (STYLE_IMAGES[id]) preloadImageUrl(STYLE_IMAGES[id]);
  $$('.style-card').forEach((c) => {
    c.setAttribute('aria-pressed', c.dataset.style === id ? 'true' : 'false');
  });

  // Clamp photos if switched from a 2-person style to a 1-person solo style
  const maxSubs = currentMaxPhotos();
  if (state.photos.length > maxSubs) {
    const removed = state.photos.splice(maxSubs);
    removed.forEach((p) => URL.revokeObjectURL(p.url));
    renderThumbs();
  }

  syncCategoryCopy();
  updateUploadCount();
  updateFooter();
}

function selectAspect(_aspect) {
  // Locked to vertical 2:3 — no other aspect choices.
  state.aspect = 'packet';
}

function updateUploadCount() {
  const el = $('#upload-count');
  if (el) el.textContent = tr('uploadCount', { n: state.photos.length, max: currentMaxPhotos() });
}

function renderThumbs() {
  const grid = $('#photo-grid');
  grid.innerHTML = '';
  state.photos.forEach((p, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'photo-thumb';
    const img = document.createElement('img');
    img.src = p.url;
    img.alt = '';
    const rm = document.createElement('button');
    rm.type = 'button';
    rm.className = 'remove';
    rm.setAttribute('aria-label', tr('removePhotoAt', { n: i + 1 }));
    rm.textContent = '×';
    rm.addEventListener('click', () => removePhoto(p.id));
    wrap.append(img, rm);
    grid.appendChild(wrap);
  });
  updateUploadCount();

  const maxSubs = currentMaxPhotos();
  const addBtn = $('#btn-add-photo');
  if (addBtn) {
    addBtn.classList.toggle('hidden', maxSubs <= 1);
    addBtn.disabled = state.photos.length >= maxSubs;
  }
  updateFooter();
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 40000000) {
        URL.revokeObjectURL(url);
        reject(new Error(tr('uploadPixels')));
        return;
      }
      resolve({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, url, img, file });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(tr('uploadUnreadable')));
    };
    img.src = url;
  });
}

async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  const maxSubs = currentMaxPhotos();
  const room = maxSubs - state.photos.length;
  if (room <= 0) {
    toast(tr('uploadLimitReached', { max: maxSubs }), { error: true });
    return;
  }
  for (const f of files.slice(0, room)) {
    try {
      if (state.photos.length >= 2) throw new Error(tr('uploadMax'));
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) throw new Error(tr('uploadType'));
      if (!f.size || f.size > 8 * 1024 * 1024) throw new Error(tr('uploadSize'));
      const item = await loadImageFromFile(f);
      if (state.photos.length >= 2) {
        URL.revokeObjectURL(item.url);
        throw new Error(tr('uploadMax'));
      }
      state.photos.push(item);
      if (state.category === 'kids') {
        state.guardianConsent = false;
        $('#guardian-consent').checked = false;
      }
    } catch (err) {
      errors.push(`${f.name}: ${err.message}`);
    }
  }
  $('#upload-errors').textContent = errors.join('\n');
  $('#upload-errors').hidden = errors.length === 0;
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
  const customText = (state.customGreeting || '').trim().slice(0, 30);
  if (customText) return customText;
  const p = getGreetingPresets().find((g) => g.id === state.greetingId);
  return p?.value || '恭喜發財';
}

function baseSurname() {
  const custom = (state.customSurname || '').trim().slice(0, 6);
  if (custom) return custom;
  return (state.surnameChar || '').trim();
}

function currentSurname() {
  const base = baseSurname();
  if (!base || state.surnameFormat === 'none') return '';
  // If user entered a full phrase like 陳李聯婚 or 陳府 directly in custom input, don't double-suffix
  if (base.length >= 3 || /[氏府家]$/.test(base)) return base;
  if (state.surnameFormat === 'shi') return `${base}氏`;
  if (state.surnameFormat === 'fu') return `${base}府`;
  if (state.surnameFormat === 'jia') return `${base}家`;
  return base;
}

function setLoading(on) {
  state.generating = on;
  const ov = $('#loading-overlay');
  ov.classList.toggle('active', on);
  ov.setAttribute('aria-hidden', on ? 'false' : 'true');
  ov.setAttribute('aria-busy', on ? 'true' : 'false');
  if (on) $('#loading-text').textContent = tr('generating');
  // Keep footer / chrome inert while generating
  $('#app').inert = on;
  ['#btn-back', '#btn-next', '#btn-regenerate', '#btn-download-diecut', '#btn-download', '#btn-download-trim', '#btn-share', '#btn-restart', '#btn-local'].forEach((sel) => {
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

async function runGenerate(local = false) {
  if (state.generating) return false;
  state.tweak = $('#tweak-input').value.trim().slice(0, 300);
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
  if (state.category === 'kids' && !state.guardianConsent) {
    toast(tr('guardianConsent'), { error: true });
    showScreen(4);
    return false;
  }

  setLoading(true);
  // brief delay so overlay paints
  await new Promise((r) => setTimeout(r, 80));
  try {
    state.aspect = 'packet';
    const inputSignature = designSignature();
    const result = await generatePacket({
      style: state.style,
      category: state.category,
      aspect: 'packet',
      photos: state.photos.map((p) => p.img),
      greeting,
      surname: currentSurname(),
      message: state.message.trim().slice(0, 30),
      tweak: state.tweak,
      api: { useProxy: !local },
      // Keys live on the server (.env). Browser only hits /api/generate.
    });
    state.result = { ...result, inputSignature };
    state.generationError = null;
    $('#generation-notice').hidden = true;
    renderResultMode();
    return true;
  } catch (err) {
    showGenerationError(err?.code);
    return false;
  } finally {
    setLoading(false);
    refreshUsage();
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
    if (state.result.canvas) {
      state.result.diecutCanvas = canvasWithDiecut(state.result.canvas, {
        styleId: state.style || 'style01',
        surname: currentSurname(),
      });
    }
    return state.result.diecutCanvas || state.result.canvas;
  }
  return state.result.canvas;
}

function selectPreviewView(view) {
  const v = view === 'front' ? 'front' : 'diecut';
  state.previewView = v;
  $$('.preview-view-tab').forEach((tab) => {
    tab.setAttribute('aria-pressed', tab.dataset.view === v ? 'true' : 'false');
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
  if (state.previewView === 'front') {
    const ctx = cv.getContext('2d');
    const inset = PRINT_SPEC.safeInsetIn * PRINT_SPEC.dpi;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 12]);
    ctx.strokeRect(inset, inset, cv.width - inset * 2, cv.height - inset * 2);
  }

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
  const zoom = (factor) => {
    const cv = stage.querySelector('canvas');
    if (!cv) return;
    preview.scale = Math.min(4, Math.max(0.05, preview.scale * factor));
    applyPreviewTransform(cv);
  };
  const reset = () => fitPreviewToStage(stage.querySelector('canvas'));
  $('#btn-zoom-in').addEventListener('click', () => zoom(1.2));
  $('#btn-zoom-out').addEventListener('click', () => zoom(1 / 1.2));
  $('#btn-zoom-reset').addEventListener('click', reset);
  stage.addEventListener('keydown', (e) => {
    const cv = stage.querySelector('canvas');
    if (!cv) return;
    if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
    if (e.key === '+' || e.key === '=') zoom(1.2);
    if (e.key === '-') zoom(1 / 1.2);
    if (e.key === '0') reset();
    if (e.key === 'ArrowLeft') preview.x -= 20;
    if (e.key === 'ArrowRight') preview.x += 20;
    if (e.key === 'ArrowUp') preview.y -= 20;
    if (e.key === 'ArrowDown') preview.y += 20;
    applyPreviewTransform(cv);
  });
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
        preview.scale = Math.min(4, Math.max(0.05, preview.pinchStartScale * (dist / preview.pinchStartDist)));
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
    preview.scale = Math.min(4, Math.max(0.05, preview.scale * delta));
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
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
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

  // 1) Prefer Web Share with file/PNG when supported
  try {
    let file = null;
    const shareCv = state.result.canvas;
    const shareSuffix = '.png';
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
  } catch (err) {
    // user cancel — silent
    if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) return;
    console.warn('[laisee] share failed', err);
  }

  toast(tr('shareUnavailable'));
}

async function shareSite() {
  const url = new URL('/', location.href).href;
  if (isLocalOrPrivateUrl(url)) return toast(tr('shareNoUrl'));
  try {
    if (navigator.share) await navigator.share({ title: tr('brand'), url });
    else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast(tr('shareCopied'));
    } else toast(tr('shareUnavailable'));
  } catch (err) {
    if (err.name !== 'AbortError') toast(tr('shareUnavailable'));
  }
}

/** Primary panorama: Full unfolded die-cut PNG (1860×2048). */
async function downloadResultDiecut() {
  if (!state.result?.canvas) return;
  try {
    const { blob } = await exportPngWithDiecut(state.result.canvas, {
      styleId: state.style || 'style01',
      surname: currentSurname(),
    });
    if (!blob) return;
    triggerPngDownload(blob, `laisee-${downloadStamp()}-diecut-preview-only.png`);
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
    surnameChar: '',
    customSurname: '',
    surnameFormat: 'none',
    message: '',
    tweak: '',
    result: null,
    guardianConsent: false,
    previewView: 'front',
    generationError: null,
  });
  $('#terms-scroll').scrollTop = 0;
  if ($('#custom-greeting')) $('#custom-greeting').value = '';
  if ($('#custom-greeting-count')) $('#custom-greeting-count').textContent = '0/30';
  if ($('#custom-surname')) $('#custom-surname').value = '';
  if ($('#message-input')) $('#message-input').value = '';
  if ($('#tweak-input')) $('#tweak-input').value = '';
  selectAspect('2:3');
  selectCategory('pet');
  syncSurnameUI();
  renderThumbs();
  showScreen(1);
}

function checkTerms() {
  const scroller = $('#terms-scroll');
  if (state.step !== 2 || !scroller.clientHeight) return;
  if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8) state.agreed = true;
  updateFooter();
  $('#terms-hint').classList.toggle('hidden', state.agreed);
}

function setupTerms() {
  const scroller = $('#terms-scroll');
  scroller.addEventListener('scroll', checkTerms, { passive: true });
  new ResizeObserver(checkTerms).observe(scroller);
}

function setupUpload() {
  const dz = $('#dropzone');
  const input = $('#file-input');
  $('#guardian-consent').addEventListener('change', (e) => {
    state.guardianConsent = e.target.checked;
    updateFooter();
  });

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
  const hasCustom = Boolean((state.customGreeting || '').trim());
  presets.forEach((g) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip greeting-chip';
    btn.dataset.gid = g.id;
    btn.textContent = tr(g.key);
    btn.setAttribute('aria-pressed', !hasCustom && g.id === state.greetingId ? 'true' : 'false');
    btn.addEventListener('click', () => {
      state.greetingId = g.id;
      state.customGreeting = '';
      const custom = $('#custom-greeting');
      const customCount = $('#custom-greeting-count');
      if (custom) custom.value = '';
      if (customCount) customCount.textContent = '0/30';
      $$('.greeting-chip').forEach((c) => {
        c.setAttribute('aria-pressed', c.dataset.gid === g.id ? 'true' : 'false');
      });
      syncSurnameUI();
    });
    grid.appendChild(btn);
  });
}

function renderSurnameChips() {
  const grid = $('#surname-grid');
  if (!grid) return;
  grid.innerHTML = '';
  COMMON_SURNAMES.forEach((sn) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'surname-chip';
    btn.dataset.surname = sn;
    btn.textContent = sn;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const customInput = $('#custom-surname');
      if (customInput) customInput.value = '';
      state.customSurname = '';
      if (state.surnameChar === sn && state.surnameFormat !== 'none') {
        state.surnameChar = '';
        state.surnameFormat = 'none';
      } else {
        state.surnameChar = sn;
        if (state.surnameFormat === 'none') {
          state.surnameFormat = 'shi';
        }
      }
      syncSurnameUI();
    });
    grid.appendChild(btn);
  });
}

function syncSurnameUI() {
  const base = baseSurname();
  const sample = base || '陳';
  const hasCustom = Boolean((state.customSurname || '').trim());

  // Update format buttons labels & aria-pressed
  const fmtMap = {
    none: tr('surnameFmtNone'),
    char: tr('surnameFmtChar', { s: sample }),
    shi: tr('surnameFmtShi', { s: sample }),
    fu: tr('surnameFmtFu', { s: sample }),
    jia: tr('surnameFmtJia', { s: sample }),
  };
  $$('.surname-fmt-chip').forEach((btn) => {
    const fmt = btn.dataset.fmt;
    if (fmtMap[fmt]) btn.textContent = fmtMap[fmt];
    const active = fmt === 'none' ? !currentSurname() : (Boolean(base) && state.surnameFormat === fmt);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  // Update surname grid chips aria-pressed
  $$('.surname-chip').forEach((chip) => {
    const on = !hasCustom && state.surnameFormat !== 'none' && chip.dataset.surname === state.surnameChar;
    chip.setAttribute('aria-pressed', on ? 'true' : 'false');
  });

  // Update preview badge
  const badge = $('#surname-preview-badge');
  if (badge) {
    const formatted = currentSurname();
    if (formatted) {
      badge.textContent = tr('surnamePreviewBadge', { g: currentGreeting(), s: formatted });
      badge.classList.add('is-active');
    } else {
      badge.textContent = tr('surnameNoneBadge');
      badge.classList.remove('is-active');
    }
  }
}

function setupGreeting() {
  renderGreetingChips();
  renderSurnameChips();
  syncSurnameUI();

  $$('.surname-fmt-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fmt = btn.dataset.fmt || 'none';
      if (fmt === 'none') {
        state.surnameFormat = 'none';
      } else {
        state.surnameFormat = fmt;
        if (!baseSurname()) {
          state.surnameChar = '陳';
        }
      }
      syncSurnameUI();
    });
  });

  const customSurname = $('#custom-surname');
  if (customSurname) {
    customSurname.addEventListener('input', () => {
      state.customSurname = customSurname.value.slice(0, 6);
      if (customSurname.value.length > 6) customSurname.value = state.customSurname;
      if (state.customSurname.trim()) {
        if (state.surnameFormat === 'none') state.surnameFormat = 'char';
      } else if (!state.surnameChar) {
        state.surnameFormat = 'none';
      }
      syncSurnameUI();
    });
  }

  const custom = $('#custom-greeting');
  const customCount = $('#custom-greeting-count');
  if (custom) {
    custom.addEventListener('input', () => {
      state.customGreeting = custom.value.slice(0, 30);
      if (custom.value.length > 30) custom.value = state.customGreeting;
      if (customCount) customCount.textContent = `${state.customGreeting.length}/30`;
      const hasCustom = Boolean(state.customGreeting.trim());
      if (hasCustom) {
        state.greetingId = 'custom';
        $$('.greeting-chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      } else {
        if (state.greetingId === 'custom') state.greetingId = 'congrats';
        $$('.greeting-chip').forEach((c) => {
          c.setAttribute('aria-pressed', c.dataset.gid === state.greetingId ? 'true' : 'false');
        });
      }
      syncSurnameUI();
    });
  }

  const msg = $('#message-input');
  const msgCount = $('#message-count');
  if (msg) {
    msg.addEventListener('input', () => {
      state.message = msg.value.slice(0, 30);
      if (msg.value.length > 30) msg.value = state.message;
      if (msgCount) msgCount.textContent = `${state.message.length}/30`;
    });
  }
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
        selectPreviewView(state.previewView || 'front');
      });
    }
  }
}

function goBack() {
  if (state.step <= 1) return;
  if (state.step === 3) state.agreed = false;
  showScreen(state.step - 1);
}

let discardAction = null;
function confirmDiscard(kind, action) {
  const dialog = $('#restart-dialog');
  $('#discard-title').textContent = tr(kind === 'logout' ? 'logoutTitle' : 'restartTitle');
  $('#discard-message').textContent = tr(kind === 'logout' ? 'logoutConfirm' : 'restartConfirm');
  $('#btn-confirm-restart').textContent = tr(kind === 'logout' ? 'logoutConfirmAction' : 'restartConfirmAction');
  discardAction = action;
  dialog.showModal();
}

function bindChrome() {
  $('#btn-cancel-restart').addEventListener('click', () => $('#restart-dialog').close());
  $('#btn-confirm-restart').addEventListener('click', () => {
    const action = discardAction;
    $('#restart-dialog').close();
    action?.();
  });
  $('#restart-dialog').addEventListener('close', () => { discardAction = null; });
  window.addEventListener('laisee:beforelogout', (event) => {
    if (state.photos.length || state.result || state.customGreeting || state.message) {
      event.preventDefault();
      confirmDiscard('logout', event.detail.proceed);
    }
  });
  window.addEventListener('laisee:logout-error', () => {
    const notice = $('#session-notice');
    notice.hidden = false;
    notice.textContent = tr('logoutFailed');
    notice.scrollIntoView({ block: 'nearest' });
  });
  $('#tweak-input').addEventListener('input', renderResultMode);
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

  $('#btn-add-to-cart')?.addEventListener('click', () => {
    if (!state.result?.canvas) return;
    window.dispatchEvent(
      new CustomEvent('laisee:add-to-cart', {
        detail: {
          style: state.style,
          category: state.category,
          greeting: currentGreeting(),
          surname: currentSurname(),
          message: state.message,
        },
      })
    );
    toast(tr('addedToCart'));
  });
  $('#btn-download-diecut')?.addEventListener('click', () => { downloadResultDiecut(); });
  $('#btn-download')?.addEventListener('click', () => { downloadResultBleed(); });
  $('#btn-download-trim')?.addEventListener('click', downloadResultTrim);
  $('#btn-share')?.addEventListener('click', () => { shareResult(); });
  $('#btn-restart')?.addEventListener('click', restart);
  $('#btn-regenerate')?.addEventListener('click', async () => {
    state.tweak = $('#tweak-input').value;
    const ok = await runGenerate();
    if (ok && state.result?.canvas) {
      requestAnimationFrame(() => selectPreviewView(state.previewView || 'front'));
    }
  });

}

function init() {
  preloadAllStyleThumbs();
  buildStyleGrid();
  setupTerms();
  setupUpload();
  setupGreeting();
  setupPreviewGestures();
  bindChrome();
  setLang(state.lang);
  selectAspect('2:3');
  showScreen(1);
  refreshUsage();

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
