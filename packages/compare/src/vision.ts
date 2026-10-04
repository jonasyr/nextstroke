import { applyHomography, type Homography, isConvex, type Point, type Quad } from "./homography.ts";
import { IMAGE_CORNERS } from "./state.ts";

/**
 * Decisions around the opencv.js vision worker (D-055): paper detection and feature
 * homography. opencv.js finds contours and matches; everything that decides whether a result
 * is trusted lives here, pure and tested. Rejected results leave the user's layer untouched.
 */

interface Size {
  width: number;
  height: number;
}

/** Longest edge of the copies the vision worker analyses. */
export const VISION_MAX_EDGE = 1024;

/**
 * Paper detection: the sheet covers at least this much of the image, its 4-gon explains the
 * contour, and it is brighter than a band just outside its edges (gray levels 0–255).
 */
export const PAPER = {
  minAreaFraction: 0.2,
  minFill: 0.9,
  /** Distance of the brightness samples from each edge, as a fraction of the shorter side. */
  band: 0.015,
  minContrast: 24,
  /** Share of the samples on each side that must lie within the image. */
  minSamples: 0.5,
} as const;

/** Feature alignment: Lowe ratio, then RANSAC inliers by count and by share of the matches. */
export const MATCH = {
  ratio: 0.75,
  minInliers: 25,
  minInlierRatio: 0.3,
  /** Area of the mapped reference as a fraction of the original's area. */
  minAreaFraction: 0.05,
  maxAreaFraction: 4,
  /** Mapped corners stay within one image width or height around the original. */
  minCoordinate: -1,
  maxCoordinate: 2,
} as const;

/** Size bounded by `maxEdge`, never enlarged. */
export function workingSize(width: number, height: number, maxEdge = VISION_MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/** Signed shoelace area; positive for clockwise on screen (y down). */
function signedArea(q: readonly Point[]): number {
  let sum = 0;
  q.forEach((a, i) => {
    const b = q[(i + 1) % q.length] as Point;
    sum += a.x * b.y - b.x * a.y;
  });
  return sum / 2;
}

export function quadArea(q: readonly Point[]): number {
  return Math.abs(signedArea(q));
}

/**
 * Four points as top-left, top-right, bottom-right, bottom-left: clockwise on screen around
 * their centroid, starting at the smallest x + y (ties: the higher point).
 */
export function orderCorners(points: readonly Point[]): Quad | null {
  if (points.length !== 4) return null;
  const cx = points.reduce((s, p) => s + p.x, 0) / 4;
  const cy = points.reduce((s, p) => s + p.y, 0) / 4;
  const sorted = [...points].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx),
  );
  let start = 0;
  sorted.forEach((p, i) => {
    const s = sorted[start] as Point;
    if (p.x + p.y < s.x + s.y || (p.x + p.y === s.x + s.y && p.y < s.y)) start = i;
  });
  return [0, 1, 2, 3].map((k) => sorted[(start + k) % 4]) as unknown as Quad;
}

/** A polygon approximated from one outer contour, in pixels of the analysed image. */
export interface PaperCandidate {
  points: readonly Point[];
  contourArea: number;
}

export interface PaperResult {
  /** TL, TR, BR, BL, normalized to the image. */
  corners: Quad;
  /** How well the four corners explain the contour, 0–1. */
  confidence: number;
}

/** Gray level (0–255) at a pixel of the analysed image. */
export type Brightness = (x: number, y: number) => number;

const SAMPLES_PER_EDGE = 16;

/**
 * True when the quad is clearly brighter just inside its edges than just outside. A drawing's
 * dense strokes can form a quad-shaped contour too, but its surroundings are paper, not table.
 */
