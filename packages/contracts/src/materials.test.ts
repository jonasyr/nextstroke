import { describe, expect, it } from "vitest";
import {
  FINELINER_PREDICATES,
  FinelinerProfileSchema,
  MaterialClaimSchema,
  PaperProfileSchema,
  SourceRecordSchema,
} from "./materials.ts";

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

describe("fineliner and paper profiles", () => {
  it("names a pen by brand and product line, or marks it generic", () => {
    const pen = {
      id: "p",
      brand: "Sakura",
      productLine: "Pigma Micron",
      colorFamily: "black",
      generic: false,
    };
    expect(FinelinerProfileSchema.parse(pen).id).toBe("p");
    expect(() => FinelinerProfileSchema.parse({ ...pen, brand: undefined })).toThrow(/brand/);
    expect(
      FinelinerProfileSchema.parse({ id: "generic", colorFamily: "black", generic: true }).generic,
    ).toBe(true);
    expect(() => FinelinerProfileSchema.parse({ ...pen, colorFamily: "red" })).toThrow();
  });

  it("types every predicate's value", () => {
    expect(FINELINER_PREDICATES.inkType.safeParse("pigment").success).toBe(true);
    expect(FINELINER_PREDICATES.inkType.safeParse("gel").success).toBe(false);
    expect(FINELINER_PREDICATES.tipSizesMm.safeParse("0.05,0.1,0.8").success).toBe(true);
    expect(FINELINER_PREDICATES.tipSizesMm.safeParse("005, 01").success).toBe(false);
    expect(FINELINER_PREDICATES.waterResistantWhenDry.safeParse("yes").success).toBe(false);
  });

  it("keeps papers generic categories", () => {
    const paper = {
      id: "copy",
      name: "Kopierpapier",
      surface: "smooth",
      feathers: "likely",
      generic: true,
    };
    expect(PaperProfileSchema.parse(paper).feathers).toBe("likely");
    expect(() => PaperProfileSchema.parse({ ...paper, generic: false })).toThrow();
  });
});
