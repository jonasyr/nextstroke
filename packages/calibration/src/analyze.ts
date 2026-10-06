import { at, type GrayImage, median, quantile } from "./gray.ts";
import { CARD_MM, CELLS, type CellKind, cellRect, HATCH_TARGET_MM, type Rect } from "./layout.ts";

/**
 * Relative measurements from a photo of the test card, straightened so the drawn frame fills
 * the image (Phase 3 Task 2). Everything is relative to the blank field and the darkest ink on
 * the card; nothing is an absolute colour or density (D-028). Millimetres come from the frame
 * size and are approximate.
 */

/** Why a photo cannot be measured; the user is told and can retake it or skip the card. */
export type Problem =
  | { kind: "resolution" }
  | { kind: "light" }
  | { kind: "contrast" }
  | { kind: "blur" }
  | { kind: "empty"; cell: number };

export interface Hatching {
  /** The spacing the user was asked for, in mm. */
  targetMm: number;
  /** Measured distance between lines, in mm; null when the lines ran together. */
  spacingMm: number | null;
  /** Whether light paper still shows between the lines. */
  separated: boolean;
  /** Share of ink in the field, 0 (paper) to 1 (solid ink). */
  tone: number;
}

export interface CardMeasurements {
  pxPerMm: number;
  /** False when the frame's proportions differ clearly from 120 × 80 mm. */
  scaleReliable: boolean;
  lineWidthMm: number;
  hatching: { wide: Hatching; middle: Hatching; tight: Hatching };
  crossTone: number;
  stippleTone: number;
  overdraw: { once: number; twice: number };
  /** Paper texture: spread of the blank field relative to the ink contrast. */
  paperTexture: number;
  /** Darkest field's paper over the brightest's; 1 is perfectly even light. */
  lightEvenness: number;
}

export type CardResult = { ok: true; card: CardMeasurements } | { ok: false; problems: Problem[] };

/** Below this many pixels per millimetre a fine line is only a pixel or two wide. */
export const MIN_PX_PER_MM = 8;
/** Paper in the dimmest field must be at least this share of the brightest. */
export const MIN_EVENNESS = 0.8;
/** Ink must be at least this much darker than paper, as a share of the paper level. */
export const MIN_CONTRAST = 0.3;
/** An edge spread over more than this (mm, 10 % → 90 %) means the photo is blurred. */
export const MAX_EDGE_MM = 0.3;
/** A field with less ink than this was left empty. */
export const MIN_TONE = 0.02;
/** Gap between lines, as a share of the lines' darkness, that still counts as separate. */
export const SEPARATION = 0.35;
/** Allowed deviation of the frame's proportions from 3 : 2 before mm are called unreliable. */
export const ASPECT_TOLERANCE = 0.15;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

interface Levels {
  paper: number;
  ink: number;
}

/** Ink share of one pixel: 0 at paper level, 1 at the darkest ink. */
const toneAt = (img: GrayImage, x: number, y: number, l: Levels) =>
  clamp01((l.paper - at(img, x, y)) / (l.paper - l.ink));

function meanTone(img: GrayImage, r: Rect, l: Levels): number {
  let sum = 0;
  for (let y = r.y; y < r.y + r.height; y++) {
    for (let x = r.x; x < r.x + r.width; x++) sum += toneAt(img, x, y, l);
  }
  return sum / (r.width * r.height);
}

/** Runs of ink (tone above `threshold`) along a scan line, with their start and length. */
function runs(tones: number[], threshold: number): { start: number; length: number }[] {
  const found: { start: number; length: number }[] = [];
  let start = -1;
  tones.forEach((t, i) => {
    if (t > threshold && start < 0) start = i;
    if (t <= threshold && start >= 0) {
      found.push({ start, length: i - start });
      start = -1;
    }
  });
  if (start >= 0) found.push({ start, length: tones.length - start });
  return found;
}

/** 10 % → 90 % of `peak` on the leading edge of a run, in pixels. */
function riseAt(tones: number[], start: number, peak: number): number | null {
  let lo = start;
  while (lo > 0 && (tones[lo] ?? 0) > 0.1 * peak) lo--;
  let hi = start;
  while (hi < tones.length - 1 && (tones[hi] ?? 0) < 0.9 * peak) hi++;
  if ((tones[hi] ?? 0) < 0.9 * peak || (tones[lo] ?? 1) > 0.1 * peak) return null;
  return hi - lo;
}

/**
 * Width of the single lines in the line field: vertical runs across the horizontal line and
 * horizontal runs across the vertical one; long runs (the crossing line) are left out.
 */
function lineWidth(img: GrayImage, r: Rect, l: Levels) {
  const widths: number[] = [];
  const rises: number[] = [];
  const scan = (count: number, length: number, tone: (i: number, j: number) => number) => {
    for (let i = 0; i < count; i++) {
      const tones = Array.from({ length }, (_, j) => tone(i, j));
      // Full width at half the line's own darkness, so a lighter ink measures the same.
      const peak = Math.max(...tones);
      if (peak < 0.3) continue;
      const found = runs(tones, peak / 2);
      if (found.length !== 1) continue;
      const [run] = found as [{ start: number; length: number }];
      if (run.length > length * 0.3) continue;
      // Area under the profile over its height: sub-pixel, and the same for soft edges.
      let area = 0;
      for (
        let j = Math.max(0, run.start - 3);
        j < Math.min(length, run.start + run.length + 3);
        j++
      ) {
        area += tones[j] ?? 0;
      }
      widths.push(area / peak);
      const rise = riseAt(tones, run.start, peak);
      if (rise !== null) rises.push(rise);
    }
  };
  scan(r.width, r.height, (i, j) => toneAt(img, r.x + i, r.y + j, l));
  scan(r.height, r.width, (i, j) => toneAt(img, r.x + j, r.y + i, l));
  return { width: median(widths), rise: median(rises) };
}

