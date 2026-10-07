/**
 * Shadow from the drawn form (spike, docs/research/2026-10-07-shape-shading-spike.md). No model:
 * the area inside a closed ink outline is inflated into a rounded height field from its
 * distance to the outline (as in Lumo, Teddy and Monster Mash), lit from one side, and cut into
 * three tone bands. Pure; images are grayscale arrays.
 */

export interface Gray {
  width: number;
  height: number;
  /** 0 black … 255 white, row by row. */
  data: Uint8Array;
}

export type LightSide = "left" | "top" | "right";
/** Round forms are inflated and lit; flat ones are a plane turned slightly away from the light. */
export type FormKind = "round" | "flat";
type Point = [number, number];
/** Why there is no area: it runs off the image, covers most of it, or is too small to shade. */
export type Refusal = "leak" | "tooBig" | "tooSmall";

/** Tone bands: 0 outside, 1 light, 2 half shadow, 3 core shadow. */
export const BAND = { outside: 0, light: 1, half: 2, core: 3 } as const;

/** The light's height above the paper; 35° gives a clear core shadow on round forms. */
const ELEVATION = (35 * Math.PI) / 180;
/** A surface facing the viewer gets sin(35°) ≈ 0.57: well inside "light", so flat parts stay calm. */
const HALF_BELOW = 0.42;
const CORE_BELOW = 0.12;
const MAX_SHARE = 0.4;
const MIN_SHARE = 0.0005;

/** Mean of a box around each pixel, from an integral image. */
function boxMean(gray: Gray, radius: number): Float32Array {
  const { width: w, height: h, data } = gray;
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += data[y * w + x] as number;
      sum[(y + 1) * (w + 1) + x + 1] = (sum[y * (w + 1) + x + 1] as number) + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h, y + radius + 1);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w, x + radius + 1);
      const s =
        (sum[y1 * (w + 1) + x1] as number) -
        (sum[y0 * (w + 1) + x1] as number) -
        (sum[y1 * (w + 1) + x0] as number) +
        (sum[y0 * (w + 1) + x0] as number);
      out[y * w + x] = s / ((x1 - x0) * (y1 - y0));
    }
  }
  return out;
}

/** Ink lines: clearly darker than the paper around them. Large dark areas are not lines. */
export function inkMask(gray: Gray): Uint8Array {
  const radius = Math.max(8, Math.round(Math.max(gray.width, gray.height) / 40));
  const mean = boxMean(gray, radius);
  const ink = new Uint8Array(gray.width * gray.height);
  for (let i = 0; i < ink.length; i++) {
    const v = gray.data[i] as number;
    ink[i] = v < (mean[i] as number) * 0.85 && v < 200 ? 1 : 0;
  }
  return ink;
}

/** Grows a mask by `r` pixels (square), separably. */
function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask.slice();
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -Infinity;
    // Distance to the last set pixel on the left, then on the right.
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) last = x;
      if (x - last <= r) tmp[y * w + x] = 1;
    }
    last = Infinity;
    for (let x = w - 1; x >= 0; x--) {
      if (mask[y * w + x]) last = x;
      if (last - x <= r) tmp[y * w + x] = 1;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let last = -Infinity;
    for (let y = 0; y < h; y++) {
      if (tmp[y * w + x]) last = y;
      if (y - last <= r) out[y * w + x] = 1;
    }
    last = Infinity;
    for (let y = h - 1; y >= 0; y--) {
      if (tmp[y * w + x]) last = y;
      if (last - y <= r) out[y * w + x] = 1;
    }
  }
  return out;
}

const invert = (mask: Uint8Array) => mask.map((v) => (v ? 0 : 1));
const erode = (mask: Uint8Array, w: number, h: number, r: number) =>
  invert(dilate(invert(mask), w, h, r));

