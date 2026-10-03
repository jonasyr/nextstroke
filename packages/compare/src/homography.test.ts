import { describe, expect, it } from "vitest";
import {
  applyHomography,
  homographyFromPoints,
  invertHomography,
  type Quad,
} from "./homography.ts";

const square: Quad = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

function close(p: { x: number; y: number }, q: { x: number; y: number }) {
  expect(p.x).toBeCloseTo(q.x, 6);
  expect(p.y).toBeCloseTo(q.y, 6);
}

describe("homography from four point pairs (Task 4, legacy defect D4)", () => {
  it("is the identity for identical quads", () => {
    const h = homographyFromPoints(square, square);
    expect(h).not.toBeNull();
    close(applyHomography(h as number[], { x: 37, y: 61 }), { x: 37, y: 61 });
  });

  it("maps each source corner onto its target corner, including perspective", () => {
    const target: Quad = [
      { x: 10, y: 20 },
      { x: 220, y: 5 },
      { x: 180, y: 160 },
      { x: 30, y: 140 },
    ];
    const h = homographyFromPoints(square, target) as number[];
    square.forEach((corner, i) =>
      close(applyHomography(h, corner), target[i] as { x: number; y: number }),
    );
  });

  it("inverts", () => {
    const target: Quad = [
      { x: 10, y: 20 },
      { x: 220, y: 5 },
      { x: 180, y: 160 },
      { x: 30, y: 140 },
    ];
    const h = homographyFromPoints(square, target) as number[];
    const inv = invertHomography(h) as number[];
    close(applyHomography(inv, applyHomography(h, { x: 42, y: 17 })), { x: 42, y: 17 });
  });

  it("rejects degenerate quads", () => {
    const collinear: Quad = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 100, y: 0 },
      { x: 150, y: 0 },
    ];
    expect(homographyFromPoints(square, collinear)).toBeNull();
    expect(invertHomography([0, 0, 0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it("rejects folded (self-intersecting) targets", () => {
    const folded: Quad = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
    ];
    expect(homographyFromPoints(square, folded)).toBeNull();
  });
});
