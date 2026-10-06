import {
  applyHomography,
  type Homography,
  homographyFromPoints,
  IMAGE_CORNERS,
  type Quad,
} from "@nextstroke/compare";

/**
 * Straightening the photographed sheet (Phase 3 Task 5): the paper corners on the original
 * map onto an upright rectangle with the sheet's own proportions. The straight image is a
 * local view, recomputed from the immutable original and the corners; marks made on it are
 * carried back to the original's coordinates for the coach request.
 */

/** Longest edge of the straightened view, in pixels. */
export const STRAIGHT_MAX_EDGE = 1600;

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/** Size of the upright sheet: mean opposite edge lengths in pixels, at most `maxEdge`. */
export function straightSize(
  quad: Quad,
  imageWidth: number,
  imageHeight: number,
  maxEdge = STRAIGHT_MAX_EDGE,
): { width: number; height: number } {
  const px = quad.map((p) => ({ x: p.x * imageWidth, y: p.y * imageHeight }));
  const [tl, tr, br, bl] = px as [(typeof px)[0], (typeof px)[0], (typeof px)[0], (typeof px)[0]];
  const w = (dist(tl, tr) + dist(bl, br)) / 2;
  const h = (dist(tl, bl) + dist(tr, br)) / 2;
  const scale = Math.min(1, maxEdge / Math.max(w, h, 1));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

/** Pixel of the straight view → pixel of the image; null for a folded or degenerate quad. */
export function straightToSource(
  quad: Quad,
  imageWidth: number,
  imageHeight: number,
  size: { width: number; height: number },
): Homography | null {
  const rect: Quad = [
    { x: 0, y: 0 },
    { x: size.width, y: 0 },
    { x: size.width, y: size.height },
    { x: 0, y: size.height },
  ];
  const px = quad.map((p) => ({ x: p.x * imageWidth, y: p.y * imageHeight })) as unknown as Quad;
  return homographyFromPoints(rect, px);
}

/** Normalized point on the straight view → normalized point on the original; null if degenerate. */
export function straightPointMapper(
  quad: Quad,
): ((p: [number, number]) => [number, number]) | null {
  const h = homographyFromPoints(IMAGE_CORNERS, quad);
  if (!h) return null;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return ([x, y]) => {
    const p = applyHomography(h, { x, y });
    return [clamp(p.x), clamp(p.y)];
  };
}

const clampUnit = (v: number) => Math.min(1, Math.max(0, v));

/** Quad as stored in the project: four [x, y] pairs inside the photo. */
export const quadToPairs = (quad: Quad) =>
  quad.map((p) => [clampUnit(p.x), clampUnit(p.y)] as [number, number]) as [
    [number, number],
    [number, number],
    [number, number],
    [number, number],
  ];

export const pairsToQuad = (pairs: readonly (readonly [number, number])[]): Quad =>
  pairs.map(([x, y]) => ({ x, y })) as unknown as Quad;
