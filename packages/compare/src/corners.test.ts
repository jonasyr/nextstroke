import { describe, expect, it } from "vitest";
import {
  cornersFromLayer,
  hitCorner,
  nudgeCorner,
  referenceHomography,
  screenToOriginal,
} from "./corners.ts";
import { applyHomography } from "./homography.ts";

const original = { width: 1000, height: 500 };
const reference = { width: 2000, height: 1000 };

describe("perspective corners", () => {
  it("start from the current affine layer, normalized to the original", () => {
    const corners = cornersFromLayer({ x: 0, y: 0, scale: 1, rotationDeg: 0 }, original, reference);
    expect(corners.map((c) => [+c.x.toFixed(6), +c.y.toFixed(6)])).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
    const moved = cornersFromLayer({ x: 0.1, y: 0, scale: 1, rotationDeg: 0 }, original, reference);
    expect(moved[0]?.x).toBeCloseTo(0.1);
  });

  it("maps reference pixels onto the original through the corners", () => {
    const corners = cornersFromLayer({ x: 0, y: 0, scale: 1, rotationDeg: 0 }, original, reference);
    const h = referenceHomography(corners, original, reference);
    const p = applyHomography(h as number[], { x: 2000, y: 1000 });
    expect(p.x).toBeCloseTo(1000);
    expect(p.y).toBeCloseTo(500);
  });

  it("refuses a folded corner arrangement", () => {
    const folded = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ] as const;
    expect(referenceHomography(folded, original, reference)).toBeNull();
  });

  it("converts screen points to normalized original coordinates", () => {
    const view = { zoom: 1, x: 0, y: 0 };
    const viewport = { width: 400, height: 200 };
    // fit = 0.4; the original's centre sits at the viewport centre (200, 100)
    expect(screenToOriginal({ x: 200, y: 100 }, view, original, viewport)).toEqual({
      x: 0.5,
      y: 0.5,
    });
    expect(screenToOriginal({ x: 0, y: 0 }, view, original, viewport)).toEqual({ x: 0, y: 0 });
  });

  it("finds the nearest corner within the touch radius", () => {
    const view = { zoom: 1, x: 0, y: 0 };
    const viewport = { width: 400, height: 200 };
    const corners = cornersFromLayer({ x: 0, y: 0, scale: 1, rotationDeg: 0 }, original, reference);
    expect(hitCorner(corners, { x: 395, y: 5 }, view, original, viewport, 22)).toBe(1);
    expect(hitCorner(corners, { x: 200, y: 100 }, view, original, viewport, 22)).toBeNull();
  });

  it("nudges one corner by a step", () => {
    const corners = cornersFromLayer({ x: 0, y: 0, scale: 1, rotationDeg: 0 }, original, reference);
    const next = nudgeCorner(corners, 2, 1, -1, 0.01);
    expect(next[2]).toEqual({ x: 1.01, y: 0.99 });
    expect(next[0]).toEqual(corners[0]);
  });
});
