// Object detection for camera capture (PatchCapture / ProductCapture).
// Background = everything reachable from the frame's border via small color steps
// (region growing). This handles uneven lighting/gradients (gradual steps are
// absorbed), dark-on-white AND white-on-dark objects, multi-colored backgrounds
// (e.g. black letterbox bars + white surface), and soft shadows (smooth ramps get
// absorbed while sharp object boundaries stop the fill).

export interface ObjectDetection {
  /** Bounding box of the largest connected object (input pixel coords, inclusive), or null when no usable object was found. */
  bbox: { minX: number; minY: number; maxX: number; maxY: number } | null;
  /** 1 = border-connected background pixel, 0 = foreground (same dimensions as input). */
  background: Uint8Array;
  /** Why bbox is null: 'empty' = nothing stood out from the background; 'edge-reject' = only frame-filling/edge-hugging regions found. */
  reason: 'empty' | 'edge-reject' | null;
}

/**
 * Find the dominant object in a frame.
 * @param rgba   RGBA pixel data (e.g. from getImageData), length w*h*4
 * @param margin Per-step color tolerance: a neighbor is absorbed into the background
 *               when every channel differs by at most this much
 * @returns Detection result; `bbox` is null when no usable object is found (nothing but
 *          background, object fills the frame, or it touches 3+ edges) — see `reason`.
 */
export function analyzeFrame(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  margin: number
): ObjectDetection {
  const total = w * h;
  const isBg = new Uint8Array(total);
  const stack = new Int32Array(total);
  let sp = 0;

  const push = (p: number) => {
    if (!isBg[p]) {
      isBg[p] = 1;
      stack[sp++] = p;
    }
  };

  // Seed the fill from every border pixel (background is assumed border-connected)
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }

  // Region growing: absorb a neighbor when its color is within `margin` of the
  // current pixel on every channel (per-step comparison absorbs smooth gradients)
  while (sp > 0) {
    const p = stack[--sp];
    const x = p % w;
    const y = (p / w) | 0;
    const pi = p * 4;
    const pr = rgba[pi], pg = rgba[pi + 1], pb = rgba[pi + 2];

    const tryAbsorb = (n: number) => {
      if (isBg[n]) return;
      const ni = n * 4;
      if (
        Math.abs(rgba[ni] - pr) <= margin &&
        Math.abs(rgba[ni + 1] - pg) <= margin &&
        Math.abs(rgba[ni + 2] - pb) <= margin
      ) {
        isBg[n] = 1;
        stack[sp++] = n;
      }
    };

    if (x > 0) tryAbsorb(p - 1);
    if (x < w - 1) tryAbsorb(p + 1);
    if (y > 0) tryAbsorb(p - w);
    if (y < h - 1) tryAbsorb(p + w);
  }

  // Foreground = opaque pixels the fill could not reach
  const isObj = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (!isBg[i] && rgba[i * 4 + 3] > 20) isObj[i] = 1;
  }

  // Largest connected foreground component (4-connectivity BFS). Specks below
  // ~0.5% of frame area are ignored, and components that fill the frame or hug
  // 3+ edges (letterbox bars, vignettes, unmeasurable objects) are excluded
  // BEFORE picking the winner, so edge artifacts can't shadow a valid object.
  const visited = new Uint8Array(total);
  const minComponent = Math.max(1, Math.round(total * 0.005));
  let best: { count: number; minX: number; minY: number; maxX: number; maxY: number } | null = null;
  let hadCandidate = false;
  for (let start = 0; start < total; start++) {
    if (!isObj[start] || visited[start]) continue;
    let sp2 = 0;
    stack[sp2++] = start;
    visited[start] = 1;
    let count = 0;
    let cMinX = w, cMinY = h, cMaxX = -1, cMaxY = -1;
    while (sp2 > 0) {
      const p = stack[--sp2];
      count++;
      const x = p % w;
      const y = (p / w) | 0;
      if (x < cMinX) cMinX = x;
      if (x > cMaxX) cMaxX = x;
      if (y < cMinY) cMinY = y;
      if (y > cMaxY) cMaxY = y;
      if (x > 0) { const n = p - 1; if (isObj[n] && !visited[n]) { visited[n] = 1; stack[sp2++] = n; } }
      if (x < w - 1) { const n = p + 1; if (isObj[n] && !visited[n]) { visited[n] = 1; stack[sp2++] = n; } }
      if (y > 0) { const n = p - w; if (isObj[n] && !visited[n]) { visited[n] = 1; stack[sp2++] = n; } }
      if (y < h - 1) { const n = p + w; if (isObj[n] && !visited[n]) { visited[n] = 1; stack[sp2++] = n; } }
    }
    const edges = (cMinX === 0 ? 1 : 0) + (cMaxX === w - 1 ? 1 : 0) + (cMinY === 0 ? 1 : 0) + (cMaxY === h - 1 ? 1 : 0);
    if (count < minComponent) continue;
    hadCandidate = true;
    if (count > total * 0.9 || edges >= 3) continue;
    if (!best || count > best.count) {
      best = { count, minX: cMinX, minY: cMinY, maxX: cMaxX, maxY: cMaxY };
    }
  }

  return {
    bbox: best ? { minX: best.minX, minY: best.minY, maxX: best.maxX, maxY: best.maxY } : null,
    background: isBg,
    reason: best ? null : hadCandidate ? 'edge-reject' : 'empty',
  };
}

