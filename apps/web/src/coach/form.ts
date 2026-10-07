import type { FormTones } from "@nextstroke/coaching";
import type { LightSide } from "@nextstroke/contracts";
import {
  type FormKind,
  formTones,
  type Gray,
  inkMask,
  paint,
  type Refusal,
  regionFrom,
  shadeBands,
  traceMask,
} from "@nextstroke/imaging";

/**
 * Form mode (D-073): accepted taps, hand corrections and whether the form is round or flat.
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
  strokes: BrushStroke[];
  /** What was added in which order, for "Rückgängig". */
  steps: ("tap" | "stroke")[];
  kind: FormKind;
}

export const NO_FORM: FormMarks = { taps: [], strokes: [], steps: [], kind: "round" };

/** The brush covers this share of the long side: about a fingertip on a phone photo. */
export const BRUSH = 0.03;

/** The straight view in gray at the computing size, and its ink lines. */
export interface FormImage {
  gray: Gray;
  ink: Uint8Array;
}

export const formImage = (gray: Gray): FormImage => ({ gray, ink: inkMask(gray) });

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

/** The form's mask: the area of the accepted taps, then every hand correction in order. */
export function formMask(image: FormImage, marks: FormMarks): Uint8Array {
  const { width: w, height: h } = image.gray;
  let mask: Uint8Array = new Uint8Array(w * h);
  if (marks.taps.length) {
    const region = regionFrom(
      image.ink,
      w,
      h,
      marks.taps.map((t) => px(image, t)),
    );
    if ("mask" in region) mask = region.mask;
  }
  return marks.strokes.reduce<Uint8Array>((m, stroke) => applyStroke(image, m, stroke), mask);
}

/** Adds a tap when it finds an area together with the earlier ones; otherwise why not. */
export function addTap(
  image: FormImage,
  marks: FormMarks,
  tap: Pt,
): { marks: FormMarks } | { refused: Refusal } {
  const { width: w, height: h } = image.gray;
  const region = regionFrom(
    image.ink,
    w,
    h,
    [...marks.taps, tap].map((t) => px(image, t)),
  );
  if (!("mask" in region)) return region;
  return { marks: { ...marks, taps: [...marks.taps, tap], steps: [...marks.steps, "tap"] } };
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
  if (last === "tap") return { ...marks, taps: marks.taps.slice(0, -1), steps };
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
