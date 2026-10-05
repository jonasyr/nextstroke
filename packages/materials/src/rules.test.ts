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

  it("derives spacing from the tip the user draws with, not the finest sold", () => {
    // Not said which: a common 0.3 mm tip, two line widths apart.
    const f = feasibility("hatching", micron);
    expect(f).toMatchObject({ feasible: true, risk: "low", minSpacingMm: 0.6 });
    expect(f.reasons[0]).toMatchObject({ kind: "spacing", claims: [] });
    expect(f.reasons[0]?.text).toMatch(/übliche 0,3-mm-Spitze: mindestens 0,6 mm/);
    // A size from the maker's list is cited; never closer than a hand can keep lines apart.
    const listed = feasibility("hatching", { ...micron, ownedTipsMm: [0.2] });
    expect(listed.minSpacingMm).toBe(0.5);
    expect(listed.reasons[0]?.claims).toEqual(["tips"]);
    // A size the maker does not list is the user's word only.
    const owned = feasibility("hatching", { ...micron, ownedTipsMm: [0.5, 0.8] });
    expect(owned.minSpacingMm).toBe(1);
    expect(owned.reasons[0]).toMatchObject({ kind: "spacing", claims: [] });
  });

  it("is more careful with an unknown pen and paper", () => {
    const f = feasibility("stippling", { pen: {}, paper: unknownPaper });
    expect(f.risk).toBe("high");
    expect(f.minSpacingMm).toBe(0.9);
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
    expect(feasibility("hatching", conflicted).minSpacingMm).toBe(0.6);
    expect(
      feasibility("hatching", { ...conflicted, ownedTipsMm: [0.3] }).reasons[0]?.claims,
    ).toEqual([]);
    const all = feasibleTechniques(micron);
    expect(all.map((f) => f.technique)).toContain("negativeSpace");
    expect(all.filter((f) => !f.feasible).map((f) => f.technique)).toEqual(["lighten"]);
  });
});
