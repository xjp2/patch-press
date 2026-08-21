// Synthetic tests for src/lib/objectDetect.ts — run with: npx tsx scripts/test-object-detect.ts
import { analyzeFrame, analyzeFrameLayered } from '../src/lib/objectDetect';

const W = 640;
const H = 480;
const MARGIN = 15; // matches default slider 240 → margin 15

function makeFrame(pixel: (x: number, y: number) => number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const v = Math.max(0, Math.min(255, pixel(x, y)));
      const i = (y * W + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return data;
}

// deterministic pseudo-noise
function noise(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 6 - 3; // ±3
}

// Card rect used across cases: 200x140 px centered-ish
const CARD = { x0: 220, y0: 150, x1: 420, y1: 290 };
const inCard = (x: number, y: number) => x >= CARD.x0 && x <= CARD.x1 && y >= CARD.y0 && y <= CARD.y1;

let failures = 0;

function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
  if (!ok) failures++;
}

function expectBBox(name: string, frame: Uint8ClampedArray, tol = 15) {
  const res = analyzeFrame(frame, W, H, MARGIN);
  if (!res.bbox) return check(name, false, `bbox null (reason=${res.reason}), expected detection`);
  const { minX, minY, maxX, maxY } = res.bbox;
  const ok =
    Math.abs(minX - CARD.x0) <= tol &&
    Math.abs(minY - CARD.y0) <= tol &&
    Math.abs(maxX - CARD.x1) <= tol &&
    Math.abs(maxY - CARD.y1) <= tol;
  check(name, ok, `bbox=(${minX},${minY})-(${maxX},${maxY}) expected≈(${CARD.x0},${CARD.y0})-(${CARD.x1},${CARD.y1})`);
}

function expectNull(name: string, frame: Uint8ClampedArray) {
  const res = analyzeFrame(frame, W, H, MARGIN);
  check(name, res.bbox === null, res.bbox ? `unexpected bbox=(${res.bbox.minX},${res.bbox.minY})-(${res.bbox.maxX},${res.bbox.maxY})` : `null as expected (reason=${res.reason})`);
}

// 1. Dark card on white paper with a strong lighting gradient (180→225 across the frame)
expectBBox('dark card on white bg + gradient', makeFrame((x, y) =>
  (inCard(x, y) ? 90 : 180 + 45 * (x / W)) + noise(x, y)));

// 2. Light-gray card (225) on slightly darker white paper (~200) with gradient
expectBBox('light card on white bg + gradient', makeFrame((x, y) =>
  (inCard(x, y) ? 225 : 185 + 30 * (y / H)) + noise(x, y)));

// 3. White object on dark cloth
expectBBox('white object on dark bg', makeFrame((x, y) =>
  (inCard(x, y) ? 235 : 55 + 15 * (x / W)) + noise(x, y)));

// 4. Card with a soft drop shadow extending ~20px around it
expectBBox('dark card + soft shadow', makeFrame((x, y) => {
  const bg = 190 + 30 * (x / W);
  if (inCard(x, y)) return 95 + noise(x, y);
  const dx = Math.max(CARD.x0 - x, 0, x - CARD.x1);
  const dy = Math.max(CARD.y0 - y, 0, y - CARD.y1);
  const d = Math.hypot(dx, dy);
  const shadow = d < 25 ? (1 - d / 25) * 40 : 0;
  return bg - shadow + noise(x, y);
}), 30);

// 5. Empty white paper, uniform → no object
expectNull('uniform empty bg', makeFrame((x, y) => 210 + noise(x, y)));

// 6. Empty paper with steep gradient only → no object (this killed the global-median approach)
expectNull('empty bg with steep gradient', makeFrame((x, y) => 150 + 80 * (x / W) + noise(x, y)));

// 7. Card filling almost the whole frame → should refuse (can't measure against frame edges)
expectNull('object touching 3+ edges', makeFrame((x, y) =>
  (x >= 5 && x <= W - 6 && y >= 5 && y <= H - 6 ? 90 : 220) + noise(x, y)));

// 8. Real-world failure: black letterbox bars on both sides (photo of a screen).
// Bars touch 3 edges and dwarf the object — detection must skip them, not reject the frame.
expectBBox('object between black letterbox bars', makeFrame((x, y) => {
  if (x < 165 || x > 475) return 8 + noise(x, y); // black bars
  return (inCard(x, y) ? 115 : 245) + noise(x, y); // white screen + dark-red object
}));

// 9. Object on a gray backdrop card on a white table (real failure: pass 1 keyed
// the table but treated the whole card as the object). Layered analysis must peel
// the card and find the strap inside it.
{
  const MAT = { x0: 110, y0: 60, x1: 530, y1: 420 }; // big gray backdrop card (~55% of frame)
  const res = analyzeFrameLayered(makeFrame((x, y) => {
    if (inCard(x, y)) return 95 + noise(x, y);      // dark strap
    if (x >= MAT.x0 && x <= MAT.x1 && y >= MAT.y0 && y <= MAT.y1) return 200 + noise(x, y); // gray card
    return 240 + noise(x, y);                        // white table
  }), W, H, MARGIN);
  if (!res.bbox) {
    check('object on backdrop card (layered)', false, `bbox null (reason=${res.reason}), expected detection`);
  } else {
    const { minX, minY, maxX, maxY } = res.bbox;
    const ok =
      Math.abs(minX - CARD.x0) <= 15 && Math.abs(minY - CARD.y0) <= 15 &&
      Math.abs(maxX - CARD.x1) <= 15 && Math.abs(maxY - CARD.y1) <= 15;
    check('object on backdrop card (layered)', ok, `bbox=(${minX},${minY})-(${maxX},${maxY}) expected≈(${CARD.x0},${CARD.y0})-(${CARD.x1},${CARD.y1})`);
  }
}

// 10. Guard: a small object (below the 30% peel gate) with an interior detail
// must NOT be peeled down to the detail.
{
  const res = analyzeFrameLayered(makeFrame((x, y) => {
    if (x >= 300 && x <= 330 && y >= 205 && y <= 235) return 40 + noise(x, y); // dark dot inside card
    if (inCard(x, y)) return 150 + noise(x, y);                                 // mid-gray card body
    return 240 + noise(x, y);
  }), W, H, MARGIN);
  if (!res.bbox) {
    check('no peel for small object (layered)', false, `bbox null (reason=${res.reason}), expected detection`);
  } else {
    const { minX, minY, maxX, maxY } = res.bbox;
    const ok =
      Math.abs(minX - CARD.x0) <= 15 && Math.abs(minY - CARD.y0) <= 15 &&
      Math.abs(maxX - CARD.x1) <= 15 && Math.abs(maxY - CARD.y1) <= 15;
    check('no peel for small object (layered)', ok, `bbox=(${minX},${minY})-(${maxX},${maxY}) expected full card, got (${minX},${minY})-(${maxX},${maxY})`);
  }
}

console.log(failures === 0 ? '\nAll tests passed' : `\n${failures} test(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
