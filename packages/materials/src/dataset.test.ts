import { describe, expect, it } from "vitest";
import { factsFor, type MaterialDataset, validateDataset } from "./dataset.ts";

const today = "2026-10-05";

function dataset(): MaterialDataset {
  return {
    sources: [
      {
        id: "src-a",
        title: "Pen A",
        publisher: "Maker",
        url: "https://maker.example/pen-a",
        sourceType: "manufacturer",
        retrievedAt: today,
        licenseNote: "facts and own paraphrase only",
      },
    ],
    fineliners: [
      { id: "generic", colorFamily: "black", generic: true },
      { id: "pen-a", brand: "Maker", productLine: "A", colorFamily: "black", generic: false },
    ],
    papers: [
      { id: "copy", name: "Kopierpapier", surface: "smooth", feathers: "likely", generic: true },
    ],
    claims: [
      {
        id: "pen-a-ink",
        subjectId: "pen-a",
        predicate: "inkType",
        value: "pigment",
        sourceId: "src-a",
        evidenceLevel: "B",
        confidence: "medium",
        verifiedAt: today,
      },
    ],
  };
}

describe("material dataset validation (material-knowledge-base.md)", () => {
  it("accepts a sourced dataset with one generic pen", () => {
    expect(validateDataset(dataset(), today)).toEqual([]);
  });

  it("rejects claims without a known source, pen or predicate", () => {
    const d = dataset();
    const base = d.claims[0] as MaterialDataset["claims"][number];
    d.claims.push(
      { ...base, id: "c1", sourceId: "nowhere" },
      { ...base, id: "c2", subjectId: "pen-z" },
      { ...base, id: "c3", subjectId: "generic" },
      { ...base, id: "c4", predicate: "smell", value: "nice" },
      { ...base, id: "c5", predicate: "waterResistantWhenDry", value: "yes" },
    );
    const errors = validateDataset(d, today).join("\n");
    expect(errors).toMatch(/c1: unknown source nowhere/);
    expect(errors).toMatch(/c2: unknown fineliner pen-z/);
    expect(errors).toMatch(/c3: the generic profile takes no claims/);
    expect(errors).toMatch(/c4: unknown predicate smell/);
    expect(errors).toMatch(/c5 \(waterResistantWhenDry\)/);
  });

  it("holds claims to their source's evidence level and to the calendar", () => {
    const d = dataset();
    const base = d.claims[0] as MaterialDataset["claims"][number];
    d.claims.push(
      {
        ...base,
        id: "c6",
        predicate: "archival",
        value: true,
        evidenceLevel: "A",
        confidence: "high",
      },
      { ...base, id: "c7", predicate: "acidFree", value: true, verifiedAt: "2027-01-01" },
      { ...base, id: "c8", predicate: "lightfast", value: "lightfast", confidence: "high" },
    );
    (d.sources[0] as MaterialDataset["sources"][number]).retrievedAt = "2027-01-01";
    const errors = validateDataset(d, today).join("\n");
    expect(errors).toMatch(/c6: evidence A does not match a manufacturer source/);
    expect(errors).toMatch(/c7: verified in the future/);
    expect(errors).toMatch(/c8: .*exceeds medium/);
    expect(errors).toMatch(/source src-a: retrieved in the future/);
  });

  it("requires an ink type per named pen, unique ids and exactly one generic pen", () => {
    const d = dataset();
    d.claims = [];
    d.fineliners.push({ id: "generic", colorFamily: "black", generic: true });
    d.sources.push({ ...(d.sources[0] as MaterialDataset["sources"][number]) });
    d.papers.push({ id: "bad", name: "", surface: "smooth", feathers: "no", generic: true });
    const errors = validateDataset(d, today).join("\n");
    expect(errors).toMatch(/pen-a: no sourced claim/);
    expect(errors).toMatch(/fineliner generic: duplicate id/);
    expect(errors).toMatch(/source src-a: duplicate id/);
    expect(errors).toMatch(/exactly one generic fineliner/);
    expect(errors).toMatch(/paper bad/);
  });

  it("rejects the same source saying the same thing twice", () => {
    const d = dataset();
    d.claims.push({ ...(d.claims[0] as MaterialDataset["claims"][number]), id: "again" });
    expect(validateDataset(d, today).join("\n")).toMatch(
      /again: the same source says inkType twice/,
    );
  });
});

describe("facts per pen", () => {
  it("gives one fact per predicate and keeps disagreeing sources visible", () => {
    const d = dataset();
    const base = d.claims[0] as MaterialDataset["claims"][number];
    d.claims.push(
      { ...base, id: "wr-1", predicate: "waterResistantWhenDry", value: true },
      { ...base, id: "wr-2", predicate: "waterResistantWhenDry", value: true, sourceId: "src-b" },
      { ...base, id: "lf-1", predicate: "lightfast", value: "lightfast" },
      { ...base, id: "lf-2", predicate: "lightfast", value: "fades", sourceId: "src-b" },
    );
    const facts = factsFor(d, "pen-a");
    expect(facts.inkType?.value).toBe("pigment");
    expect(facts.waterResistantWhenDry).toMatchObject({ value: true, conflict: false });
    expect(facts.waterResistantWhenDry?.claims).toHaveLength(2);
    expect(facts.lightfast).toMatchObject({ value: null, conflict: true });
    expect(factsFor(d, "generic")).toEqual({});
  });
});

describe("size lists", () => {
  it("add up across sources instead of conflicting", () => {
    const d = dataset();
    const base = d.claims[0] as MaterialDataset["claims"][number];
    d.claims.push(
      { ...base, id: "s1", predicate: "tipSizesMm", value: "0.1,0.5" },
      { ...base, id: "s2", predicate: "tipSizesMm", value: "0.3,0.1", sourceId: "src-b" },
      { ...base, id: "l1", predicate: "tipSizeLabels", value: "XS; S" },
      { ...base, id: "l2", predicate: "tipSizeLabels", value: "S; F", sourceId: "src-b" },
    );
    const facts = factsFor(d, "pen-a");
    expect(facts.tipSizesMm).toMatchObject({ value: "0.1,0.3,0.5", conflict: false });
    expect(facts.tipSizeLabels?.value).toBe("XS; S; F");
  });
});
