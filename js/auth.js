/**
 * Frontend login gate — requires /api/me before showing the 6-step flow.
 */
import { t } from './i18n.js?v=20261023d';

let lang = 'zh-Hant';
let config = {
  authDisabled: false,
  googleConfigured: false,
  eprintConfigured: false,
  eprintEnabled: false,
};
let user = null;
let checking = false;
let authStatus = 'authLoading';
let startApp;
let initialized = false;

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
  const status = $('#auth-status');
  if (status) status.textContent = authStatus ? tr(authStatus) : '';
}

function updateProviderButtons() {
  const googleBtn = $('#btn-login-google');
  const googleHint = $('#auth-google-hint');
  if (!googleBtn) return;

  if (config.googleConfigured && !checking) {
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
      googleHint.hidden = checking;
      googleHint.textContent = checking ? '' : tr('authGoogleUnset');
    }
  }

  if ($('#btn-auth-retry')) $('#btn-auth-retry').disabled = checking;
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

async function fetchAuthJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(url, { credentials: 'same-origin', ...options, signal: controller.signal });
    if (!res.ok && res.status !== 401) throw new Error('auth service unavailable');
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMe() {
  const json = await fetchAuthJson('/api/me');
  if (json?.authenticated && json.user) {
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
    const json = await fetchAuthJson('/api/auth/config');
    if (json?.ok) {
      config = {
        authDisabled: !!json.authDisabled,
        googleConfigured: !!json.googleConfigured,
        eprintConfigured: !!json.eprintConfigured,
        eprintEnabled: !!json.eprintEnabled,
      };
    }
}

function onLogout() {
  const event = new CustomEvent('laisee:beforelogout', { cancelable: true, detail: { proceed: performLogout } });
  if (window.dispatchEvent(event)) performLogout();
}

async function performLogout() {
  const button = $('#btn-logout');
  if (button?.disabled) return;
  if (button) button.disabled = true;
  try {
    const result = await fetchAuthJson('/api/logout', { method: 'POST' });
    if (!result?.ok) throw new Error('logout failed');
    user = null;
    showGate(true);
    window.location.href = '/';
  } catch {
    window.dispatchEvent(new Event('laisee:logout-error'));
    if (button) button.disabled = false;
  }
}

function bindGateButtons() {
  const googleBtn = $('#btn-login-google');
  googleBtn?.addEventListener('click', () => {
    if (googleBtn.disabled) return;
    window.location.href = '/auth/google';
  });
  $('#btn-auth-retry')?.addEventListener('click', checkSession);
}

/**
 * Gate the app: resolve session, show login or allow initApp().
 * @param {() => void} initApp
 */
export async function ensureAuth(initApp) {
  startApp = initApp;
  bindGateButtons();
  const params = new URLSearchParams(window.location.search);
  if (params.get('auth_error')) {
    const hint = $('#auth-error');
    if (hint) {
      hint.hidden = false;
      hint.textContent = tr('authError');
    }
  }

  await checkSession();
}

async function checkSession() {
  if (checking) return;
  checking = true;
  authStatus = 'authLoading';
  showGate(true);
  applyAuthI18n();
  try {
    const ok = await fetchMe();
    if (ok && user) {
      authStatus = '';
      showGate(false);
      if (!initialized) {
        initialized = true;
        startApp();
      }
    } else {
      await fetchConfig();
      authStatus = '';
    }
  } catch {
    authStatus = 'authConnectionError';
  } finally {
    checking = false;
    applyAuthI18n();
  }
}
