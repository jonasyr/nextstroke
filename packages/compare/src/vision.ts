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
