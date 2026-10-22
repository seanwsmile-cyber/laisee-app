/**
 * Headless Chromium walkthrough of all 6 steps.
 * Captures mobile + desktop shots; asserts no console errors.
 */
import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SHOTS = join(ROOT, 'shots');
const PORT = 8765;

mkdirSync(SHOTS, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.md': 'text/markdown',
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = decodeURIComponent((req.url || '/').split('?')[0]);
      if (path === '/api/me' || path === '/api/auth/config') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: true,
            authenticated: true,
            authDisabled: true,
            user: { id: 'e2e', name: 'E2E User', email: 'e2e@local' },
          })
        );
        return;
      }
      if (path === '/api/generate') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({
            ok: false,
            fallback: true,
            error: 'AI_MOCK',
            message: 'E2E canvas fallback',
          })
        );
        return;
      }
      if (path === '/') path = '/index.html';
      const file = join(ROOT, path);
      if (!file.startsWith(ROOT) || !existsSync(file)) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const body = readFileSync(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function shotBoth(page, name) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(SHOTS, `${name}-mobile.png`), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

async function main() {
  const { server, port } = await startServer();
  const consoleErrors = [];
  const pageErrors = [];

  let browser;
  for (const opts of [
    { headless: true },
    { headless: true, channel: 'chrome' },
    { headless: true, channel: 'msedge' },
  ]) {
    try {
      browser = await chromium.launch(opts);
      break;
    } catch {
      /* try next browser channel */
    }
  }
  if (!browser) {
    server.close();
    throw new Error('No Chromium/Chrome/Edge browser found for Playwright');
  }
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#btn-start');
  await page.evaluate(() => document.fonts && document.fonts.ready);

  // Step 1 -> 2
  await page.click('#btn-start');
  await page.waitForSelector('.screen[data-step="2"].active');

  // Step 2: scroll terms to bottom
  await page.evaluate(() => {
    const el = document.getElementById('terms-scroll');
    el.scrollTop = el.scrollHeight;
  });
  await page.waitForTimeout(150);
  await page.waitForFunction(() => !document.getElementById('btn-next').disabled);
  await page.click('#btn-next');
  await page.waitForSelector('.screen[data-step="3"].active');

  // Step 3: verify category tabs (Pet = 8 styles, Kids = 5 styles) and pick style
  await page.waitForFunction(() => document.querySelectorAll('.style-card').length === 8);
  await page.click('.category-tab[data-category="kids"]');
  await page.waitForFunction(() => document.querySelectorAll('.style-card').length === 5);
  await shotBoth(page, 'style-kids');
  await page.click('.category-tab[data-category="pet"]');
  await page.waitForFunction(() => document.querySelectorAll('.style-card').length === 8);
  await page.click('.style-card[data-style="style01"]');
  await page.waitForFunction(() => !document.getElementById('btn-next').disabled);
  await shotBoth(page, 'style');
  await page.click('#btn-next');
  await page.waitForSelector('.screen[data-step="4"].active');

  // Step 4: upload
  await page.setInputFiles('#file-input', join(ROOT, 'assets/test-photo.jpg'));
  await page.waitForFunction(() => document.querySelectorAll('.photo-thumb').length >= 1);
  await page.click('#btn-next');
  await page.waitForSelector('.screen[data-step="5"].active');

  // Step 5: greeting
  await shotBoth(page, 'greeting');
  await page.click('#btn-next'); // generate
  await page.waitForSelector('.screen[data-step="6"].active', { timeout: 30000 });
  await page.waitForFunction(() => {
    const cv = document.querySelector('#preview-stage canvas');
    return cv && cv.width > 100;
  });
  await page.waitForTimeout(600);
  // ensure canvas has non-empty pixels
  await page.waitForFunction(() => {
    const cv = document.querySelector('#preview-stage canvas');
    if (!cv) return false;
    const c = document.createElement('canvas');
    c.width = 8; c.height = 8;
    const x = c.getContext('2d');
    x.drawImage(cv, 0, 0, 8, 8);
    const d = x.getImageData(0, 0, 8, 8).data;
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i+1] + d[i+2] > 30) return true;
    return false;
  });
  await shotBoth(page, 'result');

  // Save final packet PNG from generatePacket
  const dataUrl = await page.evaluate(async () => {
    const st = window.__laisee.getState();
    // pull blob via regenerating with known state through exposed API
    const photos = [];
    // use the preview canvas as fallback if we can't get photos
    const stageCv = document.querySelector('#preview-stage canvas');
    if (stageCv) return stageCv.toDataURL('image/png');
    return null;
  });

  if (dataUrl) {
    const b64 = dataUrl.split(',')[1];
    writeFileSync(join(SHOTS, 'packet.png'), Buffer.from(b64, 'base64'));
  }

  // Also export a high-res packet via generatePacket with a loaded image
  await page.evaluate(async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = './assets/test-photo.jpg';
    });
    const { canvas } = await window.__laisee.generatePacket({
      style: 'style01',
      aspect: '2:3',
      photos: [img],
      greeting: '恭喜發財',
      message: '新春快樂',
      tweak: '',
    });
    window.__packetDataUrl = canvas.toDataURL('image/png');
  });
  const hiRes = await page.evaluate(() => window.__packetDataUrl);
  if (hiRes) {
    writeFileSync(join(SHOTS, 'packet.png'), Buffer.from(hiRes.split(',')[1], 'base64'));
  }

  await browser.close();
  server.close();

  const allErr = [...consoleErrors, ...pageErrors].filter((e) => {
    // ignore font/network noise from google fonts if any
    if (/fonts\.gstatic|fonts\.googleapis|net::ERR_/.test(e)) return false;
    return true;
  });

  console.log(JSON.stringify({
    ok: allErr.length === 0,
    consoleErrors: allErr,
    shots: ['style.png', 'greeting.png', 'result.png', 'packet.png',
            'style-mobile.png', 'greeting-mobile.png', 'result-mobile.png'],
  }, null, 2));

  if (allErr.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
