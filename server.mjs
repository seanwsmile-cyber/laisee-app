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

// Avoid IPv6 blackhole / UND_ERR_CONNECT_TIMEOUT on Windows VPN adapters when calling OpenRouter/Gemini
dns.setDefaultResultOrder('ipv4first');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8765);
/** Local default 127.0.0.1; set HOST=0.0.0.0 on Fly/Render/Railway */
const HOST = process.env.HOST || '127.0.0.1';

loadDotEnv(path.join(ROOT, '.env'));

const {
  handleAuthRoutes,
  requireAuth,
  authPublicConfig,
  sessionWarning,
  AUTH_DISABLED,
} = await import('./auth.mjs');

const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const AI_MOCK = /^(1|true|yes)$/i.test(String(process.env.AI_MOCK || ''));
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-image';
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-image';
const OPENROUTER_ASPECT_RATIO =
  process.env.OPENROUTER_ASPECT_RATIO || '2:3';
/** Prefer dedicated Image API; set OPENROUTER_IMAGE_API=0 to chat-only */
const OPENROUTER_IMAGE_API = !/^(0|false|no)$/i.test(
  String(process.env.OPENROUTER_IMAGE_API ?? '1')
);
const MAX_BODY = 12 * 1024 * 1024; // 12 MB

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
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(root, cleaned);
  if (!full.startsWith(root)) return null;
  return full;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Body too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function stripDataUrl(dataUrlOrB64) {
  if (!dataUrlOrB64) return { mime: null, data: null };
  const s = String(dataUrlOrB64);
  const m = /^data:([^;]+);base64,(.+)$/s.exec(s);
  if (m) return { mime: m[1], data: m[2] };
  return { mime: 'image/jpeg', data: s };
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
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      input,
      response_format: {
        type: 'image',
        mime_type: 'image/png',
        aspect_ratio: '2:3',
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
    'HTTP-Referer': 'http://127.0.0.1:8765',
    'X-Title': 'e-print AI Laisee (local)',
  };
}

