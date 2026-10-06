import { DATASET, TECHNIQUES } from "@nextstroke/materials";
import { describe, expect, it } from "vitest";
import {
  generalRules,
  ideasLead,
  orderPens,
  POPULAR_PENS,
  penName,
  techniqueLabel,
} from "./labels.ts";

const pen = (id: string) => DATASET.fineliners.find((p) => p.id === id);

describe("guided flow labels", () => {
  it("names every technique and every pen in the dataset", () => {
    for (const t of TECHNIQUES) expect(techniqueLabel(t)).not.toBe(t);
    expect(techniqueLabel("somethingNew")).toBe("somethingNew");
    const ordered = orderPens(DATASET.fineliners);
    expect(ordered.map((p) => p.id).slice(0, 3)).toEqual(POPULAR_PENS);
    expect(ordered).toHaveLength(DATASET.fineliners.filter((p) => !p.generic).length);
    expect(penName(pen("sakura-pigma-micron"))).toBe("Sakura Pigma Micron");
    expect(penName(pen("generic"))).toBe("Weiß ich nicht");
  });

  it("sums up the choices above the ideas", () => {
    expect(
      ideasLead("depth", pen("sakura-pigma-micron"), 0.3, { id: "drawing", name: "Zeichenpapier" }),
    ).toBe("Für mehr Tiefe mit Pigma Micron 0,3 mm auf Zeichenpapier.");
    expect(
      ideasLead("outline", pen("generic"), null, { id: "unknown", name: "Weiß ich nicht" }),
    ).toBe("Für die Umrisse mit deinem Fineliner.");
  });

  it("states the general spacing rule, wider for beginners", () => {
    expect(generalRules("beginner")).toMatch(/ein Viertel mehr\.$/);
    expect(generalRules("advanced")).toMatch(/0,5 mm\.$/);
  });
});
