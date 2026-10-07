import { StrokePlanSchema } from "@nextstroke/contracts";
import { describe, expect, it } from "vitest";
import { clipPolygon, type PlanInput, planFor, templateOf } from "./plan.ts";
import { FALLBACKS, TEMPLATES } from "./templates.ts";

const byId = (id: string) => {
  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) throw new Error(id);
  return template;
};

const input = (id: string, extra: Partial<PlanInput> = {}): PlanInput => ({
  template: byId(id),
  spacingMm: 0.6,
  tipMm: 0.3,
  sheet: "A4",
  aspect: 210 / 297,
  area: { x: 0.5, y: 0.5, r: 0.2 },
  light: "left",
  protectedSpots: [],
  ...extra,
});

const xs = (poly: [number, number][]) => poly.map((p) => p[0]);

describe("polygon clipping", () => {
  it("keeps the part of a polygon on one side of a line", () => {
    const square: [number, number][] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    const right = clipPolygon(square, [1, 0], 0.5);
    expect(Math.min(...xs(right))).toBeCloseTo(0.5);
    expect(Math.max(...xs(right))).toBeCloseTo(1);
    expect(clipPolygon(square, [1, 0], 2)).toEqual([]);
  });
});

describe("the rule-based stroke plan (D-071)", () => {
  it("hatches the darkest part of the shadow side, away from the light", () => {
    const result = planFor(input("depth-careful"));
    if (!("plan" in result)) throw new Error(result.reason);
    const plan = StrokePlanSchema.parse(result.plan);
    expect(plan.fills).toHaveLength(1);
    expect(result.usesLight).toBe(true);
    const fill = plan.fills[0];
    // Light from the left: the shadow lies right of the centre.
    expect(Math.min(...xs(fill?.polygon ?? []))).toBeGreaterThan(0.5);
    // 0.6 mm on a sheet 210 mm wide; a 0.3 mm line.
    expect(fill?.spacing).toBeCloseTo(0.6 / 210);
    expect(fill?.width).toBeCloseTo(0.3 / 210);
    const right = planFor(input("depth-careful", { light: "right" }));
    if (!("plan" in right)) throw new Error("no plan");
    expect(Math.max(...xs(right.plan.fills[0]?.polygon ?? []))).toBeLessThan(0.5);
  });

  it("puts the shadow at the bottom for light from above, in photo coordinates", () => {
    const result = planFor(input("depth-careful", { light: "top" }));
    if (!("plan" in result)) throw new Error("no plan");
    const ys = (result.plan.fills[0]?.polygon ?? []).map((p) => p[1]);
    expect(Math.min(...ys)).toBeGreaterThan(0.5);
    // r = 0.2 of the width is 0.2 × 210 / 297 of the height.
    expect(Math.max(...ys)).toBeCloseTo(0.5 + 0.2 * (210 / 297), 2);
  });

  it("adds a second layer at 45° over the darkest third, or crossed layers for bold", () => {
    const balanced = planFor(input("depth-balanced"));
    if (!("plan" in balanced)) throw new Error("no plan");
    const [first, second] = balanced.plan.fills;
    expect(Math.abs((second?.angleDeg ?? 0) - (first?.angleDeg ?? 0))).toBe(45);
    expect(Math.min(...xs(second?.polygon ?? []))).toBeGreaterThan(
      Math.min(...xs(first?.polygon ?? [])),
    );
    const bold = planFor(input("depth-bold"));
    if (!("plan" in bold)) throw new Error("no plan");
    expect(bold.plan.fills.every((f) => f.cross)).toBe(true);
  });

  it("stipples with dots, denser in the shadow", () => {
    const result = planFor(input("texture-careful"));
    if (!("plan" in result)) throw new Error("no plan");
    const [all, shadow] = result.plan.fills;
    expect(all?.pattern).toBe("dots");
    expect(shadow?.pattern).toBe("dots");
    expect(all?.spacing).toBeGreaterThan(shadow?.spacing ?? 1);
  });

  it("darkens the whole area around the form and keeps a halo around protected details", () => {
    const spot = { x: 0.5, y: 0.5, r: 0.05 };
    const result = planFor(input("background-balanced", { protectedSpots: [spot] }));
    if (!("plan" in result)) throw new Error("no plan");
    expect(result.plan.fills).toHaveLength(1);
    expect(result.keepFree).toHaveLength(1);
    expect(result.usesLight).toBe(false);
    // The halo reaches beyond the protected circle.
    expect(Math.max(...xs(result.keepFree[0] ?? []))).toBeGreaterThan(0.55);
    const dark = planFor(input("contrast-bold", { protectedSpots: [spot] }));
    if (!("plan" in dark)) throw new Error("no plan");
    expect(dark.plan.fills[0]?.cross).toBe(true);
    expect(dark.keepFree[0]).toBeDefined();
  });

  it("keeps every point on the photo and the spacing within the contract", () => {
    const edge = planFor(
      input("background-bold", {
        area: { x: 0.02, y: 0.98, r: 0.3 },
        sheet: "A3",
        spacingMm: 0.3,
        protectedSpots: [{ x: 0.1, y: 0.9, r: 0.05 }],
      }),
    );
    if (!("plan" in edge)) throw new Error("no plan");
    const plan = StrokePlanSchema.parse(edge.plan);
    const points = plan.fills.flatMap((f) => f.polygon).flat();
    expect(Math.min(...points)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...points)).toBeLessThanOrEqual(1);
    // A landscape photo: the long side of A3 is the width.
    const wide = planFor(input("depth-careful", { aspect: 297 / 210 }));
    if (!("plan" in wide)) throw new Error("no plan");
    expect(wide.plan.fills[0]?.spacing).toBeCloseTo(0.6 / 297);
  });

  it("has no preview for line work, unknown edges or directions, or without an area", () => {
    expect(planFor(input("outline-careful"))).toEqual({ reason: "lines" });
    expect(planFor({ ...input("detail-careful"), template: FALLBACKS.careful })).toEqual({
      reason: "lines",
    });
    expect(planFor(input("contrast-balanced"))).toEqual({ reason: "form" });
    expect(planFor(input("texture-balanced"))).toEqual({ reason: "direction" });
    expect(planFor(input("detail-bold"))).toEqual({ reason: "form" });
    expect(planFor(input("depth-careful", { area: null }))).toEqual({ reason: "noArea" });
    expect(planFor(input("depth-careful", { area: { x: 3, y: 3, r: 0.1 } }))).toEqual({
      reason: "noArea",
    });
    // Darkening around a form needs the form marked as protected.
    expect(planFor(input("background-bold"))).toEqual({ reason: "protect" });
  });

  it("finds the template behind a saved idea", () => {
    expect(templateOf({ title: "Schatten in zwei Lagen", risk: "balanced" })?.id).toBe(
      "depth-balanced",
    );
    expect(templateOf({ title: "Eine Kontur klarer ziehen", risk: "careful" })?.id).toBe(
      "fallback-careful",
    );
    expect(templateOf({ title: "Unbekannt", risk: "bold" })).toBeNull();
  });
});
