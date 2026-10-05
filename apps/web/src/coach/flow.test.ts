import { CoachRequestSchema } from "@nextstroke/contracts";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_CHOICES,
  defaultTitle,
  dragArea,
  MAX_PROTECTED,
  mmLabel,
  pressArea,
  requestFrom,
  SPOT,
  spotToPolygon,
  tipChoices,
  toggleProtected,
} from "./flow.ts";

describe("guided flow state (Phase 3 Task 5)", () => {
  it("turns the choices into a valid coach request", () => {
    const bare = requestFrom(DEFAULT_CHOICES, 0.75);
    expect(CoachRequestSchema.parse(bare)).toEqual({
      intent: "depth",
      skill: "beginner",
      finelinerId: "generic",
      paperId: "unknown",
    });
    const full = requestFrom(
      {
        ...DEFAULT_CHOICES,
        tipMm: 0.3,
        area: { x: 0.5, y: 0.5, r: 0.1 },
        protectedSpots: [{ x: 0.2, y: 0.2, r: 0.05 }],
      },
      0.75,
    );
    expect(CoachRequestSchema.parse(full).ownedTipsMm).toEqual([0.3]);
    expect(full.area).toHaveLength(16);
    expect(full.protected).toHaveLength(1);
  });

  it("draws a circle as a polygon inside the photo, round on screen", () => {
    const polygon = spotToPolygon({ x: 0.05, y: 0.5, r: 0.1 }, 0.5);
    expect(polygon.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
    // On a photo twice as tall as wide, the vertical radius is half as large a share of its height.
    expect(polygon[4]?.[1]).toBeCloseTo(0.55);
  });

  it("places the area with a tap and resizes it by dragging from its ring", () => {
    const placed = pressArea(null, { x: 0.4, y: 0.4 }, 1);
    expect(placed).toEqual({ area: { x: 0.4, y: 0.4, r: SPOT.start }, resizing: false });
    const onRing = pressArea(placed.area, { x: 0.4 + SPOT.start, y: 0.4 }, 1);
    expect(onRing.resizing).toBe(true);
    expect(dragArea(placed.area, { x: 0.7, y: 0.4 }, 1).r).toBeCloseTo(0.3);
    expect(dragArea(placed.area, { x: 0.4, y: 0.4 }, 1).r).toBe(SPOT.min);
    expect(dragArea(placed.area, { x: 1.4, y: 0.4 }, 1).r).toBe(SPOT.max);
    expect(pressArea(placed.area, { x: 0.9, y: 0.9 }, 1).area).toMatchObject({ x: 0.9, y: 0.9 });
  });

  it("adds and removes protected spots by tapping, up to a limit", () => {
    const one = toggleProtected([], { x: 0.3, y: 0.3 }, 1);
    expect(one).toHaveLength(1);
    expect(toggleProtected(one, { x: 0.3, y: 0.3 }, 1)).toEqual([]);
    const full = Array.from({ length: MAX_PROTECTED }, (_, i) => ({ x: i / 20, y: 0.9, r: 0.01 }));
    expect(toggleProtected(full, { x: 0.5, y: 0.1 }, 1)).toHaveLength(MAX_PROTECTED);
  });

  it("names a project by its date and lists tip sizes", () => {
    expect(defaultTitle("2026-10-05T20:00:00.000Z")).toBe("Projekt vom 5. Okt.");
    expect(tipChoices("0.5,0.15,0.3")).toEqual([0.15, 0.3, 0.5]);
    expect(tipChoices(undefined)).toEqual([]);
    expect(mmLabel(0.15)).toBe("0,15");
  });
});
