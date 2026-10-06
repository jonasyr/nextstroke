import type { CSSProperties } from "react";

/**
 * A photo canvas keeps its proportions and stays at most about 60 % of the screen high, so the
 * text and buttons below it remain visible on a small iPhone (iPhone test, 2026-10-06).
 */
export const photoStyle = (aspect: number): CSSProperties => ({
  aspectRatio: String(aspect),
  maxWidth: `min(100%, calc(60svh * ${aspect.toFixed(4)}))`,
});
