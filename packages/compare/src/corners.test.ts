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

  it("maps chosen reference corners onto chosen original corners", () => {
    const paper = [
      { x: 0.1, y: 0.2 },
      { x: 0.9, y: 0.2 },
      { x: 0.9, y: 0.8 },
      { x: 0.1, y: 0.8 },
    ] as const;
    const target = [
      { x: 0.2, y: 0.1 },
      { x: 0.8, y: 0.15 },
      { x: 0.85, y: 0.9 },
      { x: 0.15, y: 0.85 },
    ] as const;
    const h = referenceHomography(target, original, reference, paper) as number[];
    // reference pixel of the paper's top-left (200, 200) → original (200, 50)
    const p = applyHomography(h, { x: 200, y: 200 });
    expect(p.x).toBeCloseTo(200);
    expect(p.y).toBeCloseTo(50);
  });

  it("starts the original corners from the layer applied to the reference corners", () => {
    const paper = [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.75, y: 0.75 },
      { x: 0.25, y: 0.75 },
    ] as const;
    const guess = cornersFromLayer(
      { x: 0, y: 0, scale: 1, rotationDeg: 0 },
      original,
      reference,
      paper,
    );
    expect(guess[0]?.x).toBeCloseTo(0.25);
    expect(guess[2]?.y).toBeCloseTo(0.75);
  });
});
