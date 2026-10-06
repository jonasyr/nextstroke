/**
 * The test card (Phase 3 Task 2, D-028, material-knowledge-base §Calibration card): a frame
 * of about 120 × 80 mm drawn by hand on the user's own paper, split into 4 × 2 fields. No
 * printer is needed; a ruler helps but is not required, so millimetres are approximate.
 */

export const CARD_MM = { width: 120, height: 80 } as const;
export const COLUMNS = 4;
export const ROWS = 2;

export type CellKind =
  | "line"
  | "hatchWide"
  | "hatchMiddle"
  | "hatchTight"
  | "cross"
  | "stipple"
  | "overdraw"
  | "blank";

/** Fields in reading order: top row left to right, then the bottom row. */
export const CELLS: readonly CellKind[] = [
  "line",
  "hatchWide",
  "hatchMiddle",
  "hatchTight",
  "cross",
  "stipple",
  "overdraw",
  "blank",
];

/** The spacing the user is asked to draw, in mm; the tight field is "as tight as you can". */
export const HATCH_TARGET_MM: Partial<Record<CellKind, number>> = {
  hatchWide: 2,
  hatchMiddle: 1,
  hatchTight: 0.5,
};

/** Share of a field kept clear on every side, so hand-drawn frame lines are not measured. */
export const INSET = 0.2;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The measured part of field `index` in an image of the straightened card, in pixels. */
export function cellRect(index: number, width: number, height: number): Rect {
  const col = index % COLUMNS;
  const row = Math.floor(index / COLUMNS);
  const w = width / COLUMNS;
  const h = height / ROWS;
  return {
    x: Math.round(col * w + w * INSET),
    y: Math.round(row * h + h * INSET),
    width: Math.round(w * (1 - 2 * INSET)),
    height: Math.round(h * (1 - 2 * INSET)),
  };
}
