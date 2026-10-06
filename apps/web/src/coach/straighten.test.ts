import { applyHomography, IMAGE_CORNERS, type Quad } from "@nextstroke/compare";
import { describe, expect, it } from "vitest";
import {
  pairsToQuad,
  quadToPairs,
  straightPointMapper,
  straightSize,
  straightToSource,
} from "./straighten.ts";

const SHEET: Quad = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.15 },
  { x: 0.85, y: 0.9 },
  { x: 0.15, y: 0.85 },
];

describe("straightening the sheet", () => {
  it("keeps the sheet's proportions within the size limit", () => {
    expect(straightSize(IMAGE_CORNERS, 3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(straightSize(IMAGE_CORNERS, 300, 400)).toEqual({ width: 300, height: 400 });
  });

  it("maps the straight view's corners onto the paper corners", () => {
    const size = straightSize(SHEET, 1000, 1000);
    const h = straightToSource(SHEET, 1000, 1000, size);
    if (!h) throw new Error("degenerate");
    const corner = applyHomography(h, { x: size.width, y: size.height });
    expect(corner.x).toBeCloseTo(850);
    expect(corner.y).toBeCloseTo(900);
    const folded: Quad = [SHEET[0], SHEET[2], SHEET[1], SHEET[3]];
    expect(straightToSource(folded, 1000, 1000, size)).toBeNull();
  });

  it("carries marks back to the original and stores corners as pairs", () => {
    const map = straightPointMapper(SHEET);
    if (!map) throw new Error("degenerate");
    expect(map([0, 0])).toEqual([0.1, 0.1]);
    const [x, y] = map([1, 1]);
    expect(x).toBeCloseTo(0.85);
    expect(y).toBeCloseTo(0.9);
    expect(straightPointMapper([SHEET[0], SHEET[0], SHEET[0], SHEET[0]])).toBeNull();
    expect(pairsToQuad(quadToPairs(SHEET))).toEqual(SHEET);
  });
});