function brighterThanSurroundings(
  quad: Quad,
  width: number,
  height: number,
  brightness: Brightness,
): boolean {
  const offset = PAPER.band * Math.min(width, height);
  const within = (p: Point) => p.x >= 0 && p.y >= 0 && p.x <= width - 1 && p.y <= height - 1;
  const inner: number[] = [];
  const outer: number[] = [];
  quad.forEach((a, i) => {
    const b = quad[(i + 1) % 4] as Point;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    // Outward normal of a clockwise-on-screen quad.
    const nx = (b.y - a.y) / length;
    const ny = -(b.x - a.x) / length;
    for (let k = 0; k < SAMPLES_PER_EDGE; k++) {
      const t = 0.1 + (0.8 * k) / (SAMPLES_PER_EDGE - 1);
      const p = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
      const pin = { x: p.x - nx * offset, y: p.y - ny * offset };
      const pout = { x: p.x + nx * offset, y: p.y + ny * offset };
      if (within(pin)) inner.push(brightness(Math.round(pin.x), Math.round(pin.y)));
      if (within(pout)) outer.push(brightness(Math.round(pout.x), Math.round(pout.y)));
    }
  });
  const needed = PAPER.minSamples * 4 * SAMPLES_PER_EDGE;
  if (inner.length < needed || outer.length < needed) return false;
  const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  return mean(inner) - mean(outer) >= PAPER.minContrast;
}

/**
 * The largest convex four-sided candidate that covers enough of the image and is brighter than
 * its surroundings; null if none.
 */
export function choosePaper(
  candidates: readonly PaperCandidate[],
  width: number,
  height: number,
  brightness: Brightness,
): PaperResult | null {
  let best: { quad: Quad; area: number; confidence: number } | null = null;
  for (const candidate of candidates) {
    const quad = orderCorners(candidate.points);
    if (!quad || !isConvex(quad)) continue;
    const area = quadArea(quad);
    if (area < PAPER.minAreaFraction * width * height) continue;
    const confidence =
      Math.min(area, candidate.contourArea) / Math.max(area, candidate.contourArea);
    if (confidence < PAPER.minFill) continue;
    if (best && area <= best.area) continue;
    if (!brighterThanSurroundings(quad, width, height, brightness)) continue;
    best = { quad, area, confidence };
  }
  if (!best) return null;
  return {
    corners: best.quad.map((p) => ({ x: p.x / width, y: p.y / height })) as unknown as Quad,
    confidence: best.confidence,
  };
}

export interface Neighbour {
  queryIdx: number;
  trainIdx: number;
  distance: number;
}

/** Lowe's ratio test on k = 2 nearest neighbours. */
export function ratioTest(
  pairs: readonly (readonly Neighbour[])[],
  ratio: number = MATCH.ratio,
): { queryIdx: number; trainIdx: number }[] {
  const kept: { queryIdx: number; trainIdx: number }[] = [];
  for (const [best, second] of pairs) {
    if (best && second && best.distance < ratio * second.distance) {
      kept.push({ queryIdx: best.queryIdx, trainIdx: best.trainIdx });
    }
  }
  return kept;
}

/** RANSAC output: H maps reference working pixels onto original working pixels. */
export interface HomographyEvidence {
  h: Homography | null;
  inliers: number;
  matches: number;
  reference: Size;
  original: Size;
}

export type AlignVerdict =
  | { accepted: true; corners: Quad; confidence: number }
  | {
      accepted: false;
      reason: "no-homography" | "few-inliers" | "low-inlier-ratio" | "degenerate" | "implausible";
    };

/**
 * Accept a feature homography only with enough inliers and a plausible, unfolded result, and
 * express it as where the reference's image corners land on the original (normalized), which
 * the existing four-corner warp renders.
 */
