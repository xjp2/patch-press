/**
 * Post-capture enhancement for camera-captured product/patch images.
 * Two passes on the (already cropped) ImageData:
 *  1. Edge-aware unsharp sharpening on RGB — crisper detail from soft video frames.
 *  2. Alpha cleanup — 1px erosion of the keyed mask followed by a 3x3 alpha blur,
 *     which removes the white halo fringe left by background removal.
 * All operations are in-place and skip work when the image has no transparency.
 */

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** White-balance the image against its own background. The capture flow assumes
 *  a light/white backdrop, so the detected background is a reliable neutral
 *  reference: per-channel gains push the background mean to neutral grey and the
 *  same correction applies to the object, removing camera colour casts (e.g. the
 *  classic green tint from phone auto-WB under white lamps). Gains are capped so
 *  a genuinely coloured backdrop can't distort the object too far. */
export function whiteBalanceFromBackground(
  imageData: ImageData,
  isBackground: Uint8Array,
  maxGain = 1.2
): void {
  const { data } = imageData;
  let rSum = 0, gSum = 0, bSum = 0, n = 0;
  for (let p = 0; p < isBackground.length; p++) {
    if (!isBackground[p]) continue;
    const i = p * 4;
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
    n++;
  }
  if (n < 50) return; // not enough reference pixels
  const rM = rSum / n, gM = gSum / n, bM = bSum / n;
  const lum = 0.2126 * rM + 0.7152 * gM + 0.0722 * bM;
  if (lum < 40) return; // background too dark to be a trustworthy reference
  const lo = 1 / maxGain;
  const gr = Math.min(maxGain, Math.max(lo, lum / rM));
  const gg = Math.min(maxGain, Math.max(lo, lum / gM));
  const gb = Math.min(maxGain, Math.max(lo, lum / bM));
  // Skip when the background is already ~neutral (within 3%)
  if (Math.abs(gr - 1) < 0.03 && Math.abs(gg - 1) < 0.03 && Math.abs(gb - 1) < 0.03) return;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i] = clamp255(Math.round(data[i] * gr));
    data[i + 1] = clamp255(Math.round(data[i + 1] * gg));
    data[i + 2] = clamp255(Math.round(data[i + 2] * gb));
  }
}

/** Gentle auto-exposure: if the opaque content is clearly underexposed
 *  (mean luminance below `dimBelow`), lift RGB by a capped gain towards
 *  `targetMean`. Capped conservatively so dark-coloured items stay dark
 *  and sensor noise isn't amplified. */
export function autoExpose(imageData: ImageData, targetMean = 170, maxGain = 1.45, dimBelow = 120): void {
  const { data } = imageData;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 40) {
    if (data[i + 3] <= 128) continue;
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    count++;
  }
  if (count === 0) return;
  const mean = sum / count;
  if (mean >= dimBelow) return; // already bright enough — leave colours alone
  const gain = Math.min(maxGain, targetMean / mean);
  if (gain <= 1.02) return;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    data[i] = clamp255(Math.round(data[i] * gain));
    data[i + 1] = clamp255(Math.round(data[i + 1] * gain));
    data[i + 2] = clamp255(Math.round(data[i + 2] * gain));
  }
}

/** Edge-aware 3x3 unsharp sharpen. Pixels next to transparent pixels use the
 *  center value for missing neighbours so no dark halo bleeds in. */
export function sharpenImageData(imageData: ImageData, amount = 0.35): void {
  const { data, width: w, height: h } = imageData;
  if (w < 3 || h < 3 || amount <= 0) return;
  // Keep a copy of the source so each output pixel reads original neighbours
  const src = new Uint8ClampedArray(data);
  const k = amount;
  const center = 1 + 4 * k;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] === 0) continue; // fully transparent — nothing to sharpen
      for (let c = 0; c < 3; c++) {
        const mid = src[i + c];
        const up = src[i - w * 4 + 3] === 0 ? mid : src[i - w * 4 + c];
        const down = src[i + w * 4 + 3] === 0 ? mid : src[i + w * 4 + c];
        const left = src[i - 4 + 3] === 0 ? mid : src[i - 4 + c];
        const right = src[i + 4 + 3] === 0 ? mid : src[i + 4 + c];
        data[i + c] = clamp255(Math.round(mid * center - k * (up + down + left + right)));
      }
    }
  }
}