function photosToDataUrls(photos, max = 3) {
  const out = [];
  for (const p of photos.slice(0, max)) {
    const raw = String(p);
    out.push(
      raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`
    );
  }
  return out;
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
    method: 'POST',
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
    }),
  });
  return parseOpenRouterResponse(res);
}

async function callOpenRouter({ prompt, photos, styleImage }) {
  let imageErr = null;
  if (OPENROUTER_IMAGE_API) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        return await callOpenRouterImages({ prompt, photos, styleImage });
      } catch (err) {
        imageErr = err;
        console.error(
          `[api/generate] OpenRouter Image API attempt ${attempt} failed:`,
          err.message
        );
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }
  }
  // Pure image models (Seedream, Flux, Imagen, Ideogram, Recraft) do not have a /chat/completions endpoint
  if (/seedream|flux|imagen|ideogram|recraft/i.test(OPENROUTER_MODEL) && imageErr) {
    throw imageErr;
  }
  try {
    return await callOpenRouterChat({ prompt, photos, styleImage });
  } catch (chatErr) {
    throw imageErr || chatErr;
  }
}

// ---- Generation rate limits (global daily cap + per-IP) ----
const DAILY_GEN_LIMIT = Math.max(0, Number(process.env.DAILY_GEN_LIMIT || 100));
const IP_GEN_LIMIT = Math.max(1, Number(process.env.IP_GEN_LIMIT || 30));
const IP_GEN_WINDOW_MS = Math.max(1000, Number(process.env.IP_GEN_WINDOW_MS || 10 * 60 * 1000));
const ENFORCE_LOCAL_RATE_LIMIT = /^(1|true|yes)$/i.test(String(process.env.ENFORCE_LOCAL_RATE_LIMIT || ''));
const USAGE_FILE = process.env.GEN_USAGE_FILE || path.join(ROOT, 'tmp', 'gen-usage.json');
const ipHits = new Map();
function shanghaiDay(d = new Date()) {
  return new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}
function loadUsage() {
  try {
    const j = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf8'));
    if (j && j.day === shanghaiDay()) return { day: j.day, count: Number(j.count) || 0 };
  } catch {}
  return { day: shanghaiDay(), count: 0 };
}
function saveUsage(u) {
  try {
    fs.mkdirSync(path.dirname(USAGE_FILE), { recursive: true });
    fs.writeFileSync(USAGE_FILE + '.tmp', JSON.stringify(u));
    fs.renameSync(USAGE_FILE + '.tmp', USAGE_FILE);
  } catch (err) {
    console.error('[ratelimit] save failed', err.message);
  }
}
function clientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return String(cf).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
function isLoopbackIp(ip) {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/** Returns null if allowed, else {scope, message, retryAfter}. Quota is recorded via recordGenSuccess after upstream succeeds. */
function checkGenLimit(req) {
  const now = Date.now();
  const ip = clientIp(req);
  if (isLoopbackIp(ip) && !ENFORCE_LOCAL_RATE_LIMIT) {
    return null;
  }
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < IP_GEN_WINDOW_MS);
  ipHits.set(ip, hits);
  if (hits.length >= IP_GEN_LIMIT) {
    const mins = Math.max(1, Math.ceil((IP_GEN_WINDOW_MS - (now - hits[0])) / 60000));
    return { message: `你用得太快喇！請等大約 ${mins} 分鐘再試 🙏`, scope: 'ip', retryAfter: mins * 60 };
  }
  const u = loadUsage();
  if (u.count >= DAILY_GEN_LIMIT) {
    return { message: `今日 AI 生成名額（${DAILY_GEN_LIMIT} 次）已經用晒喇，聽日（香港時間午夜後）再嚟啦 🧧`, scope: 'daily', retryAfter: 3600 };
  }
  return null;
}

function recordGenSuccess(req) {
  const now = Date.now();
  const ip = clientIp(req);
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < IP_GEN_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  const u = loadUsage();
  u.count += 1;
  saveUsage(u);
}
function genUsage() {
  const u = loadUsage();
  return { day: u.day, used: u.count, limit: DAILY_GEN_LIMIT, remaining: Math.max(0, DAILY_GEN_LIMIT - u.count) };
}

async function handleGenerate(req, res) {
  if (!requireAuth(req, res, sendJson)) return;
  const status = aiStatus();
  let body;
  try {
    const raw = await readBody(req);
    body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
  } catch (err) {
    return sendJson(res, err.status || 400, {
      ok: false,
      error: 'BAD_REQUEST',
      message: err.message || 'Invalid JSON body',
      fallback: true,
    });
  }

  const prompt = String(body.prompt || '').trim();
  if (!prompt) {
    return sendJson(res, 400, {
      ok: false,
      error: 'MISSING_PROMPT',
      message: 'prompt is required',
      fallback: true,
    });
  }
  const photos = Array.isArray(body.photos) ? body.photos : [];
  const styleImage = body.styleImage || body.style_image || null;

  if (!status.ready) {
    return sendJson(res, 503, {
      ok: false,
      error: status.mode === 'mock' ? 'AI_MOCK' : 'AI_NOT_CONFIGURED',
      message:
        status.mode === 'mock'
          ? 'AI_MOCK=1 — 唔會 call 付費 API；請用前端 Canvas fallback'
          : `${status.reason}。請喺 .env 設定 key，或繼續用本地 Canvas 合成。`,
      fallback: true,
      ai: status,
    });
  }

  const limited = checkGenLimit(req);
  if (limited) {
    res.setHeader('Retry-After', String(limited.retryAfter));
    return sendJson(res, 429, {
      ok: false,
      error: 'RATE_LIMITED',
      scope: limited.scope,
      message: limited.message,
      fallback: true,
    });
  }

  try {
    const img =
      status.provider === 'openrouter'
        ? await callOpenRouter({ prompt, photos, styleImage })
        : await callGemini({ prompt, photos, styleImage });
    recordGenSuccess(req);
    return sendJson(res, 200, {
      ok: true,
      mode: 'ai',
      provider: status.provider,
      model: status.model,
      mime: img.mime || 'image/png',
      imageBase64: img.data,
      dataUrl: `data:${img.mime || 'image/png'};base64,${img.data}`,
    });
  } catch (err) {
    console.error('[api/generate]', err.message);
    return sendJson(res, err.status || 502, {
      ok: false,
      error: 'UPSTREAM_FAILED',
      message: err.message || 'Upstream AI failed',
      fallback: true,
      detail: err.detail || undefined,
    });
  }
}

function serveStatic(req, res) {
  let urlPath = req.url?.split('?')[0] || '/';
  if (urlPath === '/') urlPath = '/index.html';
  const file = safeJoin(ROOT, urlPath);
  if (!file) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  let urlObj;
  let urlPath;
  try {
    // Fixed base avoids Host-header poisoning; collapse leading // so protocol-relative
    // paths (e.g. "//") cannot throw and take down the process.
    const pathAndQuery = (req.url || '/').replace(/^\/+/, '/');
    urlObj = new URL(pathAndQuery, 'http://localhost');
    urlPath = urlObj.pathname;
  } catch (err) {
    console.error('[url]', err.message);
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad Request');
  }

  if (req.method === 'GET' && urlPath === '/api/health') {
    return sendJson(res, 200, {
      ok: true,
      ai: aiStatus(),
      auth: authPublicConfig(),
      usage: genUsage(),
    });
  }

  try {
    if (await handleAuthRoutes(req, res, { sendJson, urlPath, urlObj })) {
      return;
    }
  } catch (err) {
    console.error('[auth]', err.message);
    return sendJson(res, 500, { ok: false, error: 'AUTH_ERROR', message: 'Auth handler failed' });
  }

  if (req.method === 'POST' && urlPath === '/api/generate') {
    return handleGenerate(req, res);
  }
  if (req.method === 'OPTIONS' && urlPath.startsWith('/api/')) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    });
    return res.end();
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(req, res);
  }
  res.writeHead(405);
  res.end('Method Not Allowed');
});

server.listen(PORT, HOST, () => {
  const st = aiStatus();
  const ac = authPublicConfig();
  console.log(`[laisee] http://${HOST}:${PORT}/`);
  console.log(
    `[laisee] AI provider=${st.provider} mode=${st.mode}` +
      (st.ready ? ` model=${st.model}` : ` (${st.reason})`)
  );
  if (!st.ready) {
    console.log(
      '[laisee] 無可用 AI key / mock — /api/generate 會回 fallback；前端會用 Canvas 合成'
    );
  }
  if (AUTH_DISABLED) {
    console.log('[laisee] AUTH_DISABLED=1 — login gate bypassed for local/dev');
  } else {
    console.log(
      `[laisee] auth google=${ac.googleConfigured ? 'ready' : 'unconfigured'} eprint=${ac.eprintConfigured ? 'url-set' : 'pending'}`
    );
    const warn = sessionWarning();
    if (warn) console.warn(`[laisee] ${warn}`);
  }
});