export function acceptHomography(e: HomographyEvidence): AlignVerdict {
  const { h } = e;
  if (h?.length !== 9 || !h.every(Number.isFinite)) {
    return { accepted: false, reason: "no-homography" };
  }
  if (e.inliers < MATCH.minInliers) return { accepted: false, reason: "few-inliers" };
  if (e.matches <= 0 || e.inliers / e.matches < MATCH.minInlierRatio) {
    return { accepted: false, reason: "low-inlier-ratio" };
  }
  const [, , , , , , g, i, j] = h as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const source = IMAGE_CORNERS.map((c) => ({
    x: c.x * e.reference.width,
    y: c.y * e.reference.height,
  }));
  if (source.some((p) => g * p.x + i * p.y + j <= 0)) {
    return { accepted: false, reason: "degenerate" };
  }
  const corners = source.map((p) => {
    const q = applyHomography(h, p);
    return { x: q.x / e.original.width, y: q.y / e.original.height };
  }) as unknown as Quad;
  if (!isConvex(corners) || signedArea(corners) <= 0) {
    return { accepted: false, reason: "degenerate" };
  }
  const area = quadArea(corners);
  const inside = corners.every(
    (c) => Math.min(c.x, c.y) >= MATCH.minCoordinate && Math.max(c.x, c.y) <= MATCH.maxCoordinate,
  );
  if (area < MATCH.minAreaFraction || area > MATCH.maxAreaFraction || !inside) {
    return { accepted: false, reason: "implausible" };
  }
  return { accepted: true, corners, confidence: e.inliers / e.matches };
}

/**
 * Second paper detector for outlines with gaps (D-057): a white board on a white table, or a
 * sheet whose edge leaves the photo. Straight Hough lines, not closed contours: every pair of
 * near-horizontal and near-vertical lines (plus the image border, for a side outside the
 * photo) forms a quad. The score is mean side cover² · √(area share): the paper's edge beats a
 * strong straight stroke inside the drawing, and good cover beats a bigger, poorly backed quad.
 */
export interface HoughLine {
  /** x·cos θ + y·sin θ = ρ, as OpenCV's HoughLines reports it. */
  rho: number;
  theta: number;
}

export const LINES = {
  /** Lines tilted more than this from horizontal or vertical are ignored, degrees. */
  maxTilt: 35,
  /** At most this many lines per direction, strongest first; near-duplicates merged. */
  maxPerDirection: 8,
  duplicateRho: 0.02,
  duplicateTheta: 3,
  minAreaFraction: 0.2,
  maxAreaFraction: 0.98,
  /** Corners may lie this far outside the image, as a fraction of its size. */
  margin: 0.02,
  samples: 40,
  /** Each measured side needs this much edge cover; the sides on average this much. */
  minSideSupport: 0.6,
  minMeanSupport: 0.7,
  /** Assumed cover of an image-border side, which cannot be measured. */
  borderSupport: 0.5,
  /** Confidence factor when a border stands in for a side. */
  borderPenalty: 0.9,
  /** A guess from straight lines is never certain, so the corner step says "Ecken prüfen". */
  maxConfidence: 0.9,
} as const;

/** Whether the (dilated) edge map has an edge at a pixel. */
export type EdgeAt = (x: number, y: number) => boolean;

interface Line extends HoughLine {
  border: boolean;
}

const DEG = Math.PI / 180;

function intersect(a: Line, b: Line): Point | null {
  const det = Math.cos(a.theta) * Math.sin(b.theta) - Math.sin(a.theta) * Math.cos(b.theta);
  if (Math.abs(det) < 1e-6) return null;
  return {
    x: (a.rho * Math.sin(b.theta) - b.rho * Math.sin(a.theta)) / det,
    y: (b.rho * Math.cos(a.theta) - a.rho * Math.cos(b.theta)) / det,
  };
}

function strongest(lines: readonly HoughLine[], size: number): Line[] {
  const kept: Line[] = [];
  for (const l of lines) {
    const duplicate = kept.some(
      (k) =>
        Math.abs(k.rho - l.rho) < LINES.duplicateRho * size &&
        Math.abs(k.theta - l.theta) < LINES.duplicateTheta * DEG,
    );
    if (!duplicate) kept.push({ ...l, border: false });
    if (kept.length === LINES.maxPerDirection) break;
  }
  return kept;
}

