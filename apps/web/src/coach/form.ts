import type { FormTones } from "@nextstroke/coaching";
import type { LightSide } from "@nextstroke/contracts";
import {
  type FormKind,
  formCandidates,
  formTones,
  type Gray,
  joinForms,
  paint,
  type Refusal,
  shadeBands,
  suggestKind,
  traceMask,
} from "@nextstroke/imaging";

/**
 * Form mode (D-073, D-074): accepted taps, how much smaller or larger than offered each tap's
 * form is, hand corrections, and whether the form is round or flat.
 * Points are shares of the straight view's width and height, so they survive a new size.
 */
export type Pt = [number, number];

export interface BrushStroke {
  points: Pt[];
  /** Brush radius as a share of the long side. */
  radius: number;
  value: 0 | 1;
}

export interface FormMarks {
  taps: Pt[];
  /** Per tap: steps from the offered form to a smaller (negative) or larger one. */
  sizes: number[];
  strokes: BrushStroke[];
  /** What was added in which order, for "Rückgängig". */
  steps: ("tap" | "stroke")[];
  kind: FormKind;
}

export const NO_FORM: FormMarks = {
  taps: [],
  sizes: [],
  strokes: [],
  steps: [],
  kind: "round",
};

/** The brush covers this share of the long side: about a fingertip on a phone photo. */
export const BRUSH = 0.03;

type Candidates = ReturnType<typeof formCandidates>;

/** The straight view in gray at the computing size, with each tap's forms once found. */
export interface FormImage {
  gray: Gray;
  found: Map<string, Candidates>;
}

export const formImage = (gray: Gray): FormImage => ({ gray, found: new Map() });

const px = (image: FormImage, [x, y]: Pt): Pt => [
  x * (image.gray.width - 1),
  y * (image.gray.height - 1),
];

/** Applies one brush stroke to a mask. */
export function applyStroke(image: FormImage, mask: Uint8Array, stroke: BrushStroke): Uint8Array {
  const { width: w, height: h } = image.gray;
  const radius = stroke.radius * Math.max(w, h);
  let out = mask;
  const points = stroke.points.length === 1 ? [stroke.points[0], stroke.points[0]] : stroke.points;
  for (let i = 1; i < points.length; i++) {
    out = paint(
      out,
      w,
      h,
      px(image, points[i - 1] as Pt),
      px(image, points[i] as Pt),
      radius,
      stroke.value,
    );
  }
  return out;
}

/** The forms a tap can mean (found once per tap, then remembered). */
function candidatesAt(image: FormImage, tap: Pt): Candidates {
  const key = `${tap[0].toFixed(5)},${tap[1].toFixed(5)}`;
  let found = image.found.get(key);
  if (!found) {
    found = formCandidates(image.gray, px(image, tap));
    image.found.set(key, found);
  }
  return found;
}

/** Which of a tap's forms is shown, given its size steps. */
function chosen(found: Candidates, size: number): { mask: Uint8Array; index: number } | null {
  if (!("regions" in found)) return null;
  const index = Math.min(found.regions.length - 1, Math.max(0, found.pick + size));
  return { mask: found.regions[index] as Uint8Array, index };
}

/** The form's mask: the chosen form of every tap joined, then every hand correction in order. */
export function formMask(image: FormImage, marks: FormMarks): Uint8Array {
  const { width: w, height: h } = image.gray;
  let mask: Uint8Array = new Uint8Array(w * h);
  marks.taps.forEach((tap, i) => {
    const part = chosen(candidatesAt(image, tap), marks.sizes[i] ?? 0);
    if (part) mask = mask.map((v, j) => v | (part.mask[j] as number));
  });
  if (marks.taps.length > 1) mask = joinForms(mask, w, h);
  return marks.strokes.reduce<Uint8Array>((m, stroke) => applyStroke(image, m, stroke), mask);
}