/** Pixels of `free` 4-connected to `start`; `touches` tells whether it reached the border. */
function flood(free: Uint8Array, w: number, h: number, start: number) {
  const seen = new Uint8Array(w * h);
  const stack = [start];
  seen[start] = 1;
  let touches = false;
  let size = 0;
  while (stack.length) {
    const i = stack.pop() as number;
    size++;
    const x = i % w;
    const y = (i - x) / w;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
    const next = [
      x > 0 ? i - 1 : -1,
      x < w - 1 ? i + 1 : -1,
      y > 0 ? i - w : -1,
      y < h - 1 ? i + w : -1,
    ];
    for (const j of next) {
      if (j >= 0 && free[j] && !seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  return { seen, touches, size };
}

/** The nearest pixel of `free` within `reach` of (x, y), or -1. */
function nearestFree(free: Uint8Array, w: number, h: number, x: number, y: number, reach: number) {
  let best = -1;
  let bestD = Infinity;
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const px = x + dx;
      const py = y + dy;
      const d = dx * dx + dy * dy;
      if (px < 0 || py < 0 || px >= w || py >= h || d > reach * reach || d >= bestD) continue;
      if (free[py * w + px]) {
        best = py * w + px;
        bestD = d;
      }
    }
  }
  return best;
}

/** The union of the tapped areas with ink grown by `gap`, or why there is none. */
function fill(
  ink: Uint8Array,
  w: number,
  h: number,
  taps: [number, number][],
  gap: number,
): { union: Uint8Array; gap: number } | { refused: Refusal } {
  const free = invert(dilate(ink, w, h, gap));
  const union = new Uint8Array(w * h);
  for (const [tx, ty] of taps) {
    const x = Math.min(w - 1, Math.max(0, Math.round(tx)));
    const y = Math.min(h - 1, Math.max(0, Math.round(ty)));
    // A finger lands on lines: look a little further for the area it meant.
    const start = nearestFree(free, w, h, x, y, Math.max(12, gap * 4));
    if (start < 0) return { refused: "tooSmall" };
    if (union[start]) continue;
    const part = flood(free, w, h, start);
    if (part.touches) return { refused: "leak" };
    part.seen.forEach((v, i) => {
      if (v) union[i] = 1;
    });
  }
  return { union, gap };
}

/**
 * The area of one form from taps in pixels: inside its ink outline, small gaps closed, parts
 * split by inner lines joined, small holes (windows, details) filled. Refused rather than
 * guessed when it runs off the image.
 */
export function regionFrom(
  ink: Uint8Array,
  w: number,
  h: number,
  taps: [number, number][],
): { mask: Uint8Array } | { refused: Refusal } {
  const base = Math.max(2, Math.round(Math.max(w, h) / 300));
  // Hand-drawn outlines have gaps: the smallest closing that holds wins, up to three times the base.
  let found: { union: Uint8Array; gap: number } | { refused: Refusal } = { refused: "leak" };
  for (const gap of [base, base * 2, base * 3]) {
    found = fill(ink, w, h, taps, gap);
    if ("union" in found || found.refused !== "leak") break;
  }
  if (!("union" in found)) return found;
  const { union, gap } = found;
  // Back out to the line, then join parts across inner lines.
  const grown = dilate(union, w, h, gap).map((v, i) => (v && !ink[i] ? 1 : 0));
  const join = gap * 3;
  const joined = erode(dilate(grown, w, h, join), w, h, join);
  // Holes: whatever the outside cannot reach.
  const outside = invert(joined);
  const reach = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) {
    for (const i of [x, (h - 1) * w + x]) {
      if (outside[i] && !reach[i]) {
        reach[i] = 1;
        stack.push(i);
      }
    }
  }
  for (let y = 0; y < h; y++) {
    for (const i of [y * w, y * w + w - 1]) {
      if (outside[i] && !reach[i]) {
        reach[i] = 1;
        stack.push(i);
      }
    }
  }
  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j >= 0 && j < w * h && outside[j] && !reach[j]) {
        reach[j] = 1;
        stack.push(j);
      }
    }
  }
  const mask = reach.map((v) => (v ? 0 : 1));
  const area = mask.reduce((n, v) => n + v, 0);
  if (area > w * h * MAX_SHARE) return { refused: "tooBig" };
  if (area < w * h * MIN_SHARE) return { refused: "tooSmall" };
  return { mask };
}

/** 1D squared distance transform (Felzenszwalb and Huttenlocher). */
function edt1d(f: Float64Array, n: number): Float64Array {
  const d = new Float64Array(n);
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s: number;
    for (;;) {
      const p = v[k] as number;
      s = ((f[q] as number) + q * q - ((f[p] as number) + p * p)) / (2 * q - 2 * p);
      if (s > (z[k] as number)) break;
      k--;
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while ((z[k + 1] as number) < q) k++;
    const p = v[k] as number;
    d[q] = (q - p) * (q - p) + (f[p] as number);
  }
  return d;
}

