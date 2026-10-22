/**
 * Smoke: PRINT_SPEC bleed dims + edge-extend places trim centered at 1125×2100.
 * No browser, no network, no secrets.
 */
import assert from 'node:assert/strict';
import {
  PRINT_SPEC,
  getPrintBleedLayout,
  bleedExtendRgba,
} from '../js/generate.js';

assert.equal(PRINT_SPEC.widthPx, 1050);
assert.equal(PRINT_SPEC.heightPx, 2025);
assert.equal(PRINT_SPEC.bleedWidthPx, 1125);
assert.equal(PRINT_SPEC.bleedHeightPx, 2100);
assert.equal(PRINT_SPEC.bleedInsetPx, 38);
assert.equal(PRINT_SPEC.bleedIn, 0.125);
assert.equal(PRINT_SPEC.dpi, 300);

// Neat full-inch with bleed: 3.75×7 @ 300
assert.equal(Math.round(3.75 * 300), 1125);
assert.equal(Math.round(7 * 300), 2100);

const layout = getPrintBleedLayout();
assert.equal(layout.outW, 1125);
assert.equal(layout.outH, 2100);
assert.equal(layout.trimW, 1050);
assert.equal(layout.trimH, 2025);
assert.equal(layout.offsetX + layout.trimW + layout.padRight, 1125);
assert.equal(layout.offsetY + layout.trimH + layout.padBottom, 2100);
assert.ok(layout.padLeft >= 37 && layout.padLeft <= 38);
assert.ok(layout.padRight >= 37 && layout.padRight <= 38);
assert.ok(layout.padTop >= 37 && layout.padTop <= 38);
assert.ok(layout.padBottom >= 37 && layout.padBottom <= 38);

// Fake trim: left edge pure red, right edge pure blue, interior green marker
const tw = 1050;
const th = 2025;
const src = new Uint8ClampedArray(tw * th * 4);
for (let y = 0; y < th; y++) {
  for (let x = 0; x < tw; x++) {
    const i = (y * tw + x) * 4;
    if (x === 0) {
      src[i] = 200; src[i + 1] = 20; src[i + 2] = 30; src[i + 3] = 255;
    } else if (x === tw - 1) {
      src[i] = 10; src[i + 1] = 40; src[i + 2] = 220; src[i + 3] = 255;
    } else if (y === 0) {
      src[i] = 240; src[i + 1] = 200; src[i + 2] = 50; src[i + 3] = 255;
    } else if (y === th - 1) {
      src[i] = 80; src[i + 1] = 10; src[i + 2] = 10; src[i + 3] = 255;
    } else {
      src[i] = 0; src[i + 1] = 180; src[i + 2] = 0; src[i + 3] = 255;
    }
  }
}

const out = bleedExtendRgba(src, tw, th);
assert.equal(out.width, 1125);
assert.equal(out.height, 2100);
assert.equal(out.data.length, 1125 * 2100 * 4);

const { offsetX: ox, offsetY: oy } = out;
const px = (x, y) => {
  const i = (y * out.width + x) * 4;
  return [out.data[i], out.data[i + 1], out.data[i + 2], out.data[i + 3]];
};

// Bleed left of trim should equal leftmost trim column (red)
assert.deepEqual(px(0, oy + 100), [200, 20, 30, 255]);
assert.deepEqual(px(ox - 1, oy + 100), [200, 20, 30, 255]);

// Bleed right of trim should equal rightmost trim column (blue)
assert.deepEqual(px(1124, oy + 100), [10, 40, 220, 255]);
assert.deepEqual(px(ox + tw, oy + 100), [10, 40, 220, 255]);

// Top / bottom bleed from edge rows
assert.deepEqual(px(ox + 50, 0), [240, 200, 50, 255]);
assert.deepEqual(px(ox + 50, 2099), [80, 10, 10, 255]);

// Interior of trim region unchanged (green)
assert.deepEqual(px(ox + 100, oy + 100), [0, 180, 0, 255]);

// Corners of full canvas come from corner edge pixels (clamp)
assert.deepEqual(px(0, 0), [200, 20, 30, 255]); // top-left → left edge of top? actually y-oy<0 → sy=0, x-ox<0 → sx=0 → left-top = red (x===0 wins in our paint order for (0,0))
assert.deepEqual(px(1124, 2099), [10, 40, 220, 255]);

console.log('ok', {
  bleed: `${out.width}×${out.height}`,
  trim: `${tw}×${th}`,
  offset: `${ox},${oy}`,
  pads: {
    L: layout.padLeft,
    R: layout.padRight,
    T: layout.padTop,
    B: layout.padBottom,
  },
});
