/**
 * Auth smoke — no real Google calls.
 * 1) Default: unauthenticated POST /api/generate → 401
 * 2) AUTH_DISABLED=1 child: generate not 401 (may be 503 AI)
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT_A = 18765;
const PORT_B = 18766;

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function request(port, method, urlPath, { body, headers } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: urlPath,
        method,
        headers: {
          ...(body
            ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
              }
            : {}),
          ...headers,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(text);
          } catch {
            /* ignore */
          }
          resolve({ status: res.statusCode, json, text, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function startServer(port, extraEnv = {}) {
  const child = spawn(process.execPath, ['server.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      AI_MOCK: '1',
      // Ensure gate on for test A; override below for B
      AUTH_DISABLED: '0',
      SESSION_SECRET: 'smoke-test-session-secret-not-real',
      GOOGLE_CLIENT_ID: '',
      GOOGLE_CLIENT_SECRET: '',
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return child;
}

async function waitReady(port, child, label) {
  for (let i = 0; i < 40; i++) {
    if (child.exitCode != null) {
      throw new Error(`${label} exited early code=${child.exitCode}`);
    }
    try {
      const h = await request(port, 'GET', '/api/health');
      if (h.status === 200 && h.json?.ok) return h;
    } catch {
      /* retry */
    }
    await wait(100);
  }
  throw new Error(`${label} not ready on :${port}`);
}

function stop(child) {
  return new Promise((resolve) => {
    if (child.exitCode != null) return resolve();
    child.once('exit', () => resolve());
    child.kill('SIGTERM');
    setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }, 2000);
  });
}

const failures = [];

async function main() {
  // --- A: login required ---
  const a = startServer(PORT_A, { AUTH_DISABLED: '0' });
  try {
    const health = await waitReady(PORT_A, a, 'server-A');
    if (health.json?.auth?.authDisabled) {
      failures.push('A: expected authDisabled=false');
    }
    const me = await request(PORT_A, 'GET', '/api/me');
    if (me.status !== 401) {
      failures.push(`A: /api/me expected 401 got ${me.status}`);
    }
    const gen = await request(PORT_A, 'POST', '/api/generate', {
      body: JSON.stringify({ prompt: 'smoke' }),
    });
    if (gen.status !== 401 || gen.json?.error !== 'UNAUTHORIZED') {
      failures.push(
        `A: /api/generate expected 401 UNAUTHORIZED got ${gen.status} ${gen.json?.error}`
      );
    }
    const cfg = await request(PORT_A, 'GET', '/api/auth/config');
    if (!cfg.json?.ok || cfg.json.googleConfigured !== false) {
      failures.push('A: /api/auth/config googleConfigured should be false');
    }
    const eprintCb = await request(PORT_A, 'POST', '/auth/eprint/callback');
    if (eprintCb.status !== 501) {
      failures.push(`A: eprint callback expected 501 got ${eprintCb.status}`);
    }
    console.log('OK A: unauthenticated generate→401, me→401, eprint callback→501');
  } finally {
    await stop(a);
  }

  // --- B: AUTH_DISABLED bypass ---
  const b = startServer(PORT_B, { AUTH_DISABLED: '1' });
  try {
    const health = await waitReady(PORT_B, b, 'server-B');
    if (!health.json?.auth?.authDisabled) {
      failures.push('B: expected authDisabled=true');
    }
    const me = await request(PORT_B, 'GET', '/api/me');
    if (me.status !== 200 || !me.json?.authenticated) {
      failures.push(`B: /api/me expected 200 authenticated got ${me.status}`);
    }
    const gen = await request(PORT_B, 'POST', '/api/generate', {
      body: JSON.stringify({ prompt: 'smoke' }),
    });
    if (gen.status === 401) {
      failures.push('B: /api/generate should not be 401 when AUTH_DISABLED=1');
    } else {
      // 503 AI_MOCK or 200 — both fine
      console.log(
        `OK B: AUTH_DISABLED generate→${gen.status} (${gen.json?.error || gen.json?.mode || 'ok'})`
      );
    }
  } finally {
    await stop(b);
  }

  if (failures.length) {
    console.error('FAIL:\n' + failures.map((f) => ' - ' + f).join('\n'));
    process.exit(1);
  }
  console.log('smoke-auth: all passed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
