import type { Quad } from "@nextstroke/compare";
import { warpPerspective } from "@nextstroke/imaging";
import type { CoachDeps } from "./deps.ts";
import { straightPointMapper, straightSize, straightToSource } from "./straighten.ts";

export interface Straight {
  bitmap: ImageBitmap;
  /** Normalized point on the straight view → normalized point on the photo. */
  map: (p: [number, number]) => [number, number];
}

/**
 * The upright sheet from a photo and its corners, computed locally; null when the corners do
 * not form a sheet. A checkpoint passes the original's size so both views line up.
 */
export async function straightView(
  deps: Pick<CoachDeps, "rgba" | "fromRgba">,
  image: ImageBitmap,
  quad: Quad,
  size = straightSize(quad, image.width, image.height),
): Promise<Straight | null> {
  const toSource = straightToSource(quad, image.width, image.height, size);
  const map = straightPointMapper(quad);
  if (!toSource || !map) return null;
  const pixels = warpPerspective(deps.rgba(image), toSource, size.width, size.height);
  return { bitmap: await deps.fromRgba(pixels), map };
}
