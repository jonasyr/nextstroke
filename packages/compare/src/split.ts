import { screenToOriginal } from "./corners.ts";
import { clamp, type View } from "./state.ts";

/**
 * Split comparison (Phase 2 Task 3): the original left of a vertical divider, the reference
 * right of it. The divider is a fraction of the original's width, so it follows pan and zoom.
 */
interface Dimensions {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

/** Screen x (viewport CSS pixels) of the divider. */
export function splitOnScreen(
  split: number,
  view: View,
  original: Dimensions,
  viewport: Dimensions,
): number {
  const fit = Math.min(viewport.width / original.width, viewport.height / original.height);
  return viewport.width / 2 + view.x + (split - 0.5) * original.width * fit * view.zoom;
}

export function splitFromScreen(
  p: Point,
  view: View,
  original: Dimensions,
  viewport: Dimensions,
): number {
  return clamp(screenToOriginal(p, view, original, viewport).x, 0, 1);
}

export function hitSplit(
  split: number,
  p: Point,
  view: View,
  original: Dimensions,
  viewport: Dimensions,
  radius: number,
): boolean {
  return Math.abs(p.x - splitOnScreen(split, view, original, viewport)) <= radius;
}
