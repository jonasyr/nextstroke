import { describe, expect, it } from "vitest";
import { autoAlign, correlationCost, type Gray } from "./autoAlign.ts";

function pattern(w: number, h: number, dx = 0, dy = 0): Gray {
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x - dx;
      const v = y - dy;
      data[y * w + x] =
        0.5 +
        0.25 * Math.sin(u / 4) * Math.cos(v / 5) +
        (Math.hypot(u - 50, v - 35) < 12 ? 0.25 : 0);
    }
  return { data, width: w, height: h };
}

describe("auto-align (legacy V6)", () => {
  it("scores an identical image as perfect and a shifted one worse", () => {
    const a = pattern(100, 70);
    expect(correlationCost(a, a, { x: 0, y: 0, scale: 1, rotationDeg: 0 })).toBeCloseTo(0, 5);
    expect(
      correlationCost(a, pattern(100, 70, 6, 0), { x: 0, y: 0, scale: 1, rotationDeg: 0 }),
    ).toBeGreaterThan(0.05);
  });

  it("recovers a translation", async () => {
    const result = await autoAlign(pattern(100, 70), pattern(100, 70, -5, 3), {
      x: 0,
      y: 0,
      scale: 1,
      rotationDeg: 0,
    });
    expect(result.accepted).toBe(true);
    expect(result.transform.x).toBeCloseTo(5, 0);
    expect(result.transform.y).toBeCloseTo(-3, 0);
  });

  it("rejects unrelated images instead of moving the layer", async () => {
    const noise: Gray = {
      data: new Float32Array(100 * 70).map((_, i) => ((i * 7919) % 97) / 97),
      width: 100,
      height: 70,
    };
    const result = await autoAlign(pattern(100, 70), noise, {
      x: 0,
      y: 0,
      scale: 1,
      rotationDeg: 0,
    });
    expect(result.accepted).toBe(false);
  });

  it("can be cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      autoAlign(
        pattern(100, 70),
        pattern(100, 70),
        { x: 0, y: 0, scale: 1, rotationDeg: 0 },
        {
          signal: controller.signal,
        },
      ),
    ).rejects.toThrow(/abort/i);
  });

  it("reports progress per level", async () => {
    const levels: number[] = [];
    await autoAlign(
      pattern(100, 70),
      pattern(100, 70),
      { x: 0, y: 0, scale: 1, rotationDeg: 0 },
      {
        onLevel: (l) => levels.push(l),
      },
    );
    expect(levels).toEqual([0, 1, 2, 3, 4]);
  });

  it("treats images without overlap or contrast as unusable", () => {
    const flat: Gray = { data: new Float32Array(100 * 70).fill(0.5), width: 100, height: 70 };
    expect(correlationCost(flat, flat, { x: 0, y: 0, scale: 1, rotationDeg: 0 })).toBe(10);
    const a = pattern(100, 70);
    expect(correlationCost(a, a, { x: 90, y: 0, scale: 1, rotationDeg: 0 })).toBe(10);
  });
});