/** Share of a side's samples (its ends left out) that lie on an edge. */
function support(a: Point, b: Point, edgeAt: EdgeAt, width: number, height: number): number {
  let hits = 0;
  let inside = 0;
  for (let k = 0; k < LINES.samples; k++) {
    const t = 0.05 + (0.9 * k) / (LINES.samples - 1);
    const x = Math.round(a.x + t * (b.x - a.x));
    const y = Math.round(a.y + t * (b.y - a.y));
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    inside++;
    if (edgeAt(x, y)) hits++;
  }
  return inside ? hits / LINES.samples : 0;
}

export function chooseLineQuad(
  lines: readonly HoughLine[],
  width: number,
  height: number,
  edgeAt: EdgeAt,
): PaperResult | null {
  const tilt = LINES.maxTilt * DEG;
  const folded = (theta: number) => ((theta % Math.PI) + Math.PI) % Math.PI;
  const horizontal = strongest(
    lines.filter((l) => Math.abs(folded(l.theta) - Math.PI / 2) <= tilt),
    height,
  );
  const vertical = strongest(
    lines.filter((l) => folded(l.theta) <= tilt || folded(l.theta) >= Math.PI - tilt),
    width,
  );
  horizontal.push(
    { rho: 0.5, theta: Math.PI / 2, border: true },
    { rho: height - 1.5, theta: Math.PI / 2, border: true },
  );
  vertical.push({ rho: 0.5, theta: 0, border: true }, { rho: width - 1.5, theta: 0, border: true });
  const yAt = (l: Line) => (l.rho - (width / 2) * Math.cos(l.theta)) / Math.sin(l.theta);
  const xAt = (l: Line) => (l.rho - (height / 2) * Math.sin(l.theta)) / Math.cos(l.theta);
  const mx = LINES.margin * width;
  const my = LINES.margin * height;
  let best: { quad: Quad; mean: number; score: number; border: boolean } | null = null;
  for (let i = 0; i < horizontal.length; i++) {
    for (let j = i + 1; j < horizontal.length; j++) {
      const [top, bottom] = [horizontal[i], horizontal[j]].sort(
        (a, b) => yAt(a as Line) - yAt(b as Line),
      ) as [Line, Line];
      for (let k = 0; k < vertical.length; k++) {
        for (let l = k + 1; l < vertical.length; l++) {
          const [left, right] = [vertical[k], vertical[l]].sort(
            (a, b) => xAt(a as Line) - xAt(b as Line),
          ) as [Line, Line];
          const sides = [top, right, bottom, left];
          const corners = [
            intersect(top, left),
            intersect(top, right),
            intersect(bottom, right),
            intersect(bottom, left),
          ];
          if (
            corners.some(
              (c) => !c || c.x < -mx || c.y < -my || c.x > width + mx || c.y > height + my,
            )
          )
            continue;
          const quad = corners as unknown as Quad;
          if (!isConvex(quad)) continue;
          const area = quadArea(quad);
          const fraction = area / (width * height);
          if (fraction < LINES.minAreaFraction || fraction > LINES.maxAreaFraction) continue;
          if (sides.filter((s) => s.border).length > 1) continue;
          const covers = sides.map((side, s) =>
            side.border
              ? LINES.borderSupport
              : support(quad[s] as Point, quad[(s + 1) % 4] as Point, edgeAt, width, height),
          );
          if (covers.some((c, s) => !sides[s]?.border && c < LINES.minSideSupport)) continue;
          const mean = covers.reduce((sum, c) => sum + c, 0) / 4;
          if (mean < LINES.minMeanSupport) continue;
          const score = mean * mean * Math.sqrt(fraction);
          if (best && score <= best.score) continue;
          best = { quad, mean, score, border: sides.some((s) => s.border) };
        }
      }
    }
  }
  if (!best) return null;
  const clampTo = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  return {
    corners: best.quad.map((p) => ({
      x: clampTo(p.x, width) / width,
      y: clampTo(p.y, height) / height,
    })) as unknown as Quad,
    confidence: Math.min(best.mean * (best.border ? LINES.borderPenalty : 1), LINES.maxConfidence),
  };
}