/**
 * Two-layer variant of analyzeFrame for the "object on a backdrop card on a
 * table" case: when the outer detection's winner is implausibly large for a
 * patch/product (>= 30% of the frame), re-run the analysis inside the winner's
 * box so the backdrop layer becomes background too.
 *
 * The inner result is only accepted when the inner object is inset from the
 * outer box on ALL sides — an inner component touching an edge is part of the
 * object itself (e.g. a coloured tab at the end of a strap), not a new layer.
 */
export function analyzeFrameLayered(
  rgba: Uint8ClampedArray,
  w: number,
  h: number,
  margin: number
): ObjectDetection {
  const first = analyzeFrame(rgba, w, h, margin);
  if (!first.bbox) return first;

  const boxW = first.bbox.maxX - first.bbox.minX + 1;
  const boxH = first.bbox.maxY - first.bbox.minY + 1;
  if (boxW * boxH < w * h * 0.3) return first;

  // Pass 2: the winner's box becomes its own frame, its border seeds the fill
  const sub = new Uint8ClampedArray(boxW * boxH * 4);
  for (let y = 0; y < boxH; y++) {
    const srcRow = ((first.bbox.minY + y) * w + first.bbox.minX) * 4;
    sub.set(rgba.subarray(srcRow, srcRow + boxW * 4), y * boxW * 4);
  }
  const second = analyzeFrame(sub, boxW, boxH, margin);
  if (!second.bbox) return first;

  const inset = 2;
  if (
    second.bbox.minX < inset ||
    second.bbox.minY < inset ||
    second.bbox.maxX > boxW - 1 - inset ||
    second.bbox.maxY > boxH - 1 - inset
  ) {
    return first;
  }

  // Merge: everything the inner pass called background is background too
  const background = first.background.slice();
  for (let y = 0; y < boxH; y++) {
    const dstRow = (first.bbox.minY + y) * w + first.bbox.minX;
    for (let x = 0; x < boxW; x++) {
      if (second.background[y * boxW + x]) background[dstRow + x] = 1;
    }
  }

  return {
    bbox: {
      minX: first.bbox.minX + second.bbox.minX,
      minY: first.bbox.minY + second.bbox.minY,
      maxX: first.bbox.minX + second.bbox.maxX,
      maxY: first.bbox.minY + second.bbox.maxY,
    },
    background,
    reason: null,
  };
}
