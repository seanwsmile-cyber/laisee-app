/**
 * Local static + AI proxy for e-print AI 利是封.
 * - Serves the SPA
 * - POST /api/generate proxies to Gemini (default) or OpenRouter
 * - Keys only from env / .env (never from the browser)
 * - No paid call when AI_MOCK=1 or key missing (clear JSON + frontend canvas fallback)
 * - Login gate: session cookie + Google OAuth + e-print SSO plug-in (see AUTH-SETUP.md)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import dns from 'node:dns';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { isIP } from 'node:net';
import { STYLES, buildPacketPrompt } from './js/styles.js';
import { createUsageStore, clientIp } from './usage-store.mjs';

// Keep local VPN adapters with unavailable IPv6 from timing out provider requests.
dns.setDefaultResultOrder('ipv4first');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
if (process.env.LOAD_DOTENV !== '0') loadDotEnv(path.join(ROOT, '.env'));
const PORT = Number(process.env.PORT || 8765);
const HOST = process.env.HOST || '127.0.0.1';
const PRODUCTION = process.env.NODE_ENV === 'production';
const PUBLIC_URL = process.env.PUBLIC_URL || `http://127.0.0.1:${PORT}`;
const PUBLIC_ORIGIN = new URL(PUBLIC_URL).origin;
const SITE_OPERATOR = (process.env.SITE_OPERATOR || '').trim();
const SUPPORT_EMAIL = (process.env.SUPPORT_EMAIL || '').trim();

const {
  handleAuthRoutes,
  requireAuth,
  authPublicConfig,
  sessionWarning,
  AUTH_DISABLED,
  validateAuthConfig,
} = await import('./auth.mjs');

if (PRODUCTION) {
  const publicUrl = new URL(PUBLIC_URL);
  if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.pathname !== '/' || publicUrl.search || publicUrl.hash) throw new Error('Production requires an HTTPS PUBLIC_URL origin');
  if (!SITE_OPERATOR || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(SUPPORT_EMAIL)) throw new Error('Production requires SITE_OPERATOR and a valid SUPPORT_EMAIL');
  if (!process.env.GEN_USAGE_FILE || !path.isAbsolute(process.env.GEN_USAGE_FILE)) throw new Error('Production requires an absolute GEN_USAGE_FILE on a persistent volume');
}
validateAuthConfig(PUBLIC_URL);

const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
if (!['gemini', 'openrouter'].includes(AI_PROVIDER)) throw new Error('Unsupported AI_PROVIDER');
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const AI_MOCK = /^(1|true|yes)$/i.test(String(process.env.AI_MOCK || ''));
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-image';
const OPENROUTER_ASPECT_RATIO =
  (process.env.OPENROUTER_ASPECT_RATIO || (OPENROUTER_MODEL.startsWith('bytedance-seed/') ? '1:2' : '9:16')).trim();
const ratioParts = /^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/.exec(OPENROUTER_ASPECT_RATIO);
const nativeRatio = ratioParts ? Number(ratioParts[1]) / Number(ratioParts[2]) : NaN;
const trimRatio = 14 / 27;
if (!Number.isFinite(nativeRatio) || nativeRatio <= 0 || 1 - Math.min(nativeRatio / trimRatio, trimRatio / nativeRatio) > 0.09) {
  throw new Error('OPENROUTER_ASPECT_RATIO must be a positive W:H ratio needing at most 9% cropping to 14:27; use 1:2 for Seedream or 9:16 for Gemini');
}
/** Prefer dedicated Image API; set OPENROUTER_IMAGE_API=0 to chat-only */
const OPENROUTER_IMAGE_API = !/^(0|false|no)$/i.test(
  String(process.env.OPENROUTER_IMAGE_API ?? '1')
);
const MAX_BODY = 12 * 1024 * 1024; // 12 MB
const AI_TIMEOUT_MS = integerSetting('AI_TIMEOUT_MS', 90000, 1000, 120000);
const TRUSTED_PROXIES = (process.env.TRUSTED_PROXY_IPS || '').split(',').map((ip) => ip.trim().replace(/^::ffff:/, '')).filter(Boolean);
if (TRUSTED_PROXIES.some((ip) => !isIP(ip))) throw new Error('TRUSTED_PROXY_IPS must contain exact IP addresses');
const usageStore = createUsageStore({
  file: process.env.GEN_USAGE_FILE || path.join(ROOT, 'tmp', 'gen-usage.json'),
  secret: process.env.SESSION_SECRET || 'local-dev-usage-salt',
  dailyLimit: integerSetting('DAILY_GEN_LIMIT', 100, 0, 100000),
  accountLimit: integerSetting('ACCOUNT_DAILY_GEN_LIMIT', 5, 0, 10000),
  ipDailyLimit: integerSetting('IP_DAILY_GEN_LIMIT', 20, 0, 100000),
  ipLimit: integerSetting('IP_GEN_LIMIT', 10, 1, 10000),
  ipWindowMs: integerSetting('IP_GEN_WINDOW_MS', 600000, 1000, 86400000),
  concurrency: integerSetting('MAX_CONCURRENT_GENERATIONS', 3, 1, 20),
});

