import type { CoachIntent, CoachRequest, LightSide, SheetFormat } from "@nextstroke/contracts";
import { t } from "@nextstroke/ui";
import { type FormMarks, NO_FORM } from "./form.ts";

/**
 * The guided flow's state (Phase 3 Task 5): photo, pen and paper, goal, three ideas, steps,
 * check. Pure, so the React screens stay thin; every choice ends in a `CoachRequest`.
 */

export type FlowStep =
  | "photo"
  | "template"
  | "tool"
  | "goal"
  | "ideas"
  | "steps"
  | "checkPhoto"
  | "check";

/** A circle on the photo, normalized to its width (x, r) and height (y). */
export interface Spot {
  x: number;
  y: number;
  r: number;
}

export interface FlowChoices {
  finelinerId: string;
  /** The tip the user draws with, in mm; null for "Weiß ich nicht". */
  tipMm: number | null;
  paperId: string;
  intent: CoachIntent;
  skill: CoachRequest["skill"];
  area: Spot | null;
  protectedSpots: Spot[];
  /** The sheet's format, for the stroke-plan preview (D-071). */
  sheet: SheetFormat;
  /** Where the light comes from in the preview. */
  light: LightSide;
  /** The area as a circle, or as a tapped form (D-073). */
  areaKind: "circle" | "form";
  form: FormMarks;
}

export const DEFAULT_CHOICES: FlowChoices = {
  finelinerId: "generic",
  tipMm: null,
  paperId: "unknown",
  intent: "depth",
  skill: "beginner",
  area: null,
  protectedSpots: [],
  sheet: "A4",
  light: "left",
  areaKind: "circle",
  form: NO_FORM,
};

/** The choices behind a saved request; pens or papers no longer known fall back to "Weiß ich nicht". */
export function choicesFrom(
  request: CoachRequest,
  known: { pens: readonly string[]; papers: readonly string[] },
): FlowChoices {
  return {
    ...DEFAULT_CHOICES,
    intent: request.intent,
    skill: request.skill,
    finelinerId: known.pens.includes(request.finelinerId) ? request.finelinerId : "generic",
    paperId: known.papers.includes(request.paperId) ? request.paperId : "unknown",
    tipMm: request.ownedTipsMm?.[0] ?? null,
    ...(request.sheet ? { sheet: request.sheet } : {}),
    ...(request.light ? { light: request.light } : {}),
  };
}

/** Smallest and default circle size, as a share of the photo's width. */
export const SPOT = { min: 0.04, start: 0.12, max: 0.6 } as const;
export const MAX_PROTECTED = 16;

/** A spot as the polygon the contracts take: 16 points, clamped to the photo, y scaled by aspect. */
export function spotToPolygon(spot: Spot, aspect: number): [number, number][] {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return [clamp(spot.x + spot.r * Math.cos(a)), clamp(spot.y + spot.r * aspect * Math.sin(a))];
  });
}

/**
 * The request for the coach; `aspect` is the marked image's width over its height, and `map`
 * carries its normalized points to the original's (the straight view's corners, D-067).
 */
export function requestFrom(
  choices: FlowChoices,
  aspect: number,
  map: (p: [number, number]) => [number, number] = (p) => p,
  /** A tapped form's outline (D-073); it is the area when the form mode is on. */
  outline: [number, number][] | null = null,
): CoachRequest {
  const polygon = (spot: Spot) => spotToPolygon(spot, aspect).map(map);
  const area =
    choices.areaKind === "form"
      ? outline && outline.length >= 3
        ? outline.map(map)
        : null
      : choices.area && polygon(choices.area);
  return {
    intent: choices.intent,
    skill: choices.skill,
    finelinerId: choices.finelinerId,
    paperId: choices.paperId,
    sheet: choices.sheet,
    light: choices.light,
    ...(choices.tipMm === null ? {} : { ownedTipsMm: [choices.tipMm] }),
    ...(area ? { area } : {}),
    ...(choices.protectedSpots.length ? { protected: choices.protectedSpots.map(polygon) } : {}),
  };
}

/** What a press does on the photo: move the area here, or resize it when pressed on its ring. */
export function pressArea(area: Spot | null, at: { x: number; y: number }, aspect: number) {
  if (area) {
    const d = Math.hypot(at.x - area.x, (at.y - area.y) / aspect);
    if (d <= area.r * 1.25) return { area, resizing: true };
  }
  return { area: { x: at.x, y: at.y, r: SPOT.start }, resizing: false };
}

/** Dragging after a press on the ring: the radius follows the finger. */
export function dragArea(area: Spot, at: { x: number; y: number }, aspect: number): Spot {
  const r = Math.hypot(at.x - area.x, (at.y - area.y) / aspect);
  return { ...area, r: Math.min(SPOT.max, Math.max(SPOT.min, r)) };
}

/** A tap in protection mode adds a protected spot there, or removes the one it hits. */
export function toggleProtected(
  spots: Spot[],
  at: { x: number; y: number },
  aspect: number,
): Spot[] {
  const hit = spots.findIndex((s) => Math.hypot(at.x - s.x, (at.y - s.y) / aspect) <= s.r);
  if (hit >= 0) return spots.filter((_, i) => i !== hit);
  if (spots.length >= MAX_PROTECTED) return spots;
  return [...spots, { x: at.x, y: at.y, r: SPOT.start * 0.6 }];
}

const MONTHS = [
  "Jan.",
  "Feb.",
  "März",
  "Apr.",
  "Mai",
  "Juni",
  "Juli",
  "Aug.",
  "Sep.",
  "Okt.",
  "Nov.",
  "Dez.",
];

/** "5. Okt." */
export function shortDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getUTCDate()}. ${MONTHS[date.getUTCMonth()]}`;
}

/** "Projekt vom 5. Okt." */
export function defaultTitle(iso: string): string {
  return t("guided.projectTitle", { date: shortDate(iso) });
}

/** Tip sizes from the maker's list, as numbers, ascending; empty when unknown. */
export function tipChoices(tipSizesMm: string | number | boolean | null | undefined): number[] {
  if (typeof tipSizesMm !== "string") return [];
  return tipSizesMm
    .split(",")
    .map(Number)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
}

export const mmLabel = (mm: number) => String(mm).replace(".", ",");
