import { describe, expect, it } from "vitest";
import { hitSplit, splitFromScreen, splitOnScreen } from "./split.ts";

const original = { width: 1000, height: 500 };
const viewport = { width: 400, height: 200 };
const view = { zoom: 1, x: 0, y: 0 };

describe("split divider", () => {
  it("sits at its fraction of the original's width on screen", () => {
    // fit = 0.4, the original spans x 0..400
    expect(splitOnScreen(0.5, view, original, viewport)).toBeCloseTo(200);
    expect(splitOnScreen(0.25, { zoom: 2, x: 10, y: 0 }, original, viewport)).toBeCloseTo(10);
  });

  it("follows a screen point and stays on the original", () => {
    expect(splitFromScreen({ x: 100, y: 50 }, view, original, viewport)).toBeCloseTo(0.25);
    expect(splitFromScreen({ x: -50, y: 50 }, view, original, viewport)).toBe(0);
    expect(splitFromScreen({ x: 999, y: 50 }, view, original, viewport)).toBe(1);
  });

  it("is hit within the touch radius at any height", () => {
    expect(hitSplit(0.5, { x: 220, y: 5 }, view, original, viewport, 28)).toBe(true);
    expect(hitSplit(0.5, { x: 240, y: 100 }, view, original, viewport, 28)).toBe(false);
  });
});
