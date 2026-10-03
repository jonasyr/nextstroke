import { describe, expect, it } from "vitest";
import { apply, fitScale, layerMatrix, multiply, viewMatrix } from "./transform.ts";

describe("render transforms", () => {
  it("fits the original into the viewport", () => {
    expect(fitScale({ width: 400, height: 800 }, { width: 2000, height: 1000 })).toBe(0.2);
  });

  it("maps the original's centre to the viewport centre plus the view offset", () => {
    const m = viewMatrix({ zoom: 2, x: 10, y: -5 }, 0.2, { width: 400, height: 800 });
    expect(apply(m, { x: 0, y: 0 })).toEqual({ x: 210, y: 395 });
    expect(apply(m, { x: 100, y: 0 }).x).toBeCloseTo(250);
  });

  it("places the reference at the original's width, then moves, rotates and scales it", () => {
    const original = { width: 1000, height: 500 };
    const identity = layerMatrix({ x: 0, y: 0, scale: 1, rotationDeg: 0 }, original, {
      width: 2000,
      height: 1000,
    });
    expect(apply(identity, { x: 2000, y: 1000 })).toEqual({ x: 500, y: 250 });
    const moved = layerMatrix({ x: 0.1, y: 0, scale: 2, rotationDeg: 90 }, original, {
      width: 1000,
      height: 500,
    });
    const p = apply(moved, { x: 1000, y: 250 }); // right-middle of the reference
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(1000);
  });

  it("composes matrices like canvas transforms", () => {
    const a = { a: 2, b: 0, c: 0, d: 2, e: 1, f: 1 };
    const b = { a: 1, b: 0, c: 0, d: 1, e: 3, f: 4 };
    expect(apply(multiply(a, b), { x: 0, y: 0 })).toEqual({ x: 7, y: 9 });
  });
});
