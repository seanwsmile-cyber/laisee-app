/**
 * Frontend login gate — requires /api/me before showing the 6-step flow.
 */
import { t } from './i18n.js?v=20261022h';

let lang = 'zh-Hant';
let config = {
  authDisabled: false,
  googleConfigured: false,
  eprintConfigured: false,
  eprintEnabled: false,
};
let user = null;

const $ = (sel, root = document) => root.querySelector(sel);

function tr(key, vars) {
  return t(lang, key, vars);
}

export function setAuthLang(l) {
  lang = l;
  applyAuthI18n();
}

export function getAuthUser() {
  return user;
}

function applyAuthI18n() {
  const gate = $('#auth-gate');
  if (gate) {
    gate.querySelectorAll('[data-i18n]').forEach((el) => {
      // Skip lang toggle (has child spans) and any node with element children
      if (el.closest('.lang-toggle')) return;
      if (el.children.length > 0) return;
      el.textContent = tr(el.getAttribute('data-i18n'));
    });
    gate.querySelectorAll('.lang-toggle button').forEach((b) => {
      b.setAttribute('aria-pressed', b.dataset.lang === lang ? 'true' : 'false');
    });
  }
  updateProviderButtons();
  renderUserChip();
}

function updateProviderButtons() {
  const googleBtn = $('#btn-login-google');
  const eprintBtn = $('#btn-login-eprint');
  const googleHint = $('#auth-google-hint');
  const eprintHint = $('#auth-eprint-hint');
  if (!googleBtn || !eprintBtn) return;

  if (config.googleConfigured) {
    googleBtn.disabled = false;
    googleBtn.removeAttribute('aria-disabled');
    if (googleHint) {
      googleHint.hidden = true;
      googleHint.textContent = '';
    }
  } else {
    googleBtn.disabled = true;
    googleBtn.setAttribute('aria-disabled', 'true');
    if (googleHint) {
      googleHint.hidden = false;
      googleHint.textContent = tr('authGoogleUnset');
    }
  }

  if (config.eprintConfigured) {
    eprintBtn.disabled = false;
    eprintBtn.removeAttribute('aria-disabled');
    eprintBtn.textContent = tr('authEprint');
    if (eprintHint) {
      eprintHint.hidden = true;
      eprintHint.textContent = '';
    }
  } else {
    eprintBtn.disabled = true;
    eprintBtn.setAttribute('aria-disabled', 'true');
    eprintBtn.textContent = tr('authEprintSoon');
    if (eprintHint) {
      eprintHint.hidden = false;
      eprintHint.textContent = tr('authEprintPending');
    }
  }
}

function renderUserChip() {
  const chip = $('#user-chip');
  if (!chip) return;
  if (!user) {
    chip.hidden = true;
    chip.innerHTML = '';
    return;
  }
  chip.hidden = false;
  const label = user.name || user.email || tr('authSignedIn');
  const email = user.email && user.email !== label ? user.email : '';
  chip.innerHTML = '';
  const meta = document.createElement('div');
  meta.className = 'user-chip-meta';
  const nameEl = document.createElement('span');
  nameEl.className = 'user-chip-name';
  nameEl.textContent = label;
  meta.appendChild(nameEl);
  if (email) {
    const emailEl = document.createElement('span');
    emailEl.className = 'user-chip-email';
    emailEl.textContent = email;
    meta.appendChild(emailEl);
  }
  const logout = document.createElement('button');
  logout.type = 'button';
  logout.className = 'btn-logout';
  logout.id = 'btn-logout';
  logout.textContent = tr('authLogout');
  logout.addEventListener('click', onLogout);
  chip.append(meta, logout);
}

function showGate(show) {
  const gate = $('#auth-gate');
  const app = $('#app');
  if (gate) {
    gate.hidden = !show;
    gate.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  if (app) {
    app.classList.toggle('auth-blocked', show);
    if (show) {
      app.setAttribute('aria-hidden', 'true');
    } else {
      app.removeAttribute('aria-hidden');
    }
  }
}

async function fetchMe() {
  const res = await fetch('/api/me', { credentials: 'same-origin' });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (res.ok && json?.authenticated && json.user) {
    user = json.user;
    if (json.googleConfigured != null) {
      config = {
        authDisabled: !!json.authDisabled,
        googleConfigured: !!json.googleConfigured,
        eprintConfigured: !!json.eprintConfigured,
        eprintEnabled: !!json.eprintEnabled,
      };
    }
    return true;
  }
  user = null;
  return false;
}

async function fetchConfig() {
  try {
    const res = await fetch('/api/auth/config', { credentials: 'same-origin' });
    const json = await res.json();
    if (json?.ok) {
      config = {
        authDisabled: !!json.authDisabled,
        googleConfigured: !!json.googleConfigured,
        eprintConfigured: !!json.eprintConfigured,
        eprintEnabled: !!json.eprintEnabled,
      };
    }
  } catch {
    /* keep defaults */
  }
}

async function onLogout() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  } catch {
    /* ignore */
  }
  user = null;
  showGate(true);
  await fetchConfig();
  applyAuthI18n();
  // Soft reload so app state resets without leaking previous flow
  window.location.href = '/';
}

function bindGateButtons() {
  const googleBtn = $('#btn-login-google');
  const eprintBtn = $('#btn-login-eprint');
  googleBtn?.addEventListener('click', () => {
    if (googleBtn.disabled) return;
    window.location.href = '/auth/google';
  });
  eprintBtn?.addEventListener('click', () => {
    if (eprintBtn.disabled) return;
    window.location.href = '/auth/eprint';
  });
}

/**
 * Gate the app: resolve session, show login or allow initApp().
 * @param {() => void} initApp
 */
export async function ensureAuth(initApp) {
  bindGateButtons();
  const params = new URLSearchParams(window.location.search);
  if (params.get('auth_error')) {
    const hint = $('#auth-error');
    if (hint) {
      hint.hidden = false;
      hint.textContent = tr('authError');
    }
  }

  let ok = false;
  try {
    ok = await fetchMe();
  } catch {
    ok = false;
  }

  if (!ok) {
    await fetchConfig();
    if (config.authDisabled) {
      // AUTH_DISABLED: bypass gate even if /api/me is slow or fails
      try {
        ok = await fetchMe();
      } catch {
        /* ignore */
      }
      applyAuthI18n();
      showGate(false);
      renderUserChip();
      initApp();
      return;
    }
  }

  applyAuthI18n();

  if (ok && user) {
    showGate(false);
    renderUserChip();
    initApp();
    return;
  }

  showGate(true);
  updateProviderButtons();
}
