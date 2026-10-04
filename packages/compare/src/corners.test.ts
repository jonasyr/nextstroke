import { describe, expect, it } from "vitest";
import {
  confirmQuad,
  cornersFromLayer,
  hitCorner,
  nudgeCorner,
  quadThroughCorners,
  REFINE,
  referenceHomography,
  refineCorners,
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

  it("carries the Vorlage's corners into the drawing through an automatic alignment", () => {
    // The whole reference lands on the left half of the original, upright.
    const landed = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 1 },
      { x: 0, y: 1 },
    ] as const;
    const paper = [
      { x: 0.2, y: 0.1 },
      { x: 0.8, y: 0.1 },
      { x: 0.8, y: 0.9 },
      { x: 0.2, y: 0.9 },
    ] as const;
    const carried = quadThroughCorners(paper, landed) ?? [];
    expect(carried[0]?.x).toBeCloseTo(0.1);
    expect(carried[2]?.x).toBeCloseTo(0.4);
    expect(carried[2]?.y).toBeCloseTo(0.9);
    const folded = [landed[0], landed[2], landed[1], landed[3]] as const;
    expect(quadThroughCorners(paper, folded)).toBeNull();
  });

  it("refines placed corners by a small content correction on the warped Vorlage (D-060)", () => {
    const placed = [
      { x: 0.2, y: 0.1 },
      { x: 0.8, y: 0.1 },
      { x: 0.8, y: 0.9 },
      { x: 0.2, y: 0.9 },
    ] as const;
    // The warped Vorlage still sits 2 % too far left: the content match shifts it right.
    const residual = [
      { x: 0.02, y: 0 },
      { x: 1.02, y: 0 },
      { x: 1.02, y: 1 },
      { x: 0.02, y: 1 },
    ] as const;
    const refined = refineCorners(placed, residual) ?? [];
    expect(refined[0]?.x).toBeCloseTo(0.22);
    expect(refined[2]?.x).toBeCloseTo(0.82);
    expect(refined[2]?.y).toBeCloseTo(0.9);
  });

  it("keeps placed corners when the content correction is not small", () => {
    const placed = [
      { x: 0.2, y: 0.1 },
      { x: 0.8, y: 0.1 },
      { x: 0.8, y: 0.9 },
      { x: 0.2, y: 0.9 },
    ] as const;
    const far = REFINE.maxShift + 0.01;
    const jump = [
      { x: far, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ] as const;
    expect(refineCorners(placed, jump)).toBeNull();
    const folded = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ] as const;
    expect(refineCorners(placed, folded, 2)).toBeNull();
  });

  it("moves the rings of a guess onto found corners and flags the rest (D-061)", () => {
    const guess = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ] as const;
    expect(confirmQuad(guess, null, true)).toEqual({ quad: guess, unsure: [] });
    expect(confirmQuad(guess, null, false)).toEqual({ quad: guess, unsure: [0, 1, 2, 3] });
    const found = [{ x: 0.12, y: 0.11 }, null, { x: 0.88, y: 0.9 }, { x: 0.1, y: 0.92 }];
    const { quad, unsure } = confirmQuad(guess, found, false);
    expect(unsure).toEqual([1]);
    expect(quad[0]).toEqual({ x: 0.12, y: 0.11 });
    expect(quad[1]).toEqual(guess[1]);
    // A found corner that would fold the quad is not used.
    const folding = [{ x: 0.95, y: 0.95 }, null, null, null];
    expect(confirmQuad(guess, folding, false).unsure).toEqual([0, 1, 2, 3]);
  });
});
