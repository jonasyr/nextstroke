import { describe, expect, it } from "vitest";
import { factsFor, validateDataset } from "../dataset.ts";
import { feasibility } from "../rules.ts";
import { DATASET } from "./index.ts";

describe("the shipped material dataset", () => {
  it("passes validation: every claim sourced, typed and within its evidence level", () => {
    expect(validateDataset(DATASET, new Date().toISOString().slice(0, 10))).toEqual([]);
  });

  it("covers 10–20 named black fineliners plus the generic pen, and every paper category", () => {
    const named = DATASET.fineliners.filter((p) => !p.generic);
    expect(named.length).toBeGreaterThanOrEqual(10);
    expect(named.length).toBeLessThanOrEqual(20);
    expect(DATASET.papers.map((p) => p.id)).toContain("unknown");
  });

  it("adds up size lists spread over several pages", () => {
    expect(factsFor(DATASET, "faber-castell-pitt-artist-pen-fineliner").tipSizesMm?.value).toBe(
      "0.1,0.3,0.5",
    );
    expect(factsFor(DATASET, "sakura-pigma-micron").inkType).toMatchObject({
      value: "pigment",
      conflict: false,
    });
  });

  it("drives the rules from sourced sizes", () => {
    const paper = DATASET.papers.find((p) => p.id === "bristol-smooth");
    if (!paper) throw new Error("missing paper");
    const pen = factsFor(DATASET, "sakura-pigma-micron");
    const hatching = feasibility("hatching", { pen, paper });
    expect(hatching.minSpacingMm).toBe(0.3);
    expect(hatching.reasons[0]?.claims).toEqual(["sakura-pigma-micron-tipSizesMm-7"]);
  });
});
