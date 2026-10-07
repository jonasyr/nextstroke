import { dilate, erode, fillHoles, flood, invert, nearestFree } from "./maskOps.ts";
import {
  distanceInside,
  type FormKind,
  type Gray,
  inkMask,
  type Refusal,
  traceMask,
} from "./shading.ts";

/**
 * Finding a drawn form from one tap (form mode v2, docs/research/2026-10-07-form-v2-plan.md).
 * Candidates from small to large: the area inside the nearest outline, the same area with the
 * thin cells of hatching merged into it, and areas found once ever larger loose marks
 * (texture, dots, short strokes) stop counting as walls. The smallest real one is offered
 * first; "Größer" and "Kleiner" step through the rest. Every threshold scales with the image.
 */

const MAX_SHARE = 0.4;
const MIN_SHARE = 0.0005;
/** The first candidate offered must cover at least this share: smaller ones are texture cells. */
const PICK_SHARE = 0.0008;
/** Loose marks up to these shares of the long side stop counting as walls, level by level. */
const LEVELS = [0, 0.02, 0.04, 0.08, 0.16, 0.32];
/** Candidates within this share of each other's area count as the same. */
const SAME = 0.15;

type Pt = [number, number];
type Found = { mask: Uint8Array; area: number; kind?: "fill" | "merged" };

/**
 * A dark fill under the tap (a blacked-in eye, lens or shadow): the connected dark area itself.
 * Dark means well below the paper, which is taken as the bright end of the image.
 */
function darkFill(gray: Gray, tap: Pt): Found | null {
  const { width: w, height: h, data } = gray;
  const sorted = Uint8Array.from(data).sort();
  const paper = sorted[Math.floor(sorted.length * 0.9)] as number;
  const dark = data.map((v) => (v < paper * 0.45 ? 1 : 0));
  const reach = Math.max(3, Math.round(Math.max(w, h) / 150));
  const start = nearestFree(dark, w, h, Math.round(tap[0]), Math.round(tap[1]), reach);
  // The tap must be on the fill itself, not merely near a line.
  if (start < 0 || Math.hypot((start % w) - tap[0], Math.floor(start / w) - tap[1]) > reach / 2) {
    return null;
  }
  const part = flood(dark, w, h, start);
  if (part.touches) return null;
  const mask = fillHoles(part.seen, w, h);
  return { mask, area: mask.reduce((n, v) => n + v, 0), kind: "fill" };
}

/** Ink parts (8-connected) labelled, with the larger side of each part's box. */
function inkParts(ink: Uint8Array, w: number, h: number) {
  const label = new Int32Array(w * h);
  const extent: number[] = [0];
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!ink[i] || label[i]) continue;
    const id = extent.length;
    let x0 = w;
    let x1 = 0;
    let y0 = h;
    let y1 = 0;
    label[i] = id;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop() as number;
      const x = j % w;
      const y = (j - x) / w;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const k = ny * w + nx;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && ink[k] && !label[k]) {
            label[k] = id;
            stack.push(k);
          }
        }
      }
    }
    extent.push(Math.max(x1 - x0, y1 - y0) + 1);
  }
  return { label, extent };
}

/** Grows the flood back to the lines, joins parts across thin inner lines and fills holes. */
function settle(region: Uint8Array, walls: Uint8Array, w: number, h: number, gap: number) {
  const grown = dilate(region, w, h, gap).map((v, i) => (v && !walls[i] ? 1 : 0));
  const join = gap * 3;
  return fillHoles(erode(dilate(grown, w, h, join), w, h, join), w, h);
}

/** The area around `start` with `walls` grown to close gaps of up to three times `base`. */
function enclosed(
  walls: Uint8Array,
  w: number,
  h: number,
  tap: Pt,
  base: number,
): Found | "leak" | "none" {
  for (const gap of [base, base * 2, base * 3]) {
    const free = invert(dilate(walls, w, h, gap));
    const start = nearestFree(
      free,
      w,
      h,
      Math.round(tap[0]),
      Math.round(tap[1]),
      Math.max(12, gap * 4),
    );
    if (start < 0) return "none";
    const part = flood(free, w, h, start);
    if (part.touches) continue;
    const mask = settle(part.seen, walls, w, h, gap);
    return { mask, area: mask.reduce((n, v) => n + v, 0) };
  }
  return "leak";
}

