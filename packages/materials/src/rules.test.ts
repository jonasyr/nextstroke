import type { MaterialClaim, PaperProfile } from "@nextstroke/contracts";
import { describe, expect, it } from "vitest";
import type { Fact } from "./dataset.ts";
import { feasibility, feasibleTechniques, type Situation } from "./rules.ts";

const bristol: PaperProfile = {
  id: "bristol-smooth",
  name: "Bristol glatt",
  surface: "smooth",
  feathers: "no",
  generic: true,
};
const copy: PaperProfile = { ...bristol, id: "copy", name: "Kopierpapier", feathers: "likely" };
const unknownPaper: PaperProfile = {
  ...bristol,
  id: "unknown",
  name: "Unbekannt",
  surface: "unknown",
  feathers: "unknown",
};

const fact = (id: string, value: MaterialClaim["value"]): Fact => ({
  value,
  conflict: false,
  claims: [
    {
      id,
      subjectId: "pen",
      predicate: "x",
      value,
      sourceId: "src",
      evidenceLevel: "B",
      confidence: "medium",
      verifiedAt: "2026-10-05",
    },
  ],
});

const micron: Situation = {
  pen: {
    tipSizesMm: fact("tips", "0.2,0.25,0.3,0.35,0.45,0.5"),
    smearResistant: fact("smear", true),
  },
  paper: bristol,
};

describe("technique feasibility (Phase 3 Task 1)", () => {
  it("never suggests lightening black ink", () => {
    const f = feasibility("lighten", micron);
    expect(f.feasible).toBe(false);
    expect(f.reasons[0]?.text).toMatch(/frei lässt/);
    expect(f.reasons[0]?.claims).toEqual([]);
  });

  it("derives spacing from the finest tip and cites the claim", () => {
    const f = feasibility("hatching", micron);
    expect(f).toMatchObject({ feasible: true, risk: "low", minSpacingMm: 0.4 });
    expect(f.reasons[0]?.claims).toEqual(["tips"]);
    // Owned sizes win over the pen's catalogue.
    expect(feasibility("hatching", { ...micron, ownedTipsMm: [0.5, 0.8] }).minSpacingMm).toBe(1);
  });

  it("is more careful with an unknown pen and paper", () => {
    const f = feasibility("stippling", { pen: {}, paper: unknownPaper });
    expect(f.risk).toBe("high");
    expect(f.minSpacingMm).toBe(1.5);
    expect(f.reasons.every((r) => r.claims.length === 0)).toBe(true);
  });

  it("warns about feathering paper and cites smear resistance where sourced", () => {
    const onCopy = feasibility("crossHatching", { ...micron, paper: copy });
    expect(onCopy.risk).toBe("medium");
    expect(onCopy.reasons.map((r) => r.text).join(" ")).toMatch(/verlaufen/);
    expect(onCopy.reasons.some((r) => r.claims.includes("smear"))).toBe(true);
    const unsourced = feasibility("crossHatching", { pen: {}, paper: bristol });
    expect(unsourced.reasons.map((r) => r.text).join(" ")).toMatch(/trocken/);
    expect(feasibility("contour", { ...micron, paper: copy }).risk).toBe("low");
  });

  it("offers line weight with one tip by doubling the line", () => {
    const f = feasibility("lineWeight", micron);
    expect(f.reasons[0]?.text).toMatch(/zweite/);
    expect(feasibility("lineWeight", { ...micron, ownedTipsMm: [0.1, 0.5] }).reasons).toEqual([]);
  });

  it("treats conflicting tip sizes as unknown, and lists every technique", () => {
    const conflicted: Situation = {
      pen: { tipSizesMm: { value: null, conflict: true, claims: [] } },
      paper: bristol,
    };
    expect(feasibility("hatching", conflicted).minSpacingMm).toBe(1);
    const all = feasibleTechniques(micron);
    expect(all.map((f) => f.technique)).toContain("negativeSpace");
    expect(all.filter((f) => !f.feasible).map((f) => f.technique)).toEqual(["lighten"]);
  });
});
