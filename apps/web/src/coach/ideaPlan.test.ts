import { suggest } from "@nextstroke/coaching";
import { DATASET } from "@nextstroke/materials";
import { describe, expect, it } from "vitest";
import { DEFAULT_CHOICES, requestFrom } from "./flow.ts";
import { ideaPlan } from "./ideaPlan.ts";

describe("the plan for a chosen idea (D-071)", () => {
  const choices = { ...DEFAULT_CHOICES, area: { x: 0.5, y: 0.5, r: 0.2 } };
  const ideas = suggest(requestFrom(choices, 0.7), DATASET, "sug_0001").ideas;

  it("uses the coach's spacing on the chosen sheet", () => {
    const result = ideaPlan(ideas[0], choices, 0.7);
    if (!("plan" in result)) throw new Error(result.reason);
    // A beginner with an unknown pen: 0.8 mm on A4, 210 mm wide.
    expect(result.plan.fills[0]?.spacing).toBeCloseTo(0.8 / 210);
    const a3 = ideaPlan(ideas[0], { ...choices, sheet: "A3" }, 0.7);
    if (!("plan" in a3)) throw new Error("no plan");
    expect(a3.plan.fills[0]?.spacing).toBeCloseTo(0.8 / 297);
  });

  it("follows a tapped form's tone areas in form mode (D-073)", () => {
    const square: [number, number][] = [
      [0.5, 0.3],
      [0.7, 0.3],
      [0.7, 0.7],
    ];
    const tones = { lit: [], shadow: [square], core: [square] };
    const result = ideaPlan(ideas[0], { ...choices, areaKind: "form" }, 0.7, tones);
    if (!("plan" in result)) throw new Error(result.reason);
    expect(result.plan.fills[0]?.polygon).toEqual(square);
    expect(ideaPlan(ideas[0], { ...choices, areaKind: "form" }, 0.7)).toEqual({ reason: "noArea" });
  });

  it("says why there is none for an idea it does not know", () => {
    expect(ideaPlan({ ...ideas[0], title: "Anders" }, choices, 0.7)).toEqual({ reason: "form" });
  });
});