/**
 * The tapped cell with every thin cell next to it merged in, again and again: the gaps of
 * hatching are thin, the paper around a form is not. Null when it would reach the border.
 * Cells become neighbours across a line when their pixels, grown into the ink, meet.
 */
interface Cells {
  cell: Int32Array;
  thick: number[];
  border: boolean[];
  free: Uint8Array;
}

/** The paper between the lines, cut into cells (4-connected), with each cell's thickness. */
function paperCells(ink: Uint8Array, w: number, h: number): Cells {
  const free = invert(ink);
  const depth = distanceInside(free, w, h);
  // Cells (4-connected free space), each with its thickness and whether it touches the border.
  const cell = new Int32Array(w * h);
  const thick: number[] = [0];
  const border: boolean[] = [false];
  const stack: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (!free[i] || cell[i]) continue;
    const id = thick.length;
    let deepest = 0;
    let touches = false;
    cell[i] = id;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop() as number;
      const x = j % w;
      const y = (j - x) / w;
      deepest = Math.max(deepest, depth[j] as number);
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
      for (const k of [
        x > 0 ? j - 1 : -1,
        x < w - 1 ? j + 1 : -1,
        y > 0 ? j - w : -1,
        y < h - 1 ? j + w : -1,
      ]) {
        if (k >= 0 && free[k] && !cell[k]) {
          cell[k] = id;
          stack.push(k);
        }
      }
    }
    thick.push(deepest);
    border.push(touches);
  }
  return { cell, thick, border, free };
}

function mergedCells(cells: Cells, w: number, h: number, tap: Pt, base: number): Found | null {
  const { cell, thick, border, free } = cells;
  const start = nearestFree(
    free,
    w,
    h,
    Math.round(tap[0]),
    Math.round(tap[1]),
    Math.max(12, base * 4),
  );
  if (start < 0) return null;
  // Grow the cells into the ink, layer by layer, so cells on both sides of a line meet.
  const reach = Math.max(2, Math.round(Math.max(w, h) / 250)) + 1;
  const grown = Int32Array.from(cell);
  let layer: number[] = [];
  for (let i = 0; i < w * h; i++) if (grown[i]) layer.push(i);
  for (let step = 0; step < reach && layer.length; step++) {
    const next: number[] = [];
    for (const j of layer) {
      const x = j % w;
      const y = (j - x) / w;
      for (const k of [
        x > 0 ? j - 1 : -1,
        x < w - 1 ? j + 1 : -1,
        y > 0 ? j - w : -1,
        y < h - 1 ? j + w : -1,
      ]) {
        if (k >= 0 && !grown[k]) {
          grown[k] = grown[j] as number;
          next.push(k);
        }
      }
    }
    layer = next;
  }
  const neighbours = new Map<number, Set<number>>();
  const link = (a: number, b: number) => {
    if (!a || !b || a === b) return;
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    if (!neighbours.has(b)) neighbours.set(b, new Set());
    neighbours.get(a)?.add(b);
    neighbours.get(b)?.add(a);
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = grown[y * w + x] as number;
      if (x < w - 1) link(a, grown[y * w + x + 1] as number);
      if (y < h - 1) link(a, grown[(y + 1) * w + x] as number);
    }
  }
  const thin = Math.max(4, Math.max(w, h) * 0.012);
  const first = cell[start] as number;
  const taken = new Set<number>([first]);
  const queue = [first];
  while (queue.length) {
    const c = queue.pop() as number;
    for (const n of neighbours.get(c) ?? []) {
      if (taken.has(n) || (thick[n] as number) > thin) continue;
      if (border[n]) return null;
      taken.add(n);
      queue.push(n);
    }
  }
  if (border[first]) return null;
  const region = Uint8Array.from(grown, (c) => (taken.has(c) ? 1 : 0));
  const mask = fillHoles(erode(dilate(region, w, h, reach), w, h, reach), w, h);
  return { mask, area: mask.reduce((n, v) => n + v, 0), kind: "merged" };
}

/**
 * The forms a tap can mean, from small to large, and the one to offer first; or why there is
 * none. `tap` is in pixels.
 */
