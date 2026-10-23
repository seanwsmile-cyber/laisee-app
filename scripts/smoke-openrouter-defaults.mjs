/** Offline catalog/prompt smoke; never reads .env or calls an AI provider. */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { STYLES, getStylesByCategory, buildPacketPrompt } from '../js/styles.js';

const root = new URL('../', import.meta.url);
assert.equal(STYLES.length, 13);
assert.equal(new Set(STYLES.map((style) => style.id)).size, STYLES.length);
assert.equal(getStylesByCategory('pet').length, 8);
assert.equal(getStylesByCategory('kids').length, 5);

for (const style of STYLES) {
  for (const asset of [style.image, style.thumb]) {
    const assetUrl = new URL(asset, root);
    assetUrl.search = '';
    assert.ok(existsSync(fileURLToPath(assetUrl)), `${style.id}: missing ${asset}`);
  }
  const prompt = buildPacketPrompt({
    styleId: style.id,
    greeting: '恭喜發財',
    message: '新年快樂',
    tweak: 'Keep the two faces separate',
  });
  assert.match(prompt, style.category === 'kids' ? /KIDS & FAMILY/ : /PETS & ANIMALS/);
  assert.ok(prompt.includes('恭喜發財'));
  assert.ok(prompt.includes('新年快樂'));
  assert.ok(prompt.includes('Keep the two faces separate'));
  assert.ok(prompt.includes(style.scene), `${style.id}: missing selected scene`);
  assert.ok(prompt.includes(style.lettering), `${style.id}: missing lettering`);
  assert.match(prompt, /full-bleed/);
  assert.match(prompt, /NO WHITE BACKDROP/);
  assert.doesNotMatch(prompt, /\bundefined\b|\[object Object\]/);
}

console.log('ok: all 13 style assets and pet/kids prompts (offline, no secrets)');
