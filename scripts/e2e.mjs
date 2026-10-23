/** Offline browser acceptance: no real login, AI provider, .env, or personal photos. */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SHOTS = join(ROOT, 'shots');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

async function startServer() {
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    // Test server serves only public files; APIs are mocked in the browser below.
    const publicFile = /^\/(?:index\.html|privacy\.html|help\.html|favicon\.(?:ico|png|svg))$/.test(pathname)
      || /^\/(?:js|css|assets\/styles)\/[a-zA-Z0-9_./-]+$/.test(pathname);
    if (pathname !== '/' && !publicFile) { res.writeHead(404).end(); return; }
    const file = join(ROOT, pathname === '/' ? 'index.html' : pathname.slice(1));
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function launchBrowser() {
  const channels = process.env.E2E_BROWSER_CHANNEL ? [process.env.E2E_BROWSER_CHANNEL] : ['chrome', 'msedge', undefined];
  const errors = [];
  for (const channel of channels) {
    try { return await chromium.launch({ headless: true, ...(channel ? { channel } : {}) }); }
    catch (error) { errors.push(`${channel || 'chromium'}: ${error.message.split('\n')[0]}`); }
  }
  throw new Error(`Browser launch failed; check sandbox permissions and Chrome/Edge installation. ${errors.join('; ')}`);
}

async function walkthrough(browser, origin, viewport, name) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  const resourceErrors = [];
  const requests = [];
  let authenticated = false;
  let generation = 'success';
  let remaining = 5;
  let fixture;
  let wrongShapeFixture;
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('response', (res) => {
    if (res.url().startsWith(origin) && !res.url().includes('/api/') && res.status() >= 400) resourceErrors.push(`${res.status()} ${res.url()}`);
  });
  await context.addInitScript(() => {
    window.__shares = [];
    window.__canShareFiles = true;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => window.__canShareFiles });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data) => {
      window.__shares.push({ url: data.url, files: data.files?.map((file) => ({ name: file.name, type: file.type })) });
    } });
  });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    // Keep the test entirely offline, including web fonts.
    if (url.origin !== origin) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
    const send = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/me') return send({ ok: true, authenticated, googleConfigured: true, user: authenticated ? { id: 'e2e', name: 'Browser Test' } : null });
    if (url.pathname === '/api/auth/config') return send({ ok: true, googleConfigured: true, authDisabled: false });
    if (url.pathname === '/api/logout') return send({ ok: false, error: 'UNAVAILABLE' }, 503);
    if (url.pathname === '/api/usage') return authenticated
      ? send({ ok: true, ai: { ready: true, mode: 'ai', provider: 'test' }, usage: { remaining: 100, userRemaining: remaining, available: remaining > 0, busy: false, maxPhotos: 2 } })
      : send({ ok: false, error: 'UNAUTHORIZED' }, 401);
    if (url.pathname === '/api/generate') {
      requests.push(route.request().postDataJSON());
      if (generation === 'unauthorized') {
        authenticated = false;
        return send({ ok: false, error: 'UNAUTHORIZED', fallback: false }, 401);
      }
      remaining = Math.max(0, remaining - 1);
      if (generation === 'failure') return send({ ok: false, error: 'UPSTREAM_TIMEOUT', fallback: true }, 503);
      return send({ ok: true, mode: 'ai', provider: 'test', model: 'offline-fixture', dataUrl: generation === 'wrong-shape' ? wrongShapeFixture : fixture });
    }
    return route.continue();
  });
  const shot = (suffix) => page.screenshot({ path: join(SHOTS, `${name}-${suffix}.png`), fullPage: true, animations: 'disabled' });
  const step = (number) => page.locator(`.screen[data-step="${number}"].active`).waitFor({ state: 'visible' });
  const next = async () => { await page.locator('#btn-next:enabled').waitFor(); await page.click('#btn-next'); };
  const ready = () => page.waitForFunction(() => !document.getElementById('btn-regenerate').disabled);
  const checkStepEntry = (number) => page.waitForFunction((n) => {
    const heading = document.querySelector(`.screen[data-step="${n}"] h1, .screen[data-step="${n}"] h2`);
    return document.activeElement === heading && document.querySelector('.screens').scrollTop <= 1;
  }, number);
  const openDetails = async (id) => {
    if (!await page.locator(`#${id}`).evaluate((el) => el.open)) await page.click(`#${id} > summary`);
  };
  const checkLayout = async (selectors) => {
    for (const selector of selectors) {
      const el = page.locator(selector);
      await el.scrollIntoViewIfNeeded();
      const box = await el.boundingBox();
      assert.ok(box && box.width > 0 && box.x >= -1 && box.x + box.width <= viewport.width + 1, `${selector} fits ${name} width`);
      assert.ok(await el.evaluate((node) => node.scrollWidth <= node.clientWidth + 1), `${selector} label is not clipped`);
    }
  };
  try {
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.locator('#btn-login-google:enabled').waitFor();
    assert.equal(await page.locator('#btn-login-eprint').count(), 0, 'unfinished login option is hidden');
    await checkLayout(['#btn-login-google', '#btn-auth-retry']);
    await shot('login-zh');
    await page.click('#auth-gate .lang-toggle button[data-lang="en"]');
    assert.match(await page.locator('#btn-login-google').textContent(), /Google/);
    await checkLayout(['#btn-login-google', '#btn-auth-retry']);
    await shot('login-en');
    await page.click('#auth-gate .lang-toggle button[data-lang="zh-Hant"]');
    for (const path of ['privacy.html', 'help.html']) {
      const link = page.locator(`#auth-gate a[href="/${path}"]`);
      assert.ok(await link.isVisible(), `${path} accessible before login`);
      const popupPromise = context.waitForEvent('page');
      await link.click();
      const popup = await popupPromise;
      await popup.waitForLoadState('domcontentloaded');
      assert.ok((await popup.locator('h1').textContent()).trim());
      await popup.close();
    }
    authenticated = true;
    await page.click('#btn-auth-retry');
    await page.locator('#btn-start').waitFor({ state: 'visible' });

    // Native 1:2 card: only a small amount of top/bottom background should be cropped.
    const fixtures = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 300; canvas.height = 600;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 300, 600);
      ctx.fillStyle = '#00ff00'; ctx.fillRect(0, 0, 300, 25); ctx.fillRect(0, 575, 300, 25);
      ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 25, 25, 550);
      ctx.fillStyle = '#0000ff'; ctx.fillRect(275, 25, 25, 550);
      // Edge detail must be cropped away, never stretched into stripes or blurred padding.
      for (let x = 0; x < 300; x += 5) {
        ctx.fillStyle = x % 10 ? '#ffffff' : '#000000';
        ctx.fillRect(x, 0, 5, 1); ctx.fillRect(x, 599, 5, 1);
      }
      const wrong = document.createElement('canvas');
      wrong.width = 300; wrong.height = 450;
      wrong.getContext('2d').drawImage(canvas, 0, 0, 300, 450);
      return { valid: canvas.toDataURL('image/png'), wrong: wrong.toDataURL('image/png') };
    });
    fixture = fixtures.valid;
    wrongShapeFixture = fixtures.wrong;
    const photo = { name: 'color-card.png', mimeType: 'image/png', buffer: Buffer.from(fixture.split(',')[1], 'base64') };
    await page.click('#btn-start');
    await step(2);
    if (await page.locator('#terms-scroll').evaluate((el) => el.scrollHeight > el.clientHeight + 8)) {
      assert.ok(await page.locator('#btn-next').isDisabled(), 'terms require reading to the bottom before agreement');
    }
    await page.locator('#terms-scroll').evaluate((el) => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
    await next();
    await step(3);
    assert.equal(await page.locator('.style-card').count(), 8);
    await page.click('.category-tab[data-category="kids"]');
    assert.equal(await page.locator('.style-card').count(), 5);
    await page.screenshot({ path: join(SHOTS, `${name}-kids-styles.png`), fullPage: true });
    await page.click('.category-tab[data-category="pet"]');
    await page.click('.style-card[data-style="style01"]');
    assert.match(await page.locator('#btn-next').textContent(), /上載/);
    await shot('styles');
    await page.locator('.screens').evaluate((el) => { el.scrollTop = el.scrollHeight; });
    assert.ok(await page.locator('.screens').evaluate((el) => el.scrollTop > 0), 'style list was scrolled before changing steps');
    await next();
    await step(4);
    await checkStepEntry(4);
    await page.setInputFiles('#file-input', { name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });
    await page.locator('#upload-errors').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.photo-thumb').count(), 0);
    await page.setInputFiles('#file-input', [photo, { ...photo, name: 'second.png' }, { ...photo, name: 'third.png' }]);
    await page.waitForFunction(() => document.querySelectorAll('.photo-thumb').length === 2);
    assert.match(await page.locator('#upload-count').textContent(), /2\s*\/\s*2/);
    assert.ok(await page.locator('#upload-errors').isVisible(), 'extra photo produces durable explanation');
    assert.match(await page.locator('#btn-next').textContent(), /賀詞/);
    await shot('upload');
    await next();
    await step(5);
    await page.click('.greeting-chip[data-gid="custom"]');
    assert.ok(await page.locator('#btn-next').isDisabled(), 'empty custom greeting prevents AI generation');
    assert.ok(await page.locator('#btn-local').isDisabled(), 'empty custom greeting prevents local composition');
    await page.fill('#custom-greeting', '新年快樂');
    await page.fill('#message-input', 'E2E');
    assert.ok(await page.locator('#btn-local').isEnabled());
    await next();
    await step(6);
    await ready();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].photos.length, 2, 'both accepted photos reach the proxy');
    assert.equal(requests[0].greeting, '新年快樂');
    assert.equal(requests[0].message, 'E2E');
    assert.ok(!('prompt' in requests[0]), 'server owns the AI prompt');
    assert.match(await page.locator('#result-mode').textContent(), /AI/);
    assert.match(await page.locator('#usage-status').textContent(), /4/);
    assert.equal(await page.locator('#btn-view-front').getAttribute('aria-pressed'), 'true');
    const pixels = await page.locator('#preview-stage canvas').evaluate((canvas) => {
      const ctx = canvas.getContext('2d');
      return { width: canvas.width, height: canvas.height,
        top: [...ctx.getImageData(canvas.width / 2, 5, 1, 1).data],
        bottom: [...ctx.getImageData(canvas.width / 2, canvas.height - 6, 1, 1).data],
        cornerAlpha: [[0, 0], [canvas.width - 1, 0], [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]]
          .map(([x, y]) => ctx.getImageData(x, y, 1, 1).data[3]),
        left: [...ctx.getImageData(5, canvas.height / 2, 1, 1).data],
        right: [...ctx.getImageData(canvas.width - 6, canvas.height / 2, 1, 1).data] };
    });
    assert.deepEqual([pixels.width, pixels.height], [1050, 2025]);
    assert.deepEqual(pixels.left, [255, 0, 0, 255], 'AI artwork left edge is retained');
    assert.deepEqual(pixels.right, [0, 0, 255, 255], 'AI artwork right edge is retained');
    assert.deepEqual(pixels.top, [0, 255, 0, 255], 'top is real image content with no added padding');
    assert.deepEqual(pixels.bottom, [0, 255, 0, 255], 'bottom is real image content with no added padding');
    assert.deepEqual(pixels.cornerAlpha, [255, 255, 255, 255], 'full-bleed image is opaque to all four corners');
    assert.ok(await page.locator('#btn-download-trim').isHidden());
    assert.ok(await page.locator('#btn-regenerate').isHidden());
    await shot('result');
    const beforeRetry = await page.locator('#preview-stage canvas').evaluate((canvas) => canvas.toDataURL());

    assert.match(await page.locator('#btn-download').textContent(), /下載/);
    assert.match(await page.locator('#btn-share').textContent(), /分享/);
    await checkLayout(['#btn-download', '#btn-share', '#more-downloads > summary', '#edit-design > summary']);
    await page.locator('#btn-download').scrollIntoViewIfNeeded();
    await shot('result-actions');
    await page.click('#app .lang-toggle button[data-lang="en"]');
    assert.match(await page.locator('#btn-download').textContent(), /download/i);
    assert.match(await page.locator('#btn-share').textContent(), /share/i);
    assert.match(await page.locator('#more-downloads > summary').textContent(), /download/i);
    assert.match(await page.locator('#edit-design > summary').textContent(), /edit/i);
    await checkLayout(['#btn-download', '#btn-share', '#more-downloads > summary', '#edit-design > summary']);
    await page.locator('#btn-download').scrollIntoViewIfNeeded();
    await shot('result-en');
    await page.click('#app .lang-toggle button[data-lang="zh-Hant"]');

    const downloadPromise = page.waitForEvent('download');
    await page.click('#btn-download');
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /-bleed\.png$/);
    const output = join(SHOTS, `${name}-bleed.png`);
    await download.saveAs(output);
    const png = await readFile(output);
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1125, 2100]);

    await page.click('#btn-share');
    await page.waitForFunction(() => window.__shares.length === 1);
    const share = await page.evaluate(() => window.__shares[0]);
    assert.equal(share.files[0].type, 'image/png');
    assert.equal(share.url, undefined, 'image share does not substitute a homepage URL');
    await page.evaluate(() => { window.__canShareFiles = false; });
    await page.click('#btn-share');
    await page.locator('#app-toast.show').waitFor();
    assert.equal(await page.evaluate(() => window.__shares.length), 1);
    await page.locator('#app-toast.show').waitFor({ state: 'hidden' });
    await openDetails('more-downloads');
    assert.ok(await page.locator('#btn-share-site').isVisible(), 'website sharing is a distinct action');
    assert.ok(await page.locator('#btn-download-trim').isVisible());
    assert.ok(await page.locator('#btn-download-diecut').isVisible());
    await page.locator('#btn-share-site').scrollIntoViewIfNeeded();
    await shot('more-downloads');
    await page.click('#more-downloads > summary');

    await page.click('#btn-logout');
    await page.locator('#restart-dialog').waitFor({ state: 'visible' });
    await page.click('#btn-confirm-restart');
    await page.locator('#session-notice').waitFor({ state: 'visible' });
    await step(6);
    assert.equal(await page.locator('#preview-stage canvas').evaluate((canvas) => canvas.toDataURL()), beforeRetry, 'failed logout keeps the draft and artwork');
    assert.equal(await page.locator('.photo-thumb').count(), 2);

    generation = 'failure';
    await openDetails('edit-design');
    await page.locator('#btn-edit-greeting').scrollIntoViewIfNeeded();
    await shot('edit-design');
    await page.locator('#btn-local').scrollIntoViewIfNeeded();
    await shot('generation-options');
    await page.click('#btn-regenerate');
    await page.locator('#generation-notice').waitFor({ state: 'visible' });
    await ready();
    assert.equal(await page.locator('#preview-stage canvas').evaluate((canvas) => canvas.toDataURL()), beforeRetry, 'failed retry preserves previous artwork');
    assert.match(await page.locator('#result-mode').textContent(), /AI/);
    await shot('failed-retry');

    generation = 'wrong-shape';
    await page.click('#btn-regenerate');
    await ready();
    assert.match(await page.locator('#generation-notice').textContent(), /比例不符/);
    assert.equal(await page.locator('#preview-stage canvas').evaluate((canvas) => canvas.toDataURL()), beforeRetry, 'wrong 2:3 result is rejected and previous artwork remains');
    await shot('wrong-shape');

    generation = 'unauthorized';
    await page.click('#btn-regenerate');
    await page.locator('#btn-relogin').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#btn-relogin').getAttribute('target'), '_blank');
    assert.equal(await page.locator('#preview-stage canvas').evaluate((canvas) => canvas.toDataURL()), beforeRetry);
    authenticated = true;
    await openDetails('edit-design');
    await page.click('#btn-refresh-usage');
    await ready();
    assert.ok(await page.locator('#btn-relogin').isHidden());

    await page.click('#btn-edit-greeting');
    await step(5);
    await checkStepEntry(5);
    assert.equal(await page.inputValue('#custom-greeting'), '新年快樂');
    assert.equal(await page.inputValue('#message-input'), 'E2E');
    await page.fill('#custom-greeting', '身體健康');
    await page.click('#btn-return-result');
    await step(6);
    assert.equal(await page.locator('#preview-stage canvas').evaluate((canvas) => canvas.toDataURL()), beforeRetry);
    assert.match(await page.locator('#result-mode').textContent(), /上一張|previous/i, 'edited settings are not presented as already applied');
    await openDetails('edit-design');
    await page.click('#btn-edit-photos');
    await step(4);
    assert.equal(await page.locator('.photo-thumb').count(), 2);
    await next();
    await step(5);
    await page.locator('#btn-next:enabled').waitFor();
    const requestCount = requests.length;
    await page.click('#btn-local');
    await step(6);
    await ready();
    assert.equal(requests.length, requestCount, 'local composition never calls the AI proxy');
    assert.match(await page.locator('#result-mode').textContent(), /原相|original/i);
    assert.doesNotMatch(await page.locator('#result-mode').textContent(), /上一張|previous/i, 'new composition applies the edited settings');
    await shot('local-result');

    remaining = 0;
    await openDetails('edit-design');
    await page.click('#btn-refresh-usage');
    await page.waitForFunction(() => document.getElementById('btn-regenerate').disabled);
    assert.ok(await page.locator('#btn-local').isEnabled(), 'local tool still works when quota is used');
    assert.ok(await page.locator('#btn-download').isEnabled(), 'quota does not prevent downloading previous result');

    // Restart is destructive only after confirmation; cancel keeps the last result.
    const beforeCancel = await page.locator('#preview-stage canvas').evaluate((canvas) => canvas.toDataURL());
    await page.click('#btn-restart');
    await page.locator('#restart-dialog').waitFor({ state: 'visible' });
    await checkLayout(['#btn-confirm-restart', '#btn-cancel-restart']);
    await shot('restart-confirm');
    await page.click('#btn-cancel-restart');
    await page.locator('#restart-dialog').waitFor({ state: 'hidden' });
    await step(6);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'btn-restart', 'cancel returns keyboard focus to restart');
    assert.equal(await page.locator('#preview-stage canvas').evaluate((canvas) => canvas.toDataURL()), beforeCancel);
    assert.equal(await page.locator('.photo-thumb').count(), 2, 'cancel keeps both uploaded photos');
    await page.click('#btn-restart');
    await page.click('#btn-confirm-restart');
    await step(1);
    await checkStepEntry(1);

    // A child-photo flow must require guardian consent before continuing.
    await page.click('#mode-card-kids');
    await page.click('#btn-start');
    await page.locator('#terms-scroll').evaluate((el) => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
    await next();
    await page.click('.style-card[data-style="style09"]');
    await next();
    assert.equal(await page.locator('.photo-thumb').count(), 0, 'confirmed restart clears previous photos');
    await page.setInputFiles('#file-input', photo);
    await page.waitForFunction(() => document.querySelectorAll('.photo-thumb').length === 1);
    assert.ok(await page.locator('#btn-next').isDisabled());
    await page.check('#guardian-consent');
    await next();
    await step(5);
    await page.click('#btn-local');
    await step(6);
    assert.match(await page.locator('#result-mode').textContent(), /原相|original/i);
    assert.equal(requests.length, requestCount);
    assert.deepEqual(pageErrors, [], 'no uncaught browser errors');
    assert.deepEqual(resourceErrors, [], 'all public assets/pages load');
    console.log(`ok: ${name} ${viewport.width}x${viewport.height}, bilingual layout, grouped actions, restart confirmation, two photos, AI/aspect-fit/download, wrong-shape preservation, retry/session preservation, explicit local, quota, consent`);
  } catch (error) {
    await shot('failure').catch(() => {});
    throw error;
  } finally {
    await context.close();
  }
}

await mkdir(SHOTS, { recursive: true });
const { server, origin } = await startServer();
let browser;
try {
  browser = await launchBrowser();
  await walkthrough(browser, origin, { width: 1280, height: 800 }, 'desktop');
  await walkthrough(browser, origin, { width: 390, height: 844 }, 'mobile');
  console.log(`Screenshots and PNG exports: ${SHOTS}`);
} finally {
  if (browser) await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
