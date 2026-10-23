/**
 * Session + Google OAuth + e-print SSO plug-in point.
 * Secrets only from env; never log client secrets or session tokens.
 */
import crypto from 'node:crypto';

const COOKIE_NAME = 'laisee_session';
const SESSION_DAYS = 7;
const STATE_COOKIE = 'laisee_oauth_state';

const AUTH_DISABLED = /^(1|true|yes)$/i.test(String(process.env.AUTH_DISABLED || ''));
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (AUTH_DISABLED ? 'dev-only-auth-disabled-secret' : '');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  'http://127.0.0.1:8765/auth/google/callback';
const PRODUCTION = process.env.NODE_ENV === 'production';

export function validateAuthConfig(publicUrl) {
  if (!PRODUCTION) return;
  if (AUTH_DISABLED) throw new Error('AUTH_DISABLED is forbidden in production');
  if (SESSION_SECRET.length < 32 || /dev-only|example|change.?me|replace/i.test(SESSION_SECRET)) {
    throw new Error('Production requires a random SESSION_SECRET of at least 32 characters');
  }
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new Error('Production Google OAuth credentials are required');
  const callback = new URL(GOOGLE_REDIRECT_URI);
  if (callback.href !== new URL('/auth/google/callback', publicUrl).href) {
    throw new Error('GOOGLE_REDIRECT_URI must equal PUBLIC_URL + /auth/google/callback');
  }
  if (/^(0|false|no)$/i.test(String(process.env.COOKIE_SECURE || ''))) {
    throw new Error('Secure cookies cannot be disabled in production');
  }
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

function fromB64url(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function sign(payloadB64) {
  if (!SESSION_SECRET) return '';
  return b64url(
    crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest()
  );
}

function parseCookies(req) {
  const header = req.headers?.cookie || '';
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

function cookieHeader(name, value, { maxAge, clear = false } = {}) {
  const parts = [
    `${name}=${clear ? '' : encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (clear) {
    parts.push('Max-Age=0');
  } else if (maxAge != null) {
    parts.push(`Max-Age=${maxAge}`);
  }
  // Local http://127.0.0.1 — no Secure flag (dev). Set COOKIE_SECURE=1 for HTTPS.
  if (PRODUCTION || /^(1|true|yes)$/i.test(String(process.env.COOKIE_SECURE || ''))) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function authPublicConfig() {
  return {
    authDisabled: AUTH_DISABLED,
    googleConfigured: !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET),
    eprintConfigured: false,
    eprintEnabled: false,
    eprintHasUrl: false,
  };
}

export function sessionWarning() {
  if (AUTH_DISABLED) return null;
  if (!SESSION_SECRET) {
    return 'SESSION_SECRET missing — sessions cannot be signed; set SESSION_SECRET or AUTH_DISABLED=1 for local bypass';
  }
  return null;
}

function encodeSession(user) {
  const payload = {
    sub: user.sub,
    email: user.email || '',
    name: user.name || '',
    picture: user.picture || '',
    provider: user.provider || 'google',
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 3600,
  };
  const payloadB64 = b64urlJson(payload);
  return `${payloadB64}.${sign(payloadB64)}`;
}

function decodeSession(token) {
  if (!token || !SESSION_SECRET) return null;
  const parts = String(token).split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expect = sign(payloadB64);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload?.sub || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return {
    sub: String(payload.sub),
    email: String(payload.email || ''),
    name: String(payload.name || ''),
    picture: String(payload.picture || ''),
    provider: String(payload.provider || 'google'),
  };
}

export function getSessionUser(req) {
  if (AUTH_DISABLED) {
    return {
      sub: 'dev-bypass',
      email: 'dev@localhost',
      name: 'Dev',
      picture: '',
      provider: 'bypass',
    };
  }
  const cookies = parseCookies(req);
  return decodeSession(cookies[COOKIE_NAME]);
}

export function requireAuth(req, res, sendJson) {
  const user = getSessionUser(req);
  if (user) return user;
  sendJson(res, 401, {
    ok: false,
    error: 'UNAUTHORIZED',
    message: 'Login required',
    fallback: false,
  });
  return null;
}


function clearSessionCookies() {
  return [
    cookieHeader(COOKIE_NAME, '', { clear: true }),
    cookieHeader(STATE_COOKIE, '', { clear: true }),
  ];
}

function redirect(res, location, setCookie) {
  const headers = { Location: location };
  if (setCookie) {
    headers['Set-Cookie'] = Array.isArray(setCookie) ? setCookie : [setCookie];
  }
  res.writeHead(302, headers);
  res.end();
}

function htmlError(res, status, title, message) {
  const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  title = escape(title);
  message = escape(message);
  const body = `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui;padding:2rem"><h1>${title}</h1><p>${message}</p><p><a href="/">返回</a></p></body></html>`;
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(body);
  return true;
}

async function exchangeGoogleCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    redirect_uri: GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    signal: AbortSignal.timeout(15000),
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    const err = new Error(tokenJson.error_description || tokenJson.error || 'token exchange failed');
    err.detail = { status: tokenRes.status };
    throw err;
  }
  const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const info = await infoRes.json().catch(() => ({}));
  if (!infoRes.ok || !info.sub) {
    throw new Error(info.error_description || info.error || 'userinfo failed');
  }
  return {
    sub: info.sub,
    email: info.email || '',
    name: info.name || info.email || 'Google user',
    picture: info.picture || '',
    provider: 'google',
  };
}

/**
 * Handle auth-related routes. Returns true if handled.
 */
export async function handleAuthRoutes(req, res, { sendJson, urlPath, urlObj }) {
  const method = req.method || 'GET';

  if (method === 'GET' && urlPath === '/api/auth/config') {
    sendJson(res, 200, { ok: true, ...authPublicConfig() });
    return true;
  }

  if (method === 'GET' && urlPath === '/api/me') {
    const user = getSessionUser(req);
    if (!user) {
      sendJson(res, 401, { ok: false, authenticated: false, error: 'UNAUTHORIZED' });
      return true;
    }
    sendJson(res, 200, {
      ok: true,
      authenticated: true,
      user: {
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: user.provider,
      },
      ...authPublicConfig(),
    });
    return true;
  }

  if (method === 'POST' && urlPath === '/api/logout') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': clearSessionCookies(),
    });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  // Google OAuth start
  if (method === 'GET' && urlPath === '/auth/google') {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return htmlError(
        res,
        503,
        'Google 登入未設定',
        '伺服器未設定 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET。請見 AUTH-SETUP.md。'
      );
    }
    if (!SESSION_SECRET && !AUTH_DISABLED) {
      return htmlError(
        res,
        503,
        'Session 未設定',
        '請設定 SESSION_SECRET（或本機開發用 AUTH_DISABLED=1）。'
      );
    }
    const state = b64url(crypto.randomBytes(16));
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    });
    redirect(
      res,
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      cookieHeader(STATE_COOKIE, state, { maxAge: 600 })
    );
    return true;
  }

  // Google OAuth callback
  if (method === 'GET' && urlPath === '/auth/google/callback') {
    const q = urlObj.searchParams;
    const err = q.get('error');
    if (err) {
      return htmlError(res, 400, 'Google 登入取消／失敗', String(err));
    }
    const code = q.get('code');
    const state = q.get('state');
    const cookies = parseCookies(req);
    if (!code || !state || state !== cookies[STATE_COOKIE]) {
      return htmlError(res, 400, 'OAuth state 無效', '請重新由登入頁開始。');
    }
    try {
      const user = await exchangeGoogleCode(code);
      const token = encodeSession(user);
      res.writeHead(302, {
        Location: '/',
        'Set-Cookie': [
          cookieHeader(COOKIE_NAME, token, { maxAge: SESSION_DAYS * 24 * 3600 }),
          cookieHeader(STATE_COOKIE, '', { clear: true }),
        ],
      });
      res.end();
    } catch (e) {
      console.error('[auth/google] callback failed');
      return htmlError(res, 502, 'Google 登入失敗', '換取 token 或讀取 userinfo 失敗。請稍後再試。');
    }
    return true;
  }

  // SSO has no verified callback yet; never advertise or redirect to it.
  if (method === 'GET' && urlPath === '/auth/eprint') {
      return htmlError(
        res,
        503,
        'e-print 登入即將推出',
        '請使用 Google 登入。'
      );
  }

  // Reserved callback for future e-print SSO
  if (
    (method === 'GET' || method === 'POST') &&
    urlPath === '/auth/eprint/callback'
  ) {
    sendJson(res, 501, {
      ok: false,
      error: 'EPRINT_SSO_NOT_WIRED',
      message:
        'e-print SSO callback reserved. Provide authorize URL, client id, redirect URI, and userinfo shape — see AUTH-SETUP.md.',
    });
    return true;
  }

  return false;
}

export { AUTH_DISABLED, COOKIE_NAME };
