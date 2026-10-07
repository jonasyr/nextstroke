import type { StrokePlan } from "@nextstroke/contracts";
import { describe, expect, it, vi } from "vitest";
import { dotGrid, drawPlan, hatchLines, viewAround, WHOLE } from "./planRender.ts";

const square: [number, number][] = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
];

describe("stroke-plan geometry (D-071)", () => {
  it("covers a polygon with parallel lines a fixed spacing apart", () => {
    const flat = hatchLines(square, 0, 10);
    expect(flat).toHaveLength(11);
    expect(flat[1]?.[0][1]).toBeCloseTo(10);
    expect(flat[1]?.[1][0] ?? 0).toBeGreaterThanOrEqual(100);
    // Diagonal lines span the diagonal: about 100·√2 / 10 of them.
    expect(hatchLines(square, 45, 10).length).toBeGreaterThanOrEqual(14);
    expect(hatchLines(square, 45, 0)).toEqual([]);
    expect(hatchLines(square.slice(0, 2), 45, 10)).toEqual([]);
  });

  it("places dots on staggered rows, the same every time", () => {
    const dots = dotGrid(square, 10);
    expect(dots.length).toBeGreaterThan(100);
    expect(dotGrid(square, 10)).toEqual(dots);
    expect(dotGrid(square, -1)).toEqual([]);
  });

  it("frames a marked circle and keeps the view on the image", () => {
    expect(viewAround({ x: 0.5, y: 0.5, r: 0.1 }, 1)).toEqual({
      x: expect.closeTo(0.365),
      y: expect.closeTo(0.365),
      w: expect.closeTo(0.27),
      h: expect.closeTo(0.27),
    });
    const corner = viewAround({ x: 0.02, y: 0.99, r: 0.1 }, 0.5);
    expect(corner.x).toBe(0);
    expect(corner.y + corner.h).toBeCloseTo(1);
    expect(viewAround({ x: 0.5, y: 0.5, r: 0.9 }, 1)).toEqual(WHOLE);
  });
});

describe("drawing a plan", () => {
  const plan: StrokePlan = {
    schemaVersion: "2",
    strokes: [],
    fills: [
      {
        order: 2,
        polygon: [
          [0.1, 0.1],
          [0.5, 0.1],
          [0.5, 0.5],
        ],
        angleDeg: 45,
        spacing: 0.02,
        width: 0.001,
        darkness: 0.9,
        cross: true,
      },
      {
        order: 1,
        polygon: [
          [0.5, 0.5],
          [0.9, 0.5],
          [0.9, 0.9],
        ],
        angleDeg: 0,
        spacing: 0.02,
        width: 0.001,
        darkness: 0.9,
        cross: false,
        pattern: "dots",
      },
    ],
  };

  it("clips each fill, draws lines or dots, then cuts protected details out", () => {
    const calls: string[] = [];
    const record =
      (name: string) =>
      (..._args: unknown[]) =>
        calls.push(name);
    const modes: string[] = [];
    const ctx = {
      clearRect: record("clear"),
      save: record("save"),
      restore: record("restore"),
      beginPath: record("begin"),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      clip: record("clip"),
      arc: record("arc"),
      fill: record("fill"),
      stroke: record("stroke"),
      set globalCompositeOperation(value: string) {
        modes.push(value);
      },
    } as unknown as CanvasRenderingContext2D;
    drawPlan(ctx, plan, [plan.fills[0]?.polygon as [number, number][]], {
      width: 400,
      height: 400,
    });
    expect(calls[0]).toBe("clear");
    // The dot fill (order 1) is drawn before the hatching (order 2).
    expect(calls.indexOf("arc")).toBeLessThan(calls.indexOf("stroke"));
    expect(calls.filter((c) => c === "clip")).toHaveLength(2);
    expect(modes).toEqual(["destination-out"]);
    expect(calls.at(-2)).toBe("fill");
  });
});