/** Erode the kept (alpha > 128) region by `erodePx` pixels then feather the alpha
 *  edge with a single 3x3 box blur. No-op when the image has no transparency or
 *  `erodePx` is 0 (blur only). */
export function featherAlphaEdges(imageData: ImageData, erodePx = 1): void {
  const { data, width: w, height: h } = imageData;
  if (w < 3 || h < 3) return;

  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 400) {
    if (data[i] < 255) { hasTransparency = true; break; }
  }
  if (!hasTransparency) return;

  const n = w * h;
  let alpha = new Uint8Array(n);
  for (let p = 0; p < n; p++) alpha[p] = data[p * 4 + 3];

  // Erosion (4-neighbourhood), one pass per pixel — cuts the background fringe
  // left around the object by background removal
  for (let pass = 0; pass < erodePx; pass++) {
    const eroded = new Uint8Array(n);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (alpha[p] <= 128) continue;
        const edge =
          x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
          alpha[p - 1] <= 128 || alpha[p + 1] <= 128 ||
          alpha[p - w] <= 128 || alpha[p + w] <= 128;
        eroded[p] = edge ? 0 : alpha[p];
      }
    }
    alpha = eroded;
  }

  // 3x3 box blur of the eroded alpha — softens the stair-stepped edge
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const a = alpha[p];
      if (a === 0) continue; // stays transparent; also nothing to blend
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          sum += alpha[yy * w + xx];
        }
      }
      data[p * 4 + 3] = clamp255(Math.round(sum / 9));
    }
  }
}

/** Full enhancement pass: lift underexposed frames, sharpen, then clean up alpha edges. */
export function enhanceCapture(imageData: ImageData, sharpenAmount = 0.35, erodePx = 1): void {
  autoExpose(imageData);
  sharpenImageData(imageData, sharpenAmount);
  featherAlphaEdges(imageData, erodePx);
}

/** Rotate an image (any URL — blob:, data:, or remote) by ±90 degrees.
 *  Returns a fresh PNG blob + object URL with swapped dimensions. */
export async function rotateImage90(
  imageUrl: string,
  direction: 'cw' | 'ccw'
): Promise<{ blob: Blob; url: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(((direction === 'cw' ? 90 : -90) * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        resolve({ blob, url: URL.createObjectURL(blob) });
      }, 'image/png');
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

/** Manual adjustments applied on top of the auto-processed capture.
 *  All ranges are slider-friendly; transparent pixels are untouched. */
export interface ManualAdjustments {
  /** -100 (cool/blue) … 100 (warm/amber) — shifts R and B in opposite directions */
  temperature?: number;
  /** -100 (green) … 100 (magenta) — shifts the G channel */
  tint?: number;
  /** -100 … 100 — multiplicative gain 0×…2× */
  brightness?: number;
  /** -100 … 100 — expands/compresses around mid-grey */
  contrast?: number;
  /** 0 … 100 — extra unsharp sharpening on top of the auto pass */
  sharpen?: number;
}

/** One-pass manual adjustment (brightness → contrast → colour → sharpen). */
export async function adjustImage(
  imageUrl: string,
  adj: ManualAdjustments
): Promise<{ blob: Blob; url: string } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const gain = 1 + (adj.brightness ?? 0) / 100;
      const cf = 1 + (adj.contrast ?? 0) / 100;
      const tempShift = (adj.temperature ?? 0) * 0.5;
      const tintShift = (adj.tint ?? 0) * 0.5;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        for (let c = 0; c < 3; c++) {
          let v = data[i + c];
          if (cf !== 1) v = (v - 128) * cf + 128;
          if (gain !== 1) v *= gain;
          data[i + c] = clamp255(Math.round(v));
        }
        if (tempShift !== 0 || tintShift !== 0) {
          data[i] = clamp255(Math.round(data[i] + tempShift));
          data[i + 1] = clamp255(Math.round(data[i + 1] - tintShift));
          data[i + 2] = clamp255(Math.round(data[i + 2] - tempShift));
        }
      }
      const sharpenAmount = ((adj.sharpen ?? 0) / 100) * 0.8;
      if (sharpenAmount > 0) sharpenImageData(imageData, sharpenAmount);
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        resolve({ blob, url: URL.createObjectURL(blob) });
      }, 'image/png');
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}
