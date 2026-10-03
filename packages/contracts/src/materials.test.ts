import { describe, expect, it } from "vitest";
import { MaterialClaimSchema, SourceRecordSchema } from "./materials.ts";

const claim = {
  id: "micron-ink",
  subjectId: "sakura-pigma-micron",
  predicate: "ink",
  value: "pigment, permanent",
  sourceId: "src-sakura-micron",
  evidenceLevel: "B",
  confidence: "medium",
  verifiedAt: "2026-10-03",
};

describe("material claims (material-knowledge-base.md)", () => {
  it("accepts a sourced manufacturer claim", () => {
    expect(MaterialClaimSchema.parse(claim).id).toBe("micron-ink");
  });

  it("rejects a claim without a source", () => {
    const { sourceId: _, ...unsourced } = claim;
    expect(() => MaterialClaimSchema.parse(unsourced)).toThrow();
    expect(() => MaterialClaimSchema.parse({ ...claim, sourceId: "" })).toThrow();
  });

  it("caps confidence by evidence level", () => {
    expect(() => MaterialClaimSchema.parse({ ...claim, confidence: "high" })).toThrow(
      /exceeds medium/,
    );
    expect(
      MaterialClaimSchema.parse({ ...claim, evidenceLevel: "C", confidence: "high" }),
    ).toBeTruthy();
  });

  it("never treats a community report as a fact", () => {
    expect(() =>
      MaterialClaimSchema.parse({ ...claim, evidenceLevel: "E", confidence: "low" }),
    ).toThrow(/research lead/);
  });

  it("requires source records to name publisher, URL and license note", () => {
    const source = {
      id: "src-sakura-micron",
      title: "Pigma Micron",
      publisher: "Sakura",
      url: "https://www.sakuraofamerica.com/",
      sourceType: "manufacturer",
      retrievedAt: "2026-10-03",
      licenseNote: "facts only, no copied text",
    };
    expect(SourceRecordSchema.parse(source).publisher).toBe("Sakura");
    expect(() => SourceRecordSchema.parse({ ...source, url: "not a url" })).toThrow();
  });
});