/** Euclidean distance from each pixel of the area to the nearest pixel outside it; 0 outside. */
export function distanceInside(mask: Uint8Array, w: number, h: number): Float32Array {
  const BIG = 1e12;
  const grid = new Float64Array(w * h);
  for (let x = 0; x < w; x++) {
    const col = new Float64Array(h);
    for (let y = 0; y < h; y++) col[y] = mask[y * w + x] ? BIG : 0;
    const out = edt1d(col, h);
    for (let y = 0; y < h; y++) grid[y * w + x] = out[y] as number;
  }
  const result = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const out = edt1d(grid.subarray(y * w, y * w + w), w);
    for (let x = 0; x < w; x++)
      result[y * w + x] = mask[y * w + x] ? Math.sqrt(out[x] as number) : 0;
  }
  return result;
}

/** Box blur of `values` inside the area only, so the outline stays where it is; running sums. */
function blurInside(values: Float32Array, mask: Uint8Array, w: number, h: number, r: number) {
  let current = values;
  for (const horizontal of [true, false]) {
    const out = new Float32Array(w * h);
    const lines = horizontal ? h : w;
    const length = horizontal ? w : h;
    const sum = new Float64Array(length + 1);
    const n = new Int32Array(length + 1);
    for (let a = 0; a < lines; a++) {
      const at = (b: number) => (horizontal ? a * w + b : b * w + a);
      for (let b = 0; b < length; b++) {
        const inside = mask[at(b)] ? 1 : 0;
        sum[b + 1] = (sum[b] as number) + (inside ? (current[at(b)] as number) : 0);
        n[b + 1] = (n[b] as number) + inside;
      }
      for (let b = 0; b < length; b++) {
        if (!mask[at(b)]) continue;
        const lo = Math.max(0, b - r);
        const hi = Math.min(length, b + r + 1);
        out[at(b)] =
          ((sum[hi] as number) - (sum[lo] as number)) / ((n[hi] as number) - (n[lo] as number));
      }
    }
    current = out;
  }
  return current;
}

const LIGHT: Record<LightSide, [number, number]> = { left: [-1, 0], right: [1, 0], top: [0, -1] };

/** A flat form: light on the near half, one even layer on the far half, no shading at its edges. */
function flatBands(mask: Uint8Array, w: number, h: number, light: LightSide): Uint8Array {
  const [lx, ly] = LIGHT[light];
  let lo = Infinity;
  let hi = -Infinity;
  mask.forEach((v, i) => {
    if (!v) return;
    const t = -(lx * (i % w) + ly * Math.floor(i / w));
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  });
  const bands = new Uint8Array(w * h);
  mask.forEach((v, i) => {
    if (!v) return;
    const t = -(lx * (i % w) + ly * Math.floor(i / w));
    bands[i] = (t - lo) / Math.max(1, hi - lo) >= 0.5 ? BAND.half : BAND.light;
  });
  return bands;
}

/** The box around a mask with a one-pixel margin, so work stays near the form. */
function box(mask: Uint8Array, w: number, h: number) {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  mask.forEach((v, i) => {
    if (!v) return;
    const x = i % w;
    const y = (i - x) / w;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - 1);
  y0 = Math.max(0, y0 - 1);
  x1 = Math.min(w - 1, x1 + 1);
  y1 = Math.min(h - 1, y1 + 1);
  return { x0, y0, cw: x1 - x0 + 1, ch: y1 - y0 + 1 };
}

function crop(
  values: Uint8Array,
  w: number,
  b: { x0: number; y0: number; cw: number; ch: number },
) {
  const out = new Uint8Array(b.cw * b.ch);
  for (let y = 0; y < b.ch; y++)
    out.set(values.subarray((b.y0 + y) * w + b.x0, (b.y0 + y) * w + b.x0 + b.cw), y * b.cw);
  return out;
}

/** Tone bands for an area lit from one side: round forms from their inflated height field. */
export function shadeBands(
  mask: Uint8Array,
  w: number,
  h: number,
  light: LightSide,
  kind: FormKind = "round",
): Uint8Array {
  const b = box(mask, w, h);
  const bands = new Uint8Array(w * h);
  if (!b) return bands;
  const part = shadeCropped(crop(mask, w, b), b.cw, b.ch, light, kind);
  for (let y = 0; y < b.ch; y++)
    bands.set(part.subarray(y * b.cw, (y + 1) * b.cw), (b.y0 + y) * w + b.x0);
  return bands;
}

function shadeCropped(
  mask: Uint8Array,
  w: number,
  h: number,
  light: LightSide,
  kind: FormKind,
): Uint8Array {
  if (kind === "flat") return flatBands(mask, w, h, light);
  const d = distanceInside(mask, w, h);
  const deepest = d.reduce((m, v) => Math.max(m, v), 0);
  const smooth = blurInside(d, mask, w, h, Math.max(1, Math.round(deepest * 0.08)));
  // A round profile: steep at the outline, flat on the ridge.
  const height = smooth.map((v) => {
    const t = Math.min(v, deepest);
    return Math.sqrt(Math.max(0, deepest * deepest - (deepest - t) * (deepest - t)));
  });
  const [lx, ly] = LIGHT[light];
  const L = [lx * Math.cos(ELEVATION), ly * Math.cos(ELEVATION), Math.sin(ELEVATION)] as const;
  const bands = new Uint8Array(w * h);
  const at = (x: number, y: number, fallback: number) =>
    x < 0 || y < 0 || x >= w || y >= h || !mask[y * w + x]
      ? fallback
      : (height[y * w + x] as number);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      // Outside the area counts as height 0: the form falls away at its outline.
      const gx = (at(x + 1, y, 0) - at(x - 1, y, 0)) / 2;
      const gy = (at(x, y + 1, 0) - at(x, y - 1, 0)) / 2;
      const nx = -gx;
      const ny = -gy;
      const length = Math.hypot(nx, ny, 1);
      const lit = (nx * L[0] + ny * L[1] + L[2]) / length;
      bands[i] = lit >= HALF_BELOW ? BAND.light : lit >= CORE_BELOW ? BAND.half : BAND.core;
    }
  }
  return bands;
}

