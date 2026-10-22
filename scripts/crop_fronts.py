#!/usr/bin/env python3
"""Crop front panels from e-print die-cut style JPGs.

Each style-XX.jpg is a full flat (front+back+flaps on white).
We extract the rightmost tall front face for thumbnails / compositing.

Heuristic:
  1. Build a non-near-white mask and trim borders.
  2. Detect cyan/green die-cut fold lines; find the rightmost tall
     rectangle with aspect roughly 2:3–1:2 (front face between
     back|front and front|glue folds, and top/bottom flap folds).
  3. Because these 8 artboards share one die, if we get a confident
     hit on any style we reuse that box for all.
  4. Fallback: right 42% after trim, excluding a thin right glue flap.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STYLES = ROOT / "assets" / "styles"
MAX_EDGE = 1200
THUMB_H = 360
JPEG_Q = 85

# Known-good shared die on the 900×1019 e-print artboards (verified visually).
# Derived from clean cyan folds on style-07: V 408/817, H 241/927.
SHARED_DIE_FRONT = (409, 157, 816, 926)


def to_rgb(im: Image.Image) -> Image.Image:
    if im.mode == "RGB":
        return im
    return im.convert("RGB")


def near_white_mask(arr: np.ndarray, thr: int = 245) -> np.ndarray:
    return (arr[:, :, 0] > thr) & (arr[:, :, 1] > thr) & (arr[:, :, 2] > thr)


def trim_white(arr: np.ndarray):
    content = ~near_white_mask(arr)
    rows = np.where(content.any(axis=1))[0]
    cols = np.where(content.any(axis=0))[0]
    if len(rows) == 0 or len(cols) == 0:
        h, w = arr.shape[:2]
        return 0, 0, w - 1, h - 1
    return int(cols[0]), int(rows[0]), int(cols[-1]), int(rows[-1])


def dieline_mask(arr: np.ndarray) -> np.ndarray:
    r = arr[:, :, 0].astype(np.int16)
    g = arr[:, :, 1].astype(np.int16)
    b = arr[:, :, 2].astype(np.int16)
    cyan = (b > r + 50) & (b > 120) & (g > 40) & (r < 160)
    return cyan


def long_lines(mask: np.ndarray, axis: str, min_span_frac: float, min_count: int = 100):
    H, W = mask.shape
    out = []
    if axis == "v":
        for x in range(W):
            ys = np.where(mask[:, x])[0]
            if len(ys) < min_count:
                continue
            span = int(ys.max() - ys.min())
            if span < H * min_span_frac:
                continue
            out.append((x, len(ys), span))
    else:
        for y in range(H):
            xs = np.where(mask[y, :])[0]
            if len(xs) < min_count:
                continue
            span = int(xs.max() - xs.min())
            if span < W * min_span_frac:
                continue
            out.append((y, len(xs), span))
    merged = []
    for t in out:
        if merged and t[0] - merged[-1][0] < 14:
            if t[1] > merged[-1][1]:
                merged[-1] = t
        else:
            merged.append(t)
    return merged


def find_front_box(arr: np.ndarray):
    """Return (x0, y0, x1, y1, method)."""
    H, W = arr.shape[:2]
    tx0, ty0, tx1, ty1 = trim_white(arr)
    tw, th = tx1 - tx0 + 1, ty1 - ty0 + 1

    mask = dieline_mask(arr)
    vlines = [t[0] for t in long_lines(mask, "v", 0.45, 100)]
    hlines = [t[0] for t in long_lines(mask, "h", 0.30, 100)]
    v_inner = [x for x in vlines if tx0 + 60 < x < tx1 - 60]
    h_inner = [y for y in hlines if ty0 + 60 < y < ty1 - 60]

    cands = []
    if len(v_inner) >= 2 and len(h_inner) >= 2:
        vs = sorted(v_inner)
        hs = sorted(h_inner)
        for i in range(len(vs) - 1):
            for j in range(i + 1, len(vs)):
                x0, x1 = vs[i], vs[j]
                bw = x1 - x0
                if bw < 280 or bw > 520:
                    continue
                if x0 < tx0 + tw * 0.35:
                    continue  # must be the right (front) panel
                for a in range(len(hs) - 1):
                    for b in range(a + 1, len(hs)):
                        y0, y1 = hs[a], hs[b]
                        bh = y1 - y0
                        if bh < 480:
                            continue
                        aspect = bh / bw
                        if not (1.50 <= aspect <= 2.20):
                            continue
                        content = ~near_white_mask(arr)
                        fill = float(content[y0:y1, x0:x1].mean())
                        if fill < 0.85:
                            continue
                        cx = (x0 + x1) / 2
                        score = cx + bh * 0.4 + (1 - abs(aspect - 1.93)) * 400 + fill * 50
                        cands.append((score, x0, y0, x1, y1, aspect))

    if cands:
        cands.sort(reverse=True)
        _, x0, y0, x1, y1, _ = cands[0]
        return (x0 + 1, y0 + 1, x1 - 1, y1 - 1, "dieline")

    # Fallback: right 42% after trim, drop glue flap (~7%), crop flaps vertically
    glue = max(8, int(tw * 0.07))
    x1 = tx1 - glue
    fw = int(tw * 0.42)
    x0 = max(tx0 + int(tw * 0.35), x1 - fw)
    y0 = ty0 + int(th * 0.14)
    y1 = ty1 - int(th * 0.08)
    return (x0, y0, x1, y1, "fallback")


def resize_max_edge(im: Image.Image, max_edge: int) -> Image.Image:
    w, h = im.size
    m = max(w, h)
    if m <= max_edge:
        return im
    scale = max_edge / m
    return im.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)


def make_thumb(im: Image.Image, tall: int = THUMB_H) -> Image.Image:
    w, h = im.size
    scale = tall / h
    return im.resize((max(1, int(w * scale)), tall), Image.Resampling.LANCZOS)


def save_crop(im: Image.Image, box, idx: int, method: str):
    crop = im.crop(box)
    crop = resize_max_edge(crop, MAX_EDGE)
    front_path = STYLES / f"front-{idx:02d}.jpg"
    thumb_path = STYLES / f"front-{idx:02d}-thumb.jpg"
    crop.save(front_path, quality=JPEG_Q, optimize=True)
    make_thumb(crop).save(thumb_path, quality=JPEG_Q, optimize=True)
    return {
        "idx": idx,
        "method": method,
        "box": box,
        "front": str(front_path),
        "thumb": str(thumb_path),
        "size": crop.size,
    }


def main():
    STYLES.mkdir(parents=True, exist_ok=True)

    # Probe each artboard; collect confident dieline boxes
    probes = []
    for i in range(1, 9):
        im = to_rgb(Image.open(STYLES / f"style-{i:02d}.jpg"))
        arr = np.array(im)
        box = find_front_box(arr)
        probes.append((i, box, im))
        print(f"probe style-{i:02d}: method={box[4]} box={box[:4]}")

    dieline = [p for p in probes if p[1][4] == "dieline"]
    # Prefer a shared die when artboards match (they do for this set)
    if dieline:
        # Pick the dieline box whose aspect is closest to 6.75/3.5 and area largest
        def rank(p):
            x0, y0, x1, y1, _ = p[1]
            bw, bh = x1 - x0, y1 - y0
            aspect = bh / max(bw, 1)
            return (-abs(aspect - 1.928), -(bw * bh))

        dieline.sort(key=rank)
        shared = dieline[0][1][:4]
        method = f"shared-dieline-from-{dieline[0][0]:02d}"
        print(f"Using shared front box {shared} ({method})")
    else:
        shared = SHARED_DIE_FRONT
        method = "shared-hardcoded"
        print(f"No dieline hit — using hardcoded shared box {shared}")

    # Sanity: if shared aspect is wild, fall back to hardcoded
    bw, bh = shared[2] - shared[0], shared[3] - shared[1]
    aspect = bh / max(bw, 1)
    if not (1.50 <= aspect <= 2.20) or bw < 280:
        shared = SHARED_DIE_FRONT
        method = "shared-hardcoded-sanity"
        print(f"Sanity reject — using {shared}")

    results = []
    for i in range(1, 9):
        im = to_rgb(Image.open(STYLES / f"style-{i:02d}.jpg"))
        results.append(save_crop(im, shared, i, method))

    for r in results:
        print(
            f"style-{r['idx']:02d}: method={r['method']} box={r['box']} "
            f"out={r['size']} -> {os.path.basename(r['front'])} + thumb"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
