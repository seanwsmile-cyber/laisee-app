/** Online boundary + budget regressions; all provider traffic is intercepted before startup. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createUsageStore, clientIp } from '../usage-store.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'laisee-security-'));
const children = new Set();
const image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aIioAAAAASUVORK5CYII=';
const payload = { style: 'style01', category: 'pet', greeting: '恭喜發財', message: '', tweak: '', photos: ['data:image/png;base64,' + image] };
const fixture = path.join(temp, 'provider-fixture.mjs');
fs.writeFileSync(fixture, `
import fs from 'node:fs';
globalThis.fetch = async (url, options = {}) => {
  const gemini = String(url) === 'https://generativelanguage.googleapis.com/v1beta/interactions';
  if (!gemini && !String(url).startsWith('https://openrouter.ai/api/v1/')) throw new Error('Unexpected network access');
  const body = JSON.parse(options.body);
  const content = body.messages?.[0]?.content || body.input || [];
  fs.appendFileSync(process.env.TEST_CALL_LOG, JSON.stringify({ endpoint: String(url), ratio: body.aspect_ratio || body.image_config?.aspect_ratio || body.response_format?.aspect_ratio, refs: body.input_references?.length ?? content.filter(p => p.type === 'image_url' || p.type === 'image').length, prompt: body.prompt || content[0]?.text, before: JSON.parse(fs.readFileSync(process.env.GEN_USAGE_FILE, 'utf8')).count }) + '\\n');
  if (process.env.TEST_PROVIDER_TIMEOUT === '1') {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 10000);
      options.signal.addEventListener('abort', () => { clearTimeout(timer); reject(options.signal.reason); }, {once:true});
    });
  } else await new Promise((resolve) => setTimeout(resolve, 250));
  if (process.env.TEST_PROVIDER_FAIL === '1') return new Response(JSON.stringify({error:{message:'SECRET upstream diagnostic'}}), {status:500});
  return new Response(JSON.stringify(gemini ? {output_image:{data:${JSON.stringify(image)},mime_type:'image/png'}} : {data:[{b64_json:${JSON.stringify(image)},media_type:'image/png'}]}), {status:200});
};
`);

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
function request(port, route, { method = 'GET', body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: route, method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}), ...headers } }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let json;
        try { json = JSON.parse(text); } catch {}
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.setTimeout(15000, () => req.destroy(new Error('Test request timeout')));
    req.on('error', reject);
    req.end(body);
  });
}
async function start(extra = {}) {
  const port = await freePort();
  const file = path.join(temp, 'usage-' + port + '.json');
  const log = path.join(temp, 'calls-' + port + '.log');
  const child = spawn(process.execPath, ['--import', pathToFileURL(fixture).href, 'server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, LOAD_DOTENV: '0', NODE_ENV: 'test', HOST: '127.0.0.1', PORT: String(port), AUTH_DISABLED: '1', SESSION_SECRET: 'test-only-session-secret-for-laisee-tests', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', AI_PROVIDER: 'openrouter', AI_MOCK: '0', AI_DISABLED: '0', AI_DISABLE_FILE: '', OPENROUTER_API_KEY: 'not-a-real-key', GEMINI_API_KEY: 'not-a-real-key', OPENROUTER_MODEL: 'bytedance-seed/seedream-5-0-lite', OPENROUTER_ASPECT_RATIO: '', OPENROUTER_IMAGE_API: '1', GEN_USAGE_FILE: file, TEST_CALL_LOG: log, DAILY_GEN_LIMIT: '100', ACCOUNT_DAILY_GEN_LIMIT: '20', IP_DAILY_GEN_LIMIT: '50', IP_GEN_LIMIT: '50', MAX_CONCURRENT_GENERATIONS: '3', AI_TIMEOUT_MS: '1000', TRUSTED_PROXY_IPS: '', PUBLIC_URL: 'http://127.0.0.1:' + port, ...extra },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.add(child);
  let output = '';
  child.stdout.on('data', (data) => { output += data; });
  child.stderr.on('data', (data) => { output += data; });
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error('Server exited: ' + output);
    try { if ((await request(port, '/api/health')).status === 200) return { child, port, file, log }; } catch {}
    await delay(50);
  }
  throw new Error('Server did not become ready: ' + output);
}
async function stop(child) {
  if (child.exitCode === null && child.signalCode === null) {
    child.kill();
    await new Promise((resolve) => child.once('exit', resolve));
  }
  children.delete(child);
}
const post = (port, body = payload, headers) => request(port, '/api/generate', { method: 'POST', body: JSON.stringify(body), headers });
const calls = (file) => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];

try {
  await assert.rejects(start({ OPENROUTER_ASPECT_RATIO: '2:3' }), /OPENROUTER_ASPECT_RATIO/, 'reject old wide configuration before any paid call');
  const a = await start({ DAILY_GEN_LIMIT: '1' });
  try {
    for (const route of ['/.env', '/.git/config', '/server.mjs', '/auth.mjs', '/package.json', '/assets/test-photo.jpg', '/assets/test-photo-real.jpg', '/scripts/smoke-auth.mjs', '/tmp/gen-usage.json', '/%2eenv', '/js/app.js:foo', '/assets/styles/unknown.jpg']) {
      assert.equal((await request(a.port, route)).status, 404, route + ' must not be public');
    }
    for (const route of ['/%', '/%00', '/..%2f.env', '/%5c..%5c.env', '//example.test/']) assert.equal((await request(a.port, route)).status, 400, route);
    const page = await request(a.port, '/');
    assert.equal(page.status, 200);
    assert.equal(page.headers['x-content-type-options'], 'nosniff');
    assert.ok(page.headers['content-security-policy']);
    assert.equal((await request(a.port, '/js/app.js?v=1')).status, 200);
    const head = await request(a.port, '/assets/styles/front-01.jpg', { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.text, '');
    const errorPage = await request(a.port, '/auth/google/callback?error=' + encodeURIComponent('<script>alert(1)</script>'));
    assert.equal(errorPage.status, 400);
    assert.match(errorPage.text, /&lt;script&gt;/);
    assert.doesNotMatch(errorPage.text, /<script>/);
    assert.equal((await request(a.port, '/auth/google')).status, 503);
    assert.equal((await request(a.port, '/api/auth/config')).json.eprintConfigured, false);
    for (const body of [null, [], {}, { prompt: 'arbitrary task' }, { ...payload, styleImage: payload.photos[0] }, { ...payload, photos: [] }, { ...payload, photos: [payload.photos[0], payload.photos[0], payload.photos[0]] }, { ...payload, category: 'kids' }, { ...payload, greeting: 'x'.repeat(31) }, { ...payload, greeting: '   ' }, { ...payload, photos: ['data:image/svg+xml;base64,PHN2Zz4='] }]) {
      assert.equal((await post(a.port, body)).status, 400, JSON.stringify(body).slice(0, 80));
    }
    assert.equal((await request(a.port, '/api/generate', { method: 'POST', body: '{' })).status, 400);
    assert.equal((await post(a.port, payload, { 'Content-Type': 'text/plain' })).status, 415);
    assert.equal((await post(a.port, payload, { Origin: 'https://attacker.example' })).status, 403);
    assert.equal((await post(a.port, payload, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
    assert.equal(calls(a.log).length, 0);
    const responses = await Promise.all(Array.from({ length: 10 }, (_, i) => post(a.port, { ...payload, photos: [payload.photos[0], payload.photos[0]] }, { 'X-Forwarded-For': '127.0.0.' + i, 'CF-Connecting-IP': '127.0.0.1' })));
    assert.equal(responses.filter((res) => res.status === 200).length, 1);
    assert.equal(responses.filter((res) => res.status === 429).length, 9);
    assert.equal(calls(a.log).length, 1);
    assert.equal(calls(a.log)[0].before, 1, 'reservation must be durable before provider call');
    assert.equal(calls(a.log)[0].refs, 3, 'template + every uploaded photo');
    assert.equal(calls(a.log)[0].ratio, '1:2', 'Seedream must be asked for the close native portrait ratio');
    assert.match(calls(a.log)[0].prompt, /恭喜發財/);
    const usage = (await request(a.port, '/api/usage')).json.usage;
    assert.equal(usage.remaining, 0);
    assert.equal(usage.available, false);
    assert.doesNotMatch(fs.readFileSync(a.file, 'utf8'), /dev-bypass|127\.0\.0\.1|image\/png/);
  } finally { await stop(a.child); }

  for (const [extra, endpoint] of [
    [{ OPENROUTER_MODEL: 'google/gemini-2.5-flash-image' }, '/images'],
    [{ OPENROUTER_MODEL: 'google/gemini-2.5-flash-image', OPENROUTER_IMAGE_API: '0' }, '/chat/completions'],
    [{ AI_PROVIDER: 'gemini' }, '/interactions'],
  ]) {
    const provider = await start(extra);
    try {
      assert.equal((await post(provider.port)).status, 200);
      const [call] = calls(provider.log);
      assert.ok(call.endpoint.endsWith(endpoint));
      assert.equal(call.ratio, '9:16', 'Gemini image/chat/Interactions all request the correct portrait ratio');
    } finally { await stop(provider.child); }
  }

  const ipLimited = await start({ IP_DAILY_GEN_LIMIT: '1' });
  try {
    assert.equal((await post(ipLimited.port, payload, { 'X-Forwarded-For': '192.0.2.1' })).status, 200);
    const spoofed = await post(ipLimited.port, payload, { 'X-Forwarded-For': '127.0.0.1', 'CF-Connecting-IP': '127.0.0.1' });
    assert.equal(spoofed.status, 429);
    assert.equal(spoofed.json.scope, 'ip');
    assert.equal(calls(ipLimited.log).length, 1);
    await assert.rejects(start({ GEN_USAGE_FILE: ipLimited.file }), /EEXIST/, 'a second process must fail to acquire the usage lock');
  } finally { await stop(ipLimited.child); }

  const fail = await start({ TEST_PROVIDER_FAIL: '1' });
  try {
    const result = await post(fail.port);
    assert.equal(result.status, 502);
    assert.doesNotMatch(result.text, /SECRET|diagnostic|detail/);
    assert.equal(calls(fail.log).length, 1, 'must not retry a possibly billable failure');
    assert.equal((await request(fail.port, '/api/usage')).json.usage.userUsed, 1);
  } finally { await stop(fail.child); }

  const timeout = await start({ TEST_PROVIDER_TIMEOUT: '1' });
  try {
    assert.equal((await post(timeout.port)).json.error, 'UPSTREAM_TIMEOUT');
    assert.equal((await request(timeout.port, '/api/usage')).json.usage.busy, false);
    assert.equal(calls(timeout.log).length, 1);
  } finally { await stop(timeout.child); }

  const bypassOff = await start({ AUTH_DISABLED: '0', AI_MOCK: '1' });
  try {
    assert.equal((await post(bypassOff.port)).status, 401);
    assert.equal((await request(bypassOff.port, '/api/usage')).status, 401);
  } finally { await stop(bypassOff.child); }

  const pauseFile = path.join(temp, 'ai-paused');
  const paused = await start({ AI_DISABLE_FILE: pauseFile });
  try {
    fs.writeFileSync(pauseFile, '');
    assert.equal((await post(paused.port)).json.error, 'AI_DISABLED');
    assert.equal((await request(paused.port, '/api/usage')).json.ai.mode, 'disabled');
    assert.equal(calls(paused.log).length, 0);
  } finally { await stop(paused.child); }

  // Store tests exercise distinct authenticated identities and restart durability directly.
  const options = { file: path.join(temp, 'store.json'), secret: 'test-secret', dailyLimit: 10, accountLimit: 2, ipDailyLimit: 2, ipLimit: 10, concurrency: 2 };
  const store = createUsageStore(options);
  assert.throws(() => createUsageStore(options), /EEXIST/, 'two server processes must not share the usage file');
  const first = store.reserve('account-a', 'ip-a');
  assert.throws(() => store.reserve('account-a', 'ip-a'), (error) => error.code === 'BUSY');
  const second = store.reserve('account-b', 'ip-b');
  assert.throws(() => store.reserve('account-c', 'ip-c'), (error) => error.code === 'BUSY');
  first(); second();
  store.reserve('account-a', 'ip-a')();
  assert.throws(() => store.reserve('account-a', 'ip-other'), (error) => error.scope === 'account');
  assert.throws(() => store.reserve('account-c', 'ip-a'), (error) => error.scope === 'ip');
  store.close();
  const restarted = createUsageStore(options);
  assert.equal(restarted.usage('account-a', 'ip-other').userRemaining, 0);
  restarted.close();
  fs.writeFileSync(options.file + '.lock', JSON.stringify({ pid: process.pid, hostname: os.hostname(), token: 'previous-process-with-same-pid' }));
  const reusedPid = createUsageStore(options);
  assert.equal(reusedPid.usage('account-a', 'ip-other').userRemaining, 0, 'same-PID restart must preserve counts');
  reusedPid.close();
  fs.writeFileSync(options.file + '.lock', JSON.stringify({ pid: process.pid, hostname: 'other-container', token: 'other-owner' }));
  assert.throws(() => createUsageStore(options), /another host\/container/, 'cross-container locks require operator inspection');
  assert.equal(clientIp({ socket: { remoteAddress: '::ffff:192.0.2.20' }, headers: { 'cf-connecting-ip': '127.0.0.1', 'x-forwarded-for': '127.0.0.1' } }), '192.0.2.20');
  assert.equal(clientIp({ socket: { remoteAddress: '::ffff:127.0.0.1' }, headers: { 'x-forwarded-for': 'attacker, 192.0.2.99' } }, ['127.0.0.1']), '192.0.2.99');
  const brokenPath = path.join(temp, 'broken.json');
  const broken = createUsageStore({ ...options, file: brokenPath });
  fs.mkdirSync(brokenPath + '.tmp');
  assert.throws(() => broken.reserve('account', 'ip'), (error) => error.code === 'USAGE_UNAVAILABLE');
  assert.equal(broken.usage('account', 'ip').available, false);
  broken.close();
  fs.writeFileSync(path.join(temp, 'corrupt.json'), '{bad');
  assert.throws(() => createUsageStore({ ...options, file: path.join(temp, 'corrupt.json') }));

  const prod = { NODE_ENV: 'production', PUBLIC_URL: 'https://laisee.example', SITE_OPERATOR: 'Test operator', SUPPORT_EMAIL: 'support@example.com', GOOGLE_CLIENT_ID: 'test-id', GOOGLE_CLIENT_SECRET: 'test-secret', GOOGLE_REDIRECT_URI: 'https://laisee.example/auth/google/callback', COOKIE_SECURE: '1' };
  await assert.rejects(start({ ...prod, AUTH_DISABLED: '1' }), /AUTH_DISABLED is forbidden/);
  await assert.rejects(start({ ...prod, AUTH_DISABLED: '0', COOKIE_SECURE: '0' }), /Secure cookies/);
  await assert.rejects(start({ ...prod, AUTH_DISABLED: '0', SESSION_SECRET: 'weak' }), /SESSION_SECRET/);
  const secure = await start({ ...prod, AUTH_DISABLED: '0' });
  try {
    const oauth = await request(secure.port, '/auth/google');
    assert.equal(oauth.status, 302);
    assert.match(oauth.headers['set-cookie'][0], /; Secure/);
    assert.equal((await request(secure.port, '/api/logout', { method: 'POST' })).status, 403);
    assert.equal((await request(secure.port, '/api/logout', { method: 'POST', headers: { Origin: prod.PUBLIC_URL } })).status, 200);
  } finally { await stop(secure.child); }
  console.log('smoke-security: passed (no provider network calls)');
} finally {
  await Promise.all([...children].map(stop));
  if (path.dirname(path.resolve(temp)) !== path.resolve(os.tmpdir()) || !path.basename(temp).startsWith('laisee-security-')) throw new Error('Unexpected cleanup path');
  fs.rmSync(temp, { recursive: true, force: true });
}
