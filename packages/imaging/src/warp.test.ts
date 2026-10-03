import { describe, expect, it } from "vitest";
import { warpPerspective } from "./warp.ts";

function image(w: number, h: number, fill: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = fill(x, y);
      data.set([v, v, v, 255], (y * w + x) * 4);
    }
  return { data, width: w, height: h };
}

describe("warpPerspective (inverse mapping, bilinear)", () => {
  it("copies an image through the identity", () => {
    const src = image(4, 3, (x, y) => x * 50 + y * 10);
    const out = warpPerspective(src, [1, 0, 0, 0, 1, 0, 0, 0, 1], 4, 3);
    expect([...out.data]).toEqual([...src.data]);
  });

  it("shifts by an integer translation and leaves uncovered pixels transparent", () => {
    const src = image(4, 1, (x) => x * 60);
    // destination → source: x_src = x_dst - 1
    const out = warpPerspective(src, [1, 0, -1, 0, 1, 0, 0, 0, 1], 4, 1);
    expect(out.data[3]).toBe(0); // x=0 maps to -1: outside
    expect(out.data[4]).toBe(0); // x=1 ← x=0 (value 0)
    expect(out.data[8]).toBe(60);
    expect(out.data[7]).toBe(255);
  });

  it("interpolates between pixels", () => {
    const src = image(2, 1, (x) => (x === 0 ? 0 : 200));
    const out = warpPerspective(src, [0.5, 0, 0, 0, 1, 0, 0, 0, 1], 2, 1);
    expect(out.data[4]).toBe(100); // x=1 ← x=0.5
  });
});
