import { confirmQuad, type Point, type Quad, snappedBefore } from "@nextstroke/compare";
import type { VisionDeps } from "../compare/visionClient.ts";

/**
 * Paper corners for the guided photo, with the same rules as Quick Compare (D-061): a sure
 * guess is taken, an unsure one is checked per corner and the rest flagged; a dropped ring snaps
 * onto a clear corner nearby, but not back onto a spot the user dragged it away from (D-062).
 */

/** Below this confidence the rings are checked one by one (as in Quick Compare). */
export const SURE = 0.95;

/** Where the rings start when no sheet is found: just inside the photo's corners. */
export const INSET_CORNERS: Quad = [
  { x: 0.06, y: 0.06 },
  { x: 0.94, y: 0.06 },
  { x: 0.94, y: 0.94 },
  { x: 0.06, y: 0.94 },
];

export interface Guess {
  quad: Quad;
  /** Ring indices to check. */
  unsure: number[];
  found: boolean;
}

export async function guessCorners(vision: VisionDeps | null, image: ImageBitmap): Promise<Guess> {
  const none = { quad: INSET_CORNERS, unsure: [], found: false };
  if (!vision) return none;
  try {
    if (!(await vision.load()).ok) return none;
    const paper = await vision.detectPaper(image);
    if (!paper) return none;
    const sure = paper.confidence >= SURE;
    const found = sure ? null : await vision.corners(image, paper.corners, [0, 1, 2, 3]);
    return { ...confirmQuad(paper.corners, found, sure), found: true };
  } catch {
    return none;
  }
}

/** The corner a dropped ring snaps to, or null; `earlier` holds this ring's past snaps. */
export async function snapCorner(
  vision: VisionDeps | null,
  image: ImageBitmap,
  quad: Quad,
  index: number,
  earlier: readonly Point[],
): Promise<Point | null> {
  if (!vision) return null;
  try {
    const [found] = (await vision.corners(image, quad, [index])) ?? [];
    return found && !snappedBefore(found, earlier) ? found : null;
  } catch {
    return null;
  }
}
