import { type Homography, homographyFromPoints, type Point, type Quad } from "./homography.ts";
import type { Layer, View } from "./state.ts";
import { apply, layerMatrix, viewMatrix } from "./transform.ts";

/**
 * Four-point perspective alignment (Phase 2 Task 4). Corners are where the reference's
 * top-left, top-right, bottom-right and bottom-left land on the original, as fractions of the
 * original's width and height (origin top-left).
 */
interface Dimensions {
  width: number;
  height: number;
}

export function cornersFromLayer(layer: Layer, original: Dimensions, reference: Dimensions): Quad {
  const m = layerMatrix(layer, original, reference);
  const toNormalized = (p: Point): Point => {
    const q = apply(m, p);
    return {
      x: (q.x + original.width / 2) / original.width,
      y: (q.y + original.height / 2) / original.height,
    };
  };
  return [
    toNormalized({ x: 0, y: 0 }),
    toNormalized({ x: reference.width, y: 0 }),
    toNormalized({ x: reference.width, y: reference.height }),
    toNormalized({ x: 0, y: reference.height }),
  ];
}

/** Reference pixels → original pixels (top-left origin); null for a folded arrangement. */
export function referenceHomography(
  corners: Quad,
  original: Dimensions,
  reference: Dimensions,
): Homography | null {
  const px = corners.map((c) => ({
    x: c.x * original.width,
    y: c.y * original.height,
  })) as unknown as Quad;
  return homographyFromPoints(
    [
      { x: 0, y: 0 },
      { x: reference.width, y: 0 },
      { x: reference.width, y: reference.height },
      { x: 0, y: reference.height },
    ],
    px,
  );
}

function toScreen(c: Point, view: View, original: Dimensions, viewport: Dimensions): Point {
  const fit = Math.min(viewport.width / original.width, viewport.height / original.height);
  return apply(viewMatrix(view, fit, viewport), {
    x: c.x * original.width - original.width / 2,
    y: c.y * original.height - original.height / 2,
  });
}

/** Viewport CSS pixels → normalized original coordinates. */
export function screenToOriginal(
  p: Point,
  view: View,
  original: Dimensions,
  viewport: Dimensions,
): Point {
  const fit = Math.min(viewport.width / original.width, viewport.height / original.height);
  const s = fit * view.zoom;
  return {
    x: ((p.x - viewport.width / 2 - view.x) / s + original.width / 2) / original.width,
    y: ((p.y - viewport.height / 2 - view.y) / s + original.height / 2) / original.height,
  };
}

export function cornersOnScreen(
  corners: Quad,
  view: View,
  original: Dimensions,
  viewport: Dimensions,
): Point[] {
  return corners.map((c) => toScreen(c, view, original, viewport));
}

export function hitCorner(
  corners: Quad,
  p: Point,
  view: View,
  original: Dimensions,
  viewport: Dimensions,
  radius: number,
): number | null {
  let best: number | null = null;
  let bestDistance = radius;
  cornersOnScreen(corners, view, original, viewport).forEach((s, i) => {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d <= bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

export function moveCorner(corners: Quad, index: number, point: Point): Quad {
  return corners.map((c, i) => (i === index ? point : c)) as unknown as Quad;
}

export function nudgeCorner(
  corners: Quad,
  index: number,
  dx: number,
  dy: number,
  step: number,
): Quad {
  const c = corners[index] as Point;
  return moveCorner(corners, index, {
    x: +(c.x + dx * step).toFixed(6),
    y: +(c.y + dy * step).toFixed(6),
  });
}
