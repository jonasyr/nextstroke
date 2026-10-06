import type { CardMeasurements } from "./analyze.ts";

/**
 * What the coach takes from a measured card (Phase 3 Task 2): the user's own line width, the
 * closest spacing that stayed separate on their paper, and whether lines come out clearly
 * wider than the tip (ink spreading into the paper). Relative evidence about this pen on this
 * paper, never a product fact (material-knowledge-base: calibration samples are separate).
 */
export interface CardAdvice {
  lineWidthMm: number;
  /** Closest spacing for hatching and stippling with this pen on this paper, in tenths of a mm. */
  minSpacingMm: number;
  /** Lines clearly wider than the tip; null when the tip or the scale is unknown. */
  spreads: boolean | null;
  /** A second pass over dried ink darkens it noticeably. */
  overdrawDarkens: boolean;
  /** Millimetres rest on a frame that was not about 120 × 80 mm. */
  approximate: boolean;
}

/** Closer than this, hand-drawn lines run together whatever the card says (rules.ts). */
const MIN_HAND_SPACING_MM = 0.5;
/** A line counts as spreading beyond this share over the tip, plus a little for the photo. */
const SPREAD_FACTOR = 1.5;
const SPREAD_SLACK_MM = 0.05;
/** A second pass darkens when its half has at least this much more ink, relatively. */
const DARKENS = 0.15;

const tenth = (v: number) => Math.round(v * 10) / 10;

export function adviceFrom(card: CardMeasurements, tipMm: number | null): CardAdvice {
  const width = card.lineWidthMm;
  const { wide, middle, tight } = card.hatching;
  const separate = [wide, middle, tight]
    .filter((h) => h.separated && h.spacingMm !== null)
    .map((h) => h.spacingMm as number);
  const closest = separate.length ? Math.min(...separate) : null;
  // The closest separate spacing, but never under one and a half line widths; when even the
  // widest field ran together, keep clearly more room than it had.
  const minSpacingMm =
    closest !== null
      ? Math.max(MIN_HAND_SPACING_MM, closest, 1.5 * width)
      : Math.max(MIN_HAND_SPACING_MM, 2 * width, wide.targetMm * 1.25);
  return {
    lineWidthMm: width,
    minSpacingMm: tenth(minSpacingMm),
    spreads:
      tipMm === null || !card.scaleReliable
        ? null
        : width > tipMm * SPREAD_FACTOR + SPREAD_SLACK_MM,
    overdrawDarkens: card.overdraw.twice > card.overdraw.once * (1 + DARKENS),
    approximate: !card.scaleReliable,
  };
}