/** From a photo and taps (shares of its width and height) to tone bands, or a refusal. */
export function shadeObject(
  gray: Gray,
  taps: [number, number][],
  light: LightSide,
): { bands: Uint8Array; mask: Uint8Array } | { refused: Refusal } {
  const { width: w, height: h } = gray;
  const region = regionFrom(
    inkMask(gray),
    w,
    h,
    taps.map(([x, y]) => [x * (w - 1), y * (h - 1)]),
  );
  if (!("mask" in region)) return region;
  return { bands: shadeBands(region.mask, w, h, light), mask: region.mask };
}

/** RGBA pixels as gray (Rec. 601 luma), averaged down so the long side is at most `maxSide`. */
export function grayFrom(
  rgba: { width: number; height: number; data: Uint8ClampedArray | Uint8Array },
  maxSide: number,
): Gray {
  const scale = Math.min(1, maxSide / Math.max(rgba.width, rgba.height));
  const width = Math.max(1, Math.round(rgba.width * scale));
  const height = Math.max(1, Math.round(rgba.height * scale));
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.floor((y * rgba.height) / height);
    const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * rgba.height) / height));
    for (let x = 0; x < width; x++) {
      const x0 = Math.floor((x * rgba.width) / width);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * rgba.width) / width));
      let sum = 0;
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * rgba.width + sx) * 4;
          sum +=
            0.299 * (rgba.data[i] as number) +
            0.587 * (rgba.data[i + 1] as number) +
            0.114 * (rgba.data[i + 2] as number);
        }
      }
      data[y * width + x] = Math.round(sum / ((x1 - x0) * (y1 - y0)));
    }
  }
  return { width, height, data };
}

/** A brush stroke from `from` to `to` (pixels): sets the mask to `value` within `radius`. */
export function paint(
  mask: Uint8Array,
  w: number,
  h: number,
  from: Point,
  to: Point,
  radius: number,
  value: 0 | 1,
): Uint8Array {
  const out = mask.slice();
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / Math.max(1, radius / 2)),
  );
  for (let k = 0; k <= steps; k++) {
    const cx = from[0] + ((to[0] - from[0]) * k) / steps;
    const cy = from[1] + ((to[1] - from[1]) * k) / steps;
    for (
      let y = Math.max(0, Math.floor(cy - radius));
      y <= Math.min(h - 1, Math.ceil(cy + radius));
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(cx - radius));
        x <= Math.min(w - 1, Math.ceil(cx + radius));
        x++
      ) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radius * radius) out[y * w + x] = value;
      }
    }
  }
  return out;
}

