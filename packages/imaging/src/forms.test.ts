import { describe, expect, it } from "vitest";
import { findForm, formCandidates, suggestKind } from "./forms.ts";
import type { Gray } from "./shading.ts";

const W = 240;
const H = 240;

function paper(ink: (x: number, y: number) => boolean, size = W): Gray {
  const data = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) data[y * size + x] = ink(x, y) ? 30 : 235;
  }
  return { width: size, height: size, data };
}

const ring =
  (cx: number, cy: number, r: number, gapFrom = 0, gapTo = 0) =>
  (x: number, y: number) => {
    const a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
    return Math.abs(Math.hypot(x - cx, y - cy) - r) <= 1.5 && !(a >= gapFrom && a < gapTo);
  };
const box = (x0: number, y0: number, x1: number, y1: number) => (x: number, y: number) =>
  x >= x0 &&
  x <= x1 &&
  y >= y0 &&
  y <= y1 &&
  (x - x0 < 3 || x1 - x < 3 || y - y0 < 3 || y1 - y < 3);
/** Short, crossing hatch strokes inside a circle, as on a shaded form. */
const crossHatch = (cx: number, cy: number, r: number) => (x: number, y: number) => {
  if (Math.hypot(x - cx, y - cy) > r - 2) return false;
  const u = (x + y) % 9;
  const v = (x - y + 900) % 9;
  // Strokes 14 px long, broken so they do not form long lines.
  const brokenU = Math.floor((x - y + 900) / 14) % 2 === 0;
  const brokenV = Math.floor((x + y) / 14) % 2 === 0;
  return (u === 0 && brokenU) || (v === 0 && brokenV);
};

const count = (mask: Uint8Array) => mask.reduce((n, v) => n + v, 0);
const disc = (r: number) => Math.PI * r * r;

describe("finding a form from one tap (form v2)", () => {
  it("finds the whole form through hatching inside it", () => {
    // Hatching about 6 px apart on a 480 px image, as on a phone photo of a fineliner drawing.
    const shaded = paper(
      (x, y) => ring(240, 240, 160)(x, y) || crossHatch(240, 240, 160)(x, y),
      480,
    );
    const found = findForm(shaded, [[238, 241]]);
    if (!("mask" in found)) throw new Error(found.refused);
    expect(count(found.mask)).toBeGreaterThan(disc(158) * 0.9);
    expect(count(found.mask)).toBeLessThan(disc(162));
  });

  it("offers nested forms from small to large and starts with the smallest real one", () => {
    const nested = paper((x, y) => box(50, 50, 190, 190)(x, y) || ring(120, 120, 30)(x, y));
    const result = formCandidates(nested, [120, 120]);
    if (!("regions" in result)) throw new Error(result.refused);
    expect(result.regions.length).toBeGreaterThanOrEqual(2);
    const areas = result.regions.map(count);
    expect(areas[result.pick]).toBeLessThan(disc(31));
    expect(Math.max(...areas)).toBeGreaterThan(130 * 130);
    // Each next one is larger.
    for (let i = 1; i < areas.length; i++) expect(areas[i]).toBeGreaterThan(areas[i - 1] as number);
  });

  it("closes a gap in a long outline but refuses a wide opening and the background", () => {
    const gappy = paper(ring(120, 120, 80, 0, 6));
    expect("mask" in findForm(gappy, [[120, 120]])).toBe(true);
    const open = paper(ring(120, 120, 80, -25, 25));
    expect(findForm(open, [[120, 120]])).toEqual({ refused: "leak" });
    expect(findForm(paper(ring(120, 120, 80)), [[3, 3]])).toEqual({ refused: "leak" });
  });

  it("does not grow into the background when only small marks surround the tap", () => {
    // Dots everywhere and no outline: there is no form.
    const dots = paper((x, y) => x % 12 < 2 && y % 12 < 2);
    expect("refused" in findForm(dots, [[60, 60]])).toBe(true);
  });

  it("joins several taps and steps to a larger form on request", () => {
    const nested = paper((x, y) => box(50, 50, 190, 190)(x, y) || ring(120, 120, 30)(x, y));
    const small = findForm(nested, [[120, 120]]);
    const larger = findForm(nested, [[120, 120]], [1]);
    if (!("mask" in small) || !("mask" in larger)) throw new Error("refused");
    expect(count(larger.mask)).toBeGreaterThan(count(small.mask) * 4);
    const clamped = findForm(nested, [[120, 120]], [9]);
    if (!("mask" in clamped)) throw new Error("refused");
    expect(count(clamped.mask)).toBe(count(larger.mask));
  });

  it("takes a blacked-in area under the finger as the form", () => {
    const filled = paper(
      (x, y) => Math.hypot(x - 120, y - 120) < 30 || box(40, 40, 200, 200)(x, y),
    );
    const found = findForm(filled, [[120, 120]]);
    if (!("mask" in found)) throw new Error(found.refused);
    expect(count(found.mask)).toBeGreaterThan(disc(29));
    expect(count(found.mask)).toBeLessThan(disc(33));
  });

  it("suggests flat for straight-edged forms and round for curved ones", () => {
    const square = new Uint8Array(W * H);
    const round = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        square[y * W + x] = x > 40 && x < 200 && y > 60 && y < 180 ? 1 : 0;
        round[y * W + x] = Math.hypot(x - 120, y - 120) < 70 ? 1 : 0;
      }
    }
    const diamond = new Uint8Array(W * H);
    const oval = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        diamond[y * W + x] = Math.abs(x - 120) + Math.abs(y - 120) < 80 ? 1 : 0;
        oval[y * W + x] = ((x - 120) / 90) ** 2 + ((y - 120) / 50) ** 2 < 1 ? 1 : 0;
      }
    }
    expect(suggestKind(square, W, H)).toBe("flat");
    expect(suggestKind(diamond, W, H)).toBe("flat");
    expect(suggestKind(oval, W, H)).toBe("round");
    expect(suggestKind(round, W, H)).toBe("round");
    expect(suggestKind(new Uint8Array(W * H), W, H)).toBe("round");
  });
});
