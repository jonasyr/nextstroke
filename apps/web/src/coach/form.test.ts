import { describe, expect, it } from "vitest";
import {
  addStroke,
  addTap,
  BRUSH,
  formImage,
  formMask,
  formOutline,
  formSpot,
  isEmpty,
  NO_FORM,
  resize,
  sizeRange,
  tonesFor,
  undo,
} from "./form.ts";

const W = 200;
const H = 100;

/** A ring drawn on white paper: a closed form on the left, the right half empty. */
function drawing() {
  const data = new Uint8Array(W * H).fill(235);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (Math.abs(Math.hypot(x - 50, y - 50) - 30) <= 1.5) data[y * W + x] = 30;
    }
  }
  return formImage({ width: W, height: H, data });
}

describe("form mode (D-073)", () => {
  const image = drawing();

  it("adds a tap that finds a form and refuses one that leaks", () => {
    const added = addTap(image, NO_FORM, [0.25, 0.5]);
    if (!("marks" in added)) throw new Error(added.refused);
    expect(added.marks.taps).toHaveLength(1);
    expect(addTap(image, added.marks, [0.8, 0.5])).toEqual({ refused: "leak" });
    const mask = formMask(image, added.marks);
    expect(mask[50 * W + 50]).toBe(1);
    expect(mask[50 * W + 150]).toBe(0);
    expect(formMask(image, NO_FORM).includes(1)).toBe(false);
  });

  it("paints and erases by hand, and undoes the last step", () => {
    const painted = {
      ...NO_FORM,
      strokes: [
        {
          points: [
            [0.7, 0.5],
            [0.9, 0.5],
          ] as [number, number][],
          radius: BRUSH,
          value: 1 as const,
        },
      ],
    };
    const mask = formMask(image, painted);
    expect(mask[50 * W + 160]).toBe(1);
    expect(isEmpty(mask)).toBe(false);
    const dot = {
      ...painted,
      strokes: [{ points: [[0.5, 0.5]] as [number, number][], radius: BRUSH, value: 1 as const }],
    };
    expect(formMask(image, dot)[50 * W + 100]).toBe(1);
    const tapped = addTap(image, NO_FORM, [0.25, 0.5]);
    if (!("marks" in tapped)) throw new Error("refused");
    const erased = addStroke(tapped.marks, {
      points: [[0.25, 0.5]],
      radius: BRUSH,
      value: 0,
    });
    expect(formMask(image, erased)[50 * W + 50]).toBe(0);
    const once = undo(erased);
    expect(once.strokes).toHaveLength(0);
    expect(once.taps).toHaveLength(1);
    expect(undo(once).taps).toHaveLength(0);
    expect(undo(NO_FORM)).toBe(NO_FORM);
  });

  it("gives the outline, a frame and tone areas for the plan", () => {
    const marks = { ...NO_FORM, taps: [[0.25, 0.5]] as [number, number][] };
    const mask = formMask(image, marks);
    const outline = formOutline(image, mask);
    expect(outline?.length).toBeGreaterThan(8);
    expect(Math.max(...(outline ?? []).map((p) => p[0]))).toBeLessThan(0.41);
    expect(formOutline(image, new Uint8Array(W * H))).toBeNull();
    const spot = formSpot(image, mask);
    expect(spot?.x).toBeCloseTo(0.25, 1);
    expect(spot?.r).toBeCloseTo(0.15, 1);
    expect(formSpot(image, new Uint8Array(W * H))).toBeNull();
    const round = tonesFor(image, mask, "round", "left");
    expect(round.core.length).toBeGreaterThan(0);
    expect(tonesFor(image, mask, "flat", "left").core).toHaveLength(0);
  });

  it("steps a tap's form smaller or larger, and suggests flat for a square (D-074)", () => {
    // A square frame with a small ring inside: the ring first, the square one step larger.
    const size = 200;
    const data = new Uint8Array(size * size).fill(235);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const frame =
          x >= 50 && x <= 150 && y >= 50 && y <= 150 && (x < 53 || x > 147 || y < 53 || y > 147);
        if (frame || Math.abs(Math.hypot(x - 100, y - 100) - 20) <= 1.5) data[y * size + x] = 30;
      }
    }
    const nested = formImage({ width: size, height: size, data });
    const added = addTap(nested, NO_FORM, [0.5, 0.5]);
    if (!("marks" in added)) throw new Error(added.refused);
    expect(added.marks.kind).toBe("round");
    expect(sizeRange(nested, added.marks)).toEqual({ smaller: false, larger: true });
    const small = formMask(nested, added.marks).reduce((n, v) => n + v, 0);
    const larger = resize(nested, added.marks, 1);
    expect(larger.sizes).toEqual([1]);
    expect(formMask(nested, larger).reduce((n, v) => n + v, 0)).toBeGreaterThan(small * 4);
    expect(resize(nested, larger, 1)).toBe(larger);
    expect(resize(nested, larger, -1).sizes).toEqual([0]);
    expect(resize(nested, NO_FORM, 1)).toBe(NO_FORM);
    expect(undo(larger).sizes).toEqual([]);
    // Tapping between ring and frame: the square, suggested flat.
    const square = addTap(nested, NO_FORM, [0.5, 0.3]);
    if (!("marks" in square)) throw new Error(square.refused);
    expect(square.marks.kind).toBe("flat");
  });
});