/** Moore neighbours, clockwise on screen (y down), starting east. */
const AROUND: Point[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/** The outer boundary of the component containing `start` (its top-left pixel), as pixel centres. */
function boundary(label: Int32Array, id: number, w: number, h: number, start: number): Point[] {
  const inside = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && label[y * w + x] === id;
  const sx = start % w;
  const sy = (start - sx) / w;
  const points: Point[] = [[sx, sy]];
  let cx = sx;
  let cy = sy;
  // We arrived from the west, which is outside.
  let back = 4;
  for (let guard = 0; guard < w * h * 4; guard++) {
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const d = (back + k) % 8;
      const [dx, dy] = AROUND[d] as Point;
      if (inside(cx + dx, cy + dy)) {
        const [bx, by] = AROUND[(d + 7) % 8] as Point;
        const ox = cx + bx;
        const oy = cy + by;
        cx += dx;
        cy += dy;
        // Direction from the new pixel back to the last outside neighbour examined.
        back = AROUND.findIndex(([ax, ay]) => ax === ox - cx && ay === oy - cy);
        moved = true;
        break;
      }
    }
    if (!moved || (cx === sx && cy === sy)) break;
    points.push([cx, cy]);
  }
  return points;
}

/** Douglas–Peucker on an open polyline. */
function simplifyLine(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const [a, b] = [points[0] as Point, points[points.length - 1] as Point];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  let worst = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i] as Point;
    const d = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / length;
    if (d > worst) {
      worst = d;
      index = i;
    }
  }
  if (worst <= tolerance) return [a, b];
  return [
    ...simplifyLine(points.slice(0, index + 1), tolerance).slice(0, -1),
    ...simplifyLine(points.slice(index), tolerance),
  ];
}

/** A closed polygon with at most `max` points: split at the farthest point, then simplify. */
function simplifyClosed(points: Point[], max: number): Point[] {
  if (points.length <= max) return points;
  const first = points[0] as Point;
  let far = 0;
  let farthest = 0;
  points.forEach((p, i) => {
    const d = Math.hypot(p[0] - first[0], p[1] - first[1]);
    if (d > farthest) {
      farthest = d;
      far = i;
    }
  });
  for (let tolerance = 0.5; ; tolerance *= 1.5) {
    const one = simplifyLine(points.slice(0, far + 1), tolerance);
    const two = simplifyLine([...points.slice(far), first], tolerance);
    const result = [...one.slice(0, -1), ...two.slice(0, -1)];
    if (result.length <= max) return result;
  }
}

/**
 * The outlines of a mask's parts as pixel-centre polygons of at most `maxPoints`, largest part
 * first; parts under 1 % of the mask are left out. Holes are not traced.
 */
export function traceMask(mask: Uint8Array, w: number, h: number, maxPoints: number): Point[][] {
  const label = new Int32Array(w * h);
  const parts: { id: number; start: number; size: number }[] = [];
  let total = 0;
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || label[i]) continue;
    const id = parts.length + 1;
    let size = 0;
    const stack = [i];
    label[i] = id;
    while (stack.length) {
      const j = stack.pop() as number;
      size++;
      const x = j % w;
      const y = (j - x) / w;
      for (const [dx, dy] of AROUND) {
        const nx = x + dx;
        const ny = y + dy;
        const k = ny * w + nx;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && mask[k] && !label[k]) {
          label[k] = id;
          stack.push(k);
        }
      }
    }
    parts.push({ id, start: i, size });
    total += size;
  }
  return parts
    .filter((p) => p.size >= Math.max(3, total * 0.01))
    .sort((a, b) => b.size - a.size)
    .map((p) => simplifyClosed(boundary(label, p.id, w, h, p.start), maxPoints))
    .filter((polygon) => polygon.length >= 3);
}

export interface FormTones {
  /** Normalized polygons of the light parts, the shadow (half and core) and the core shadow. */
  lit: Point[][];
  shadow: Point[][];
  core: Point[][];
}

/** Tone bands as at most three normalized polygons each, pulled one pixel inside their area. */
export function formTones(bands: Uint8Array, w: number, h: number): FormTones {
  const b = box(bands, w, h);
  const polygons = (keep: (band: number) => boolean) => {
    if (!b) return [];
    const part = crop(bands, w, b);
    const mask = erode(
      part.map((v) => (keep(v) ? 1 : 0)),
      b.cw,
      b.ch,
      1,
    );
    return traceMask(mask, b.cw, b.ch, 64)
      .slice(0, 3)
      .map((polygon) =>
        polygon.map(([x, y]): Point => [(x + b.x0 + 0.5) / w, (y + b.y0 + 0.5) / h]),
      );
  };
  return {
    lit: polygons((b) => b === BAND.light),
    shadow: polygons((b) => b >= BAND.half),
    core: polygons((b) => b === BAND.core),
  };
}
