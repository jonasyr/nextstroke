import { describe, expect, it } from "vitest";
import { demoDrawing } from "./demo.ts";

describe("demo pair (D-056)", () => {
  it("draws the same lighthouse every time, inside the unit square", () => {
    const a = demoDrawing(false);
    expect(demoDrawing(false)).toEqual(a);
    expect(a.length).toBeGreaterThan(40);
    for (const s of a) {
      expect(s.points.length).toBeGreaterThan(1);
      for (const p of s.points) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(1);
        expect(p.y).toBeGreaterThan(0);
        expect(p.y).toBeLessThan(1);
      }
    }
  });

  it("gives the hand version wobble and a few differences to find", () => {
    const vorlage = demoDrawing(false);
    const hand = demoDrawing(true);
    expect(demoDrawing(true)).toEqual(hand);
    // One hatched band is missing (fewer hatch lines), one bird is extra.
    const hatches = (s: typeof vorlage) => s.filter((x) => x.width < 0.003).length;
    expect(hatches(hand)).toBeLessThan(hatches(vorlage));
    const birds = (s: typeof vorlage) => s.filter((x) => x.width === 0.003).length;
    expect(birds(hand)).toBe(birds(vorlage) + 1);
    // The first stroke (tower's left side) moved, but only a little.
    const a = vorlage[0]?.points[0] ?? { x: 0, y: 0 };
    const b = hand[0]?.points[0] ?? { x: 0, y: 0 };
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(0);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.01);
  });
});