/**
 * Horizontal hatching: the vertical tone profile, in narrow strips so a slightly sloped hand
 * line does not smear it. Lines are profile peaks; they are separate when the valleys between
 * them come back towards paper.
 */
function hatching(img: GrayImage, r: Rect, l: Levels, pxPerMm: number, targetMm: number): Hatching {
  const stripWidth = Math.max(3, Math.round(3 * pxPerMm));
  const spacings: number[] = [];
  const depths: number[] = [];
  for (let sx = r.x; sx + stripWidth <= r.x + r.width; sx += stripWidth) {
    const profile = Array.from({ length: r.height }, (_, j) => {
      let sum = 0;
      for (let x = sx; x < sx + stripWidth; x++) sum += toneAt(img, x, r.y + j, l);
      return sum / stripWidth;
    });
    const peaks: number[] = [];
    for (let j = 1; j < profile.length - 1; j++) {
      const p = profile[j] as number;
      if (p > 0.3 && p >= (profile[j - 1] as number) && p > (profile[j + 1] as number)) {
        if (peaks.length && j - (peaks.at(-1) as number) < 0.15 * pxPerMm) continue;
        peaks.push(j);
      }
    }
    for (let k = 1; k < peaks.length; k++) {
      const a = peaks[k - 1] as number;
      const b = peaks[k] as number;
      const valley = Math.min(...profile.slice(a, b + 1));
      const top = Math.min(profile[a] as number, profile[b] as number);
      spacings.push(b - a);
      depths.push((top - valley) / top);
    }
  }
  const depth = median(depths);
  const spacing = median(spacings);
  const separated = depth !== null && depth >= SEPARATION;
  return {
    targetMm,
    spacingMm: separated && spacing !== null ? spacing / pxPerMm : null,
    separated,
    tone: meanTone(img, r, l),
  };
}

/** Measures a straightened card; `frameAspect` is the frame's width over height in the photo. */
export function analyzeCard(img: GrayImage, frameAspect: number): CardResult {
  const pxPerMm = Math.min(img.width / CARD_MM.width, img.height / CARD_MM.height);
  if (pxPerMm < MIN_PX_PER_MM) return { ok: false, problems: [{ kind: "resolution" }] };
  const rects = CELLS.map((_, i) => cellRect(i, img.width, img.height));
  const index = (kind: CellKind) => CELLS.indexOf(kind);
  const rect = (kind: CellKind) => rects[index(kind)] as Rect;

  // Light: paper level of every field that is mostly paper (a field drawn solid shows none).
  // The blank field sets the paper reference; the darkest ink on the card the other end.
  const paper = quantile(img, rect("blank"), 0.5);
  const ink = Math.min(...rects.map((r) => quantile(img, r, 0.005)));
  const papers = rects
    .map((r) => ({ bright: quantile(img, r, 0.98), middle: quantile(img, r, 0.5) }))
    .filter((p) => p.middle > (paper + ink) / 2)
    .map((p) => p.bright);
  const evenness = Math.min(...papers) / Math.max(...papers);
  const problems: Problem[] = [];
  if (evenness < MIN_EVENNESS) problems.push({ kind: "light" });
  if ((paper - ink) / paper < MIN_CONTRAST) problems.push({ kind: "contrast" });
  if (problems.length) return { ok: false, problems };
  const levels = { paper, ink };

  CELLS.forEach((kind, i) => {
    // The line field holds two thin lines; it counts as empty when no line is found below.
    if (kind === "blank" || kind === "line") return;
    if (meanTone(img, rects[i] as Rect, levels) < MIN_TONE) {
      problems.push({ kind: "empty", cell: i });
    }
  });
  const line = lineWidth(img, rect("line"), levels);
  if (line.width === null) problems.unshift({ kind: "empty", cell: index("line") });
  if (line.rise !== null && line.rise / pxPerMm > MAX_EDGE_MM) problems.push({ kind: "blur" });
  if (problems.length || line.width === null) return { ok: false, problems };

  const hatch = (kind: CellKind) =>
    hatching(img, rect(kind), levels, pxPerMm, HATCH_TARGET_MM[kind] ?? 1);
  const over = rect("overdraw");
  const half = Math.floor(over.width / 2);
  const blank = rect("blank");
  const spread = quantile(img, blank, 0.9) - quantile(img, blank, 0.1);
  return {
    ok: true,
    card: {
      pxPerMm,
      scaleReliable:
        Math.abs(frameAspect / (CARD_MM.width / CARD_MM.height) - 1) <= ASPECT_TOLERANCE,
      lineWidthMm: line.width / pxPerMm,
      hatching: {
        wide: hatch("hatchWide"),
        middle: hatch("hatchMiddle"),
        tight: hatch("hatchTight"),
      },
      crossTone: meanTone(img, rect("cross"), levels),
      stippleTone: meanTone(img, rect("stipple"), levels),
      overdraw: {
        once: meanTone(img, { ...over, width: half }, levels),
        twice: meanTone(img, { ...over, x: over.x + half, width: over.width - half }, levels),
      },
      paperTexture: spread / (paper - ink),
      lightEvenness: evenness,
    },
  };
}