export function formCandidates(
  gray: Gray,
  tap: Pt,
): { regions: Uint8Array[]; pick: number } | { refused: Refusal } {
  const { width: w, height: h } = gray;
  const long = Math.max(w, h);
  const base = Math.max(2, Math.round(long / 300));
  const ink = inkMask(gray);
  const { label, extent } = inkParts(ink, w, h);
  const found: Found[] = [];
  let first: Refusal | null = null;
  for (const level of LEVELS) {
    const limit = level * long;
    const walls =
      level === 0
        ? ink
        : ink.map((v, i) => (v && (extent[label[i] as number] as number) > limit ? 1 : 0));
    const result = enclosed(walls, w, h, tap, base);
    if (result === "leak") {
      first ??= "leak";
      break;
    }
    if (result === "none") {
      first ??= "tooSmall";
      continue;
    }
    if (result.area > w * h * MAX_SHARE) {
      first ??= "tooBig";
      break;
    }
    found.push(result);
  }
  const cells = paperCells(ink, w, h);
  const merged = mergedCells(cells, w, h, tap, base);
  if (merged && merged.area <= w * h * MAX_SHARE) found.push(merged);
  const fill = darkFill(gray, tap);
  if (fill && fill.area <= w * h * MAX_SHARE) found.push(fill);
  const regions: Found[] = [];
  for (const f of found
    .filter((f) => f.area >= w * h * MIN_SHARE)
    .sort((a, b) => a.area - b.area)) {
    const last = regions.at(-1);
    if (!last || f.area > last.area * (1 + SAME)) regions.push(f);
  }
  if (!regions.length) return { refused: first ?? "tooSmall" };
  // Offered first: a dark fill under the finger; else the smallest outlined area that is not a
  // texture cell; merged hatching only when no outline holds.
  // A real form is thicker than the gaps of hatching; a thin cell is texture.
  const thin = Math.max(4, long * 0.012);
  const real = (r: Found) =>
    r.area >= w * h * PICK_SHARE &&
    distanceInside(r.mask, w, h).reduce((m, v) => Math.max(m, v), 0) > thin;
  // A form's edge mostly meets open paper; a piece of hatching's edge meets more hatching.
  const bounded = (r: Found) => {
    const ring = dilate(r.mask, w, h, Math.max(3, base * 2));
    let open = 0;
    let texture = 0;
    ring.forEach((v, i) => {
      const c = cells.cell[i] as number;
      if (!v || r.mask[i] || !c) return;
      if ((cells.thick[c] as number) > thin) open++;
      else texture++;
    });
    return texture <= open;
  };
  let pick = regions.findIndex((r) => r.kind === "fill" && real(r));
  if (pick < 0) pick = regions.findIndex((r) => real(r) && bounded(r));
  if (pick < 0) pick = regions.findIndex(real);
  return { regions: regions.map((r) => r.mask), pick: pick < 0 ? regions.length - 1 : pick };
}

/**
 * The form from one or more taps (pixels): each tap's offered candidate, moved `steps[i]`
 * larger or smaller, joined into one area.
 */
export function findForm(
  gray: Gray,
  taps: Pt[],
  steps: number[] = [],
): { mask: Uint8Array } | { refused: Refusal } {
  const { width: w, height: h } = gray;
  let union: Uint8Array | null = null;
  for (const [i, tap] of taps.entries()) {
    const result = formCandidates(gray, tap);
    if (!("regions" in result)) return result;
    const index = Math.min(result.regions.length - 1, Math.max(0, result.pick + (steps[i] ?? 0)));
    const mask = result.regions[index] as Uint8Array;
    union = union ? union.map((v, j) => v | (mask[j] as number)) : mask;
  }
  if (!union) return { refused: "tooSmall" };
  const base = Math.max(2, Math.round(Math.max(w, h) / 300));
  const joined =
    taps.length > 1 ? fillHoles(erode(dilate(union, w, h, base * 3), w, h, base * 3), w, h) : union;
  return { mask: joined };
}

/** Area of a polygon (shoelace). */
function polygonArea(points: Pt[]): number {
  let sum = 0;
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length] as Pt;
    sum += x * ny - nx * y;
  });
  return Math.abs(sum) / 2;
}

/**
 * Round or flat, from the outline: if six corners already describe the outline almost
 * completely (a square, a diamond, a triangle), the form has straight edges and is suggested
 * flat; a circle loses about a sixth of its area to six corners, so curved forms stay round.
 */
export function suggestKind(mask: Uint8Array, w: number, h: number): FormKind {
  const [fine] = traceMask(mask, w, h, 256);
  const [coarse] = traceMask(mask, w, h, 6);
  if (!fine || !coarse) return "round";
  return polygonArea(coarse) / polygonArea(fine) > 0.93 ? "flat" : "round";
}