function integerSetting(name, fallback, min, max) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}`);
  return value;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

function loadDotEnv(file) {
  try {
    const text = fs.readFileSync(file, 'utf8');
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch {
    /* no .env is fine */
  }
}

function aiStatus() {
  if (/^(1|true|yes)$/i.test(process.env.AI_DISABLED || '') || (process.env.AI_DISABLE_FILE && fs.existsSync(process.env.AI_DISABLE_FILE))) {
    return { ready: false, mode: 'disabled', provider: AI_PROVIDER };
  }
  if (AI_MOCK) {
    return { ready: false, mode: 'mock', provider: AI_PROVIDER, reason: 'AI_MOCK=1' };
  }
  if (AI_PROVIDER === 'openrouter') {
    return OPENROUTER_API_KEY
      ? { ready: true, mode: 'live', provider: 'openrouter', model: OPENROUTER_MODEL }
      : {
          ready: false,
          mode: 'unconfigured',
          provider: 'openrouter',
          reason: 'OPENROUTER_API_KEY missing',
        };
  }
  return GEMINI_API_KEY
    ? { ready: true, mode: 'live', provider: 'gemini', model: GEMINI_MODEL }
    : {
        ready: false,
        mode: 'unconfigured',
        provider: 'gemini',
        reason: 'GEMINI_API_KEY missing',
      };
}

function sendJson(res, status, obj) {
  if (res.writableEnded || res.destroyed) return;
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        if (!tooLarge) reject(Object.assign(new Error('相片資料太大，請縮細後重試。'), { status: 413, code: 'PAYLOAD_TOO_LARGE' }));
        tooLarge = true;
        chunks.length = 0;
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => { if (!tooLarge) resolve(Buffer.concat(chunks)); });
    req.on('aborted', () => reject(new Error('Request aborted')));
    req.on('error', reject);
  });
}

function stripDataUrl(dataUrlOrB64) {
  if (!dataUrlOrB64) return { mime: null, data: null };
  const s = String(dataUrlOrB64);
  const m = /^data:([^;]+);base64,(.+)$/s.exec(s);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: null, data: null };
}

function extractGeminiImage(payload) {
  // Interactions API: output_image / steps
  if (payload?.output_image?.data) {
    return {
      mime: payload.output_image.mime_type || 'image/png',
      data: payload.output_image.data,
    };
  }
  if (Array.isArray(payload?.steps)) {
    for (const step of payload.steps) {
      const blocks = step?.content || step?.summary || [];
      for (const b of blocks) {
        if (b?.type === 'image' && b.data) {
          return { mime: b.mime_type || 'image/png', data: b.data };
        }
        if (b?.inlineData?.data || b?.inline_data?.data) {
          const inline = b.inlineData || b.inline_data;
          return {
            mime: inline.mimeType || inline.mime_type || 'image/png',
            data: inline.data,
          };
        }
      }
    }
  }
  // Classic generateContent
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  for (const p of parts) {
    const inline = p.inlineData || p.inline_data;
    if (inline?.data) {
      return {
        mime: inline.mimeType || inline.mime_type || 'image/png',
        data: inline.data,
      };
    }
  }
  return null;
}

function extractOpenRouterImage(payload) {
  // Dedicated Image API: { data: [{ b64_json, media_type }] }
  if (Array.isArray(payload?.data)) {
    for (const item of payload.data) {
      if (item?.b64_json) {
        return {
          mime: item.media_type || 'image/png',
          data: item.b64_json,
        };
      }
      if (item?.url) {
        const { mime, data } = stripDataUrl(item.url);
        if (data) return { mime: mime || 'image/png', data };
      }
    }
  }
  const msg = payload?.choices?.[0]?.message;
  if (!msg) return null;
  const images = msg.images || [];
  for (const im of images) {
    const url = im?.image_url?.url || im?.imageUrl?.url;
    if (url) {
      const { mime, data } = stripDataUrl(url);
      if (data) return { mime: mime || 'image/png', data };
    }
  }
  if (typeof msg.content === 'string' && msg.content.startsWith('data:image')) {
    return stripDataUrl(msg.content);
  }
  if (Array.isArray(msg.content)) {
    for (const part of msg.content) {
      if (part?.type === 'image_url' && part.image_url?.url) {
        return stripDataUrl(part.image_url.url);
      }
      if (part?.inline_data?.data) {
        return {
          mime: part.inline_data.mime_type || 'image/png',
          data: part.inline_data.data,
        };
      }
    }
  }
  return null;
}

async function callGemini({ prompt, photos, styleImage }) {
  const input = [{ type: 'text', text: prompt }];
  // Style template first, then user photos (same order as OpenRouter refs).
  const refs = buildOrderedImageRefs({ styleImage, photos, max: 5 });
  for (const p of refs) {
    const { mime, data } = stripDataUrl(p);
    if (!data) continue;
    input.push({
      type: 'image',
      mime_type: mime || 'image/jpeg',
      data,
    });
  }

  const url = 'https://generativelanguage.googleapis.com/v1beta/interactions';
  const res = await fetch(url, {
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      store: false,
      input,
      response_format: {
        type: 'image',
        mime_type: 'image/png',
        aspect_ratio: '9:16',
        image_size: '1K',
      },
    }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw Object.assign(new Error(`Gemini non-JSON (${res.status})`), {
      status: 502,
      detail: text.slice(0, 400),
    });
  }
  if (!res.ok) {
    const msg =
      json?.error?.message || json?.message || `Gemini HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: 502, detail: json });
  }
  const img = extractGeminiImage(json);
  if (!img?.data) {
    throw Object.assign(new Error('Gemini returned no image'), {
      status: 502,
      detail: { keys: Object.keys(json || {}) },
    });
  }
  return img;
}

function openRouterHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'HTTP-Referer': PUBLIC_ORIGIN,
    'X-Title': 'AI Laisee',
  };
}

/**
 * Ordered image refs for template-replace: [styleImage?, ...photos].
 * Image API allows ~3 total; Gemini path may take a few more.
 * @param {{ styleImage?: string, photos?: string[], max?: number }} opts
 */
function buildOrderedImageRefs({ styleImage, photos = [], max = 3 } = {}) {
  const out = [];
  if (styleImage) {
    const raw = String(styleImage);
    out.push(raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`);
  }
  for (const p of photos) {
    if (out.length >= max) break;
    if (!p) continue;
    const raw = String(p);
    out.push(raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`);
  }
  return out;
}


async function parseOpenRouterResponse(res) {
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw Object.assign(new Error(`OpenRouter non-JSON (${res.status})`), {
      status: 502,
      detail: text.slice(0, 400),
    });
  }
  if (!res.ok) {
    const msg =
      json?.error?.message || json?.message || `OpenRouter HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: 502, detail: json });
  }
  const img = extractOpenRouterImage(json);
  if (!img?.data) {
    throw Object.assign(new Error('OpenRouter returned no image'), {
      status: 502,
      detail: { keys: Object.keys(json || {}) },
    });
  }
  return img;
}

/** Dedicated Image API — preferred for 2026 image models */
async function callOpenRouterImages({ prompt, photos, styleImage }) {
  const body = {
    model: OPENROUTER_MODEL,
    prompt,
    aspect_ratio: OPENROUTER_ASPECT_RATIO,
    n: 1,
  };
  // [styleImage, ...photos] — template first for Seedream / Gemini image replace.
  const refs = buildOrderedImageRefs({ styleImage, photos, max: 3 });
  if (refs.length) {
    body.input_references = refs.map((url) => ({
      type: 'image_url',
      image_url: { url },
    }));
  }
  const res = await fetch('https://openrouter.ai/api/v1/images', {
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    method: 'POST',
    headers: openRouterHeaders(),
    body: JSON.stringify(body),
  });
  return parseOpenRouterResponse(res);
}

/** Legacy chat completions path (modalities image+text) */
async function callOpenRouterChat({ prompt, photos, styleImage }) {
  const content = [{ type: 'text', text: prompt }];
  // Style template first on chat path too.
  for (const url of buildOrderedImageRefs({ styleImage, photos, max: 5 })) {
    content.push({ type: 'image_url', image_url: { url } });
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    method: 'POST',
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
      image_config: { aspect_ratio: OPENROUTER_ASPECT_RATIO },
    }),
  });
  return parseOpenRouterResponse(res);
}

async function callOpenRouter(options) {
  // One billable request per reservation. A timeout can still have been billed.
  return OPENROUTER_IMAGE_API ? callOpenRouterImages(options) : callOpenRouterChat(options);
}

function publicAiStatus() {
  const { ready, mode, provider } = aiStatus();
  return { ready, mode, provider };
}

function usageFor(req, user) {
  const ai = publicAiStatus();
  const usage = usageStore.usage(user.provider + ':' + user.sub, clientIp(req, TRUSTED_PROXIES));
  usage.available = ai.ready && usage.available;
  return { ai, usage };
}

function badRequest(message = '生成資料無效，請重新選擇相片及款式。') {
  return Object.assign(new Error(message), { status: 400, code: 'BAD_REQUEST' });
}

function validatePayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest();
  const fields = ['style', 'category', 'greeting', 'message', 'tweak', 'photos'];
  if (Object.keys(body).some((key) => !fields.includes(key))) throw badRequest();
  const style = STYLES.find((item) => item.id === body.style);
  if (!style || body.category !== style.category) throw badRequest('款式或分類無效。');
  for (const [field, max] of [['greeting', 30], ['message', 30], ['tweak', 300]]) {
    if (body[field] === undefined) body[field] = '';
    if (typeof body[field] !== 'string' || [...body[field]].length > max || /[\u0000-\u0008\u000b-\u001f]/.test(body[field])) throw badRequest('賀詞或修改要求太長或包含無效文字。');
  }
  if (!body.greeting.trim()) throw badRequest('請輸入賀詞。');
  if (!Array.isArray(body.photos) || body.photos.length < 1 || body.photos.length > 2) throw badRequest('請選擇 1 至 2 張相片。');
  for (const photo of body.photos) {
    if (typeof photo !== 'string' || photo.length > 4 * 1024 * 1024 + 64) throw badRequest('相片太大。');
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo);
    if (!match || match[2].length % 4 !== 0) throw badRequest('相片須為 JPEG、PNG 或 WebP。');
    const bytes = Buffer.from(match[2], 'base64');
    const mime = match[1];
    const signatureOk = mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : mime === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!signatureOk || bytes.length > 3 * 1024 * 1024 || bytes.toString('base64') !== match[2]) throw badRequest('相片資料無效或太大。');
  }
  const prompt = buildPacketPrompt({ styleId: style.id, category: style.category, greeting: body.greeting, message: body.message, tweak: body.tweak });
  const styleImage = style.skipTemplateImage ? null : 'data:image/jpeg;base64,' + fs.readFileSync(path.join(ROOT, style.image.split('?')[0])).toString('base64');
  return { prompt, photos: body.photos, styleImage };
}

async function handleGenerate(req, res) {
  const user = requireAuth(req, res, sendJson);
  if (!user) return;
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) {
    return sendJson(res, 415, { ok: false, error: 'UNSUPPORTED_MEDIA_TYPE', message: '請使用 JSON 格式。', fallback: true });
  }
  if (Number(req.headers['content-length'] || 0) > MAX_BODY) {
    req.resume();
    return sendJson(res, 413, { ok: false, error: 'PAYLOAD_TOO_LARGE', message: '相片資料太大。', fallback: true });
  }
  let body;
  try { body = JSON.parse((await readBody(req)).toString('utf8')); }
  catch (error) {
    return sendJson(res, error.status || 400, { ok: false, error: error.code || 'BAD_REQUEST', message: '無法讀取生成資料，請重新選擇相片。', fallback: true });
  }
  const options = validatePayload(body);
  const status = aiStatus();
  if (!status.ready) {
    return sendJson(res, 503, {
      ok: false,
      error: status.mode === 'mock' ? 'AI_MOCK' : status.mode === 'disabled' ? 'AI_DISABLED' : 'AI_NOT_CONFIGURED',
      message: 'AI 生成暫未開放，可使用本地相片合成。',
      fallback: true,
      ai: publicAiStatus(),
    });
  }
  const release = usageStore.reserve(user.provider + ':' + user.sub, clientIp(req, TRUSTED_PROXIES));
  const started = Date.now();
  const requestId = crypto.randomUUID();
  let outcome = 'failed';
  try {
    const img = status.provider === 'openrouter' ? await callOpenRouter(options) : await callGemini(options);
    if (!/^image\/(?:png|jpeg|webp)$/.test(img.mime) || typeof img.data !== 'string' || img.data.length > 32 * 1024 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/.test(img.data)) throw new Error('Invalid upstream image');
    outcome = 'success';
    return sendJson(res, 200, { ok: true, mode: 'ai', mime: img.mime, imageBase64: img.data, dataUrl: 'data:' + img.mime + ';base64,' + img.data });
  } catch (error) {
    const timeout = error.name === 'TimeoutError' || error.name === 'AbortError';
    outcome = timeout ? 'timeout' : 'failed';
    return sendJson(res, timeout ? 504 : 502, {
      ok: false,
      error: timeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILED',
      message: timeout ? 'AI 回應超時。今次嘗試已計入額度，可稍後重試或使用本地合成。' : 'AI 暫時未能完成。今次嘗試已計入額度，可稍後重試或使用本地合成。',
      fallback: true,
      requestId,
    });
  } finally {
    release();
    console.log(JSON.stringify({ event: 'generation', requestId, outcome, durationMs: Date.now() - started }));
  }
}

const STATIC_FILES = new Set([
  '/index.html', '/privacy.html', '/help.html', '/favicon.ico', '/favicon.png', '/favicon.svg',
  '/css/styles.css', '/css/info.css', '/js/site-info.js', '/js/app.js', '/js/auth.js', '/js/generate.js', '/js/i18n.js', '/js/styles.js',
]);
for (const style of STYLES) {
  STATIC_FILES.add('/' + style.image.split('?')[0]);
  STATIC_FILES.add('/' + style.thumb.split('?')[0]);
}

async function serveStatic(req, res, urlPath) {
  const relative = urlPath === '/' ? '/index.html' : urlPath;
  if (!STATIC_FILES.has(relative)) return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
  const file = path.resolve(ROOT, '.' + relative);
  // A symlink/reparse point must not expose anything outside the public source tree.
  let real;
  try { real = await fs.promises.realpath(file); }
  catch { return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' }); }
  if (real !== file || path.relative(ROOT, real).startsWith('..')) return sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
  const data = await fs.promises.readFile(file);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
    'Content-Length': data.length,
    'Cache-Control': 'no-cache',
  });
  res.end(req.method === 'HEAD' ? undefined : data);
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://lh3.googleusercontent.com; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  if (PRODUCTION) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}

function sameOrigin(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') return false;
  const origin = req.headers.origin;
  if (!origin) return !PRODUCTION; // browser mutation requests require Origin online
  if (origin === PUBLIC_ORIGIN) return true;
  if (!PRODUCTION && [ 'http://localhost:' + PORT, 'http://127.0.0.1:' + PORT ].includes(origin)) return true;
  return false;
}

const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  try {
    const rawPath = (req.url || '/').split('?')[0];
    if (!rawPath.startsWith('/') || rawPath.startsWith('//')) throw badRequest();
    const urlPath = decodeURIComponent(rawPath);
    if (/[\\\u0000-\u001f]/.test(urlPath) || urlPath.split('/').some((part) => part === '.' || part === '..')) throw badRequest();
    const urlObj = new URL(req.url, PUBLIC_ORIGIN);
    if (req.method === 'POST' && !sameOrigin(req)) return sendJson(res, 403, { ok: false, error: 'ORIGIN_DENIED', message: '請由網站內操作。', fallback: false });
    if (req.method === 'GET' && urlPath === '/api/health') {
      return sendJson(res, 200, { ok: true, ai: publicAiStatus(), auth: authPublicConfig() });
    }
    if (req.method === 'GET' && urlPath === '/api/site-config') {
      return sendJson(res, 200, { operatorName: SITE_OPERATOR, supportEmail: SUPPORT_EMAIL, aiProvider: AI_PROVIDER });
    }
    if (req.method === 'GET' && urlPath === '/api/usage') {
      const user = requireAuth(req, res, sendJson);
      if (user) sendJson(res, 200, { ok: true, ...usageFor(req, user) });
      return;
    }
    if (await handleAuthRoutes(req, res, { sendJson, urlPath, urlObj })) return;
    if (req.method === 'POST' && urlPath === '/api/generate') return await handleGenerate(req, res);
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res, urlPath);
    return sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  } catch (error) {
    const known = error.status && error.code;
    if (error.status === 429) res.setHeader('Retry-After', error.code === 'BUSY' ? '10' : '600');
    if (!known && !(error instanceof URIError)) console.error(JSON.stringify({ event: 'request_error', code: 'INTERNAL_ERROR' }));
    return sendJson(res, known ? error.status : error instanceof URIError ? 400 : 500, {
      ok: false,
      error: known ? error.code : error instanceof URIError ? 'BAD_REQUEST' : 'INTERNAL_ERROR',
      message: known ? error.message : '暫時未能處理，請稍後再試。',
      scope: error.scope,
      fallback: true,
    });
  }
});

server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.keepAliveTimeout = 5000;
server.on('error', () => { usageStore.close(); process.exitCode = 1; console.error('[laisee] server failed to start'); });
server.on('close', () => usageStore.close());
process.on('exit', () => usageStore.close());
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 130000).unref();
  });
}
server.listen(PORT, HOST, () => {
  console.log('[laisee] http://' + HOST + ':' + PORT + '/');
  console.log('[laisee] AI provider=' + AI_PROVIDER + ' mode=' + aiStatus().mode);
  if (AUTH_DISABLED) console.log('[laisee] AUTH_DISABLED=1 — local development only');
  const warning = sessionWarning();
  if (warning) console.warn('[laisee] ' + warning);
});