/**
 * Adds a tap when it finds a form; otherwise why not. The first form also suggests round or
 * flat from its outline.
 */
export function addTap(
  image: FormImage,
  marks: FormMarks,
  tap: Pt,
): { marks: FormMarks } | { refused: Refusal } {
  const found = candidatesAt(image, tap);
  if (!("regions" in found)) return found;
  const { width: w, height: h } = image.gray;
  const kind = marks.taps.length
    ? marks.kind
    : suggestKind(found.regions[found.pick] as Uint8Array, w, h);
  return {
    marks: {
      ...marks,
      kind,
      taps: [...marks.taps, tap],
      sizes: [...marks.sizes, 0],
      steps: [...marks.steps, "tap"],
    },
  };
}

/** Whether the last tap's form can get smaller or larger. */
export function sizeRange(
  image: FormImage,
  marks: FormMarks,
): { smaller: boolean; larger: boolean } {
  const tap = marks.taps.at(-1);
  const found = tap ? candidatesAt(image, tap) : null;
  const now = found ? chosen(found, marks.sizes.at(-1) ?? 0) : null;
  if (!found || !now || !("regions" in found)) return { smaller: false, larger: false };
  return { smaller: now.index > 0, larger: now.index < found.regions.length - 1 };
}

/** The last tap's form one step smaller (-1) or larger (+1). */
export function resize(image: FormImage, marks: FormMarks, step: -1 | 1): FormMarks {
  const range = sizeRange(image, marks);
  if ((step < 0 && !range.smaller) || (step > 0 && !range.larger)) return marks;
  const sizes = [...marks.sizes];
  sizes[sizes.length - 1] = (sizes.at(-1) ?? 0) + step;
  return { ...marks, sizes };
}

/** Adds a hand correction. */
export const addStroke = (marks: FormMarks, stroke: BrushStroke): FormMarks => ({
  ...marks,
  strokes: [...marks.strokes, stroke],
  steps: [...marks.steps, "stroke"],
});

/** Removes the last tap or stroke, whichever came last. */
export function undo(marks: FormMarks): FormMarks {
  const last = marks.steps.at(-1);
  const steps = marks.steps.slice(0, -1);
  if (last === "tap") {
    return { ...marks, taps: marks.taps.slice(0, -1), sizes: marks.sizes.slice(0, -1), steps };
  }
  if (last === "stroke") return { ...marks, strokes: marks.strokes.slice(0, -1), steps };
  return marks;
}

export const isEmpty = (mask: Uint8Array) => !mask.includes(1);

/** The form's outline for the coach request: its largest part, normalized; null when empty. */
export function formOutline(image: FormImage, mask: Uint8Array): Pt[] | null {
  const { width: w, height: h } = image.gray;
  const [outline] = traceMask(mask, w, h, 256);
  return outline ? outline.map(([x, y]): Pt => [(x + 0.5) / w, (y + 0.5) / h]) : null;
}

/** A circle around the form, to frame the preview. */
export function formSpot(
  image: FormImage,
  mask: Uint8Array,
): { x: number; y: number; r: number } | null {
  const { width: w, height: h } = image.gray;
  let x0 = w;
  let x1 = -1;
  let y0 = h;
  let y1 = -1;
  mask.forEach((v, i) => {
    if (!v) return;
    const x = i % w;
    const y = (i - x) / w;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });
  if (x1 < 0) return null;
  const r = Math.max(x1 - x0 + 1, y1 - y0 + 1) / 2 / w;
  return { x: (x0 + x1 + 1) / 2 / w, y: (y0 + y1 + 1) / 2 / h, r };
}

/** The form's tone areas for the stroke plan. */
export function tonesFor(
  image: FormImage,
  mask: Uint8Array,
  kind: FormKind,
  light: LightSide,
): FormTones {
  const { width: w, height: h } = image.gray;
  return formTones(shadeBands(mask, w, h, light, kind), w, h);
}
