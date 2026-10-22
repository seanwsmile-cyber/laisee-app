/**
 * Smoke: default OpenRouter model id is usable (no network, no secrets).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const src = fs.readFileSync(path.join(root, 'server.mjs'), 'utf8');

const m = /OPENROUTER_MODEL\s*=\s*process\.env\.OPENROUTER_MODEL\s*\|\|\s*'([^']+)'/.exec(
  src
);
assert.ok(m, 'OPENROUTER_MODEL default missing in server.mjs');
const model = m[1];
assert.notEqual(
  model,
  'google/gemini-2.5-flash-image-preview',
  'preview slug must not be the default'
);
assert.match(
  model,
  /^google\/gemini-.+-image/,
  `unexpected default model: ${model}`
);
assert.match(src, /api\/v1\/images/, 'Image API path missing');
assert.match(src, /input_references/, 'input_references support missing');
assert.match(src, /OPENROUTER_ASPECT_RATIO/, 'aspect ratio env missing');

const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
assert.match(
  example,
  /OPENROUTER_MODEL=google\/gemini-2\.5-flash-image\b/,
  '.env.example still has wrong model'
);
assert.match(
  example,
  /bytedance-seed\/seedream-5-0-lite/,
  '.env.example should mention seedream-5-0-lite'
);

assert.match(src, /styleImage/, 'styleImage support missing in server.mjs');
assert.match(src, /buildOrderedImageRefs/, 'buildOrderedImageRefs helper missing');
assert.match(
  src,
  /buildOrderedImageRefs\(\s*\{\s*styleImage,\s*photos/,
  'ordered refs must pass styleImage + photos'
);

const stylesSrc = fs.readFileSync(path.join(root, 'js/styles.js'), 'utf8');
assert.match(
  stylesSrc,
  /Image 1 = STYLE TEMPLATE \(visual master\)/,
  'dual-ref style template line missing'
);
assert.match(
  stylesSrc,
  /STYLE-LOCKED CHARACTER REPLACEMENT/,
  'style-locked replace missing'
);
assert.match(
  stylesSrc,
  /HARD BACKGROUND REQUIREMENT: NO WHITE BACKDROP/,
  'hard no-white-backdrop missing'
);
assert.match(
  stylesSrc,
  /REPLACE any baked-in sample greeting/,
  'greeting replace instruction missing'
);
assert.match(stylesSrc, /scene:/, 'style scene profiles missing');
assert.match(stylesSrc, /lettering:/, 'style lettering profiles missing');
assert.match(stylesSrc, /avoid:/, 'style avoid profiles missing');
assert.match(stylesSrc, /profileKey: 'horse'/, 'style01 horse profile missing');
assert.match(stylesSrc, /profileKey: 'sample_024'/, 'style08 sample_024 missing');
// Positive instructions must not force template dog anatomy onto user photos.
assert.doesNotMatch(
  stylesSrc,
  /REPLACE only the main character\/subject \(the costume dog/,
  'old dog-imposed replace wording must be gone'
);
assert.match(
  stylesSrc,
  /front-01\.jpg/,
  'style01 must use front-01'
);
assert.match(stylesSrc, /pack-04\.jpg/, 'style04 must use pack-04');
assert.match(stylesSrc, /pack-09\.jpg/, 'style09 must use pack-09');

const genSrc = fs.readFileSync(path.join(root, 'js/generate.js'), 'utf8');
assert.match(genSrc, /body\.styleImage\s*=\s*styleImage|styleImage/, 'frontend must send styleImage');
assert.match(genSrc, /STYLE_IMAGES\[style\]/, 'frontend must load style template');

// Runtime: buildPacketPrompt assembles worker-like prompt
const { pathToFileURL } = await import('node:url');
const { buildPacketPrompt, STYLES, PET_STYLES, KIDS_STYLES } = await import(pathToFileURL(path.join(root, 'js/styles.js')).href);
assert.equal(STYLES.length, 10);
assert.equal(PET_STYLES.length, 8);
assert.equal(KIDS_STYLES.length, 2);
const p = buildPacketPrompt({ styleId: 'style01', category: 'pet', greeting: '恭喜發財' });
assert.match(p, /full-bleed/);
assert.match(p, /NO WHITE BACKDROP/);
assert.match(p, /STYLE-LOCKED CHARACTER REPLACEMENT/);
assert.match(p, /PETS & ANIMALS MODE/);
assert.match(p, /恭喜發財/);
assert.match(p, /SCENE, PALETTE AND MATERIAL/);
assert.match(p, /SUBJECT INTEGRATION/);
assert.match(p, /STYLE-SPECIFIC DEFECTS TO AVOID/);
assert.match(p, /LETTERING ART DIRECTION/);
assert.match(p, /lion-dance headdress/);
assert.match(p, /Do not infer species from the style name/);

const pKids = buildPacketPrompt({ styleId: 'style09', category: 'kids', greeting: '快高長大' });
assert.match(pKids, /KIDS & FAMILY CHIBI MODE/);
assert.match(pKids, /快高長大/);

const env = fs.readFileSync(path.join(root, '.env'), 'utf8');
if (/OPENROUTER_MODEL=/.test(env)) {
  assert.match(
    env,
    /OPENROUTER_MODEL=bytedance-seed\/seedream-5-0-lite/,
    '.env live model should be seedream-5-0-lite'
  );
}

console.log('ok', { defaultModel: model, styles: STYLES.map((s) => s.id).join(',') });
