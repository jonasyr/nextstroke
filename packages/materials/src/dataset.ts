import {
  FINELINER_PREDICATES,
  type FinelinerPredicate,
  type FinelinerProfile,
  FinelinerProfileSchema,
  type MaterialClaim,
  MaterialClaimSchema,
  type PaperProfile,
  PaperProfileSchema,
  type SourceRecord,
  SourceRecordSchema,
} from "@nextstroke/contracts";

/** The curated, offline material dataset (docs/product/material-knowledge-base.md). */
export interface MaterialDataset {
  sources: SourceRecord[];
  fineliners: FinelinerProfile[];
  papers: PaperProfile[];
  claims: MaterialClaim[];
}

/** The evidence level a source type supports; a claim may not claim more than its source. */
const LEVEL_OF_SOURCE = {
  standard: "A",
  certification: "A",
  manufacturer: "B",
  "nextstroke-test": "C",
  "independent-test": "D",
  community: "E",
} as const;

function duplicates(ids: string[]): string[] {
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

/**
 * Every problem in the dataset, empty when it may ship. Runs as a test on every build, so a
 * claim without a source, beyond its evidence level, about an unknown pen, or with a value of
 * the wrong type never reaches a user.
 */
export function validateDataset(data: MaterialDataset, today: string): string[] {
  const errors: string[] = [];
  const check = <T>(
    schema: {
      safeParse(v: unknown): { success: boolean; error?: { issues: { message: string }[] } };
    },
    value: T,
    what: string,
  ) => {
    const result = schema.safeParse(value);
    if (!result.success) {
      errors.push(`${what}: ${result.error?.issues.map((i) => i.message).join("; ")}`);
    }
    return result.success;
  };
  for (const s of data.sources) {
    check(SourceRecordSchema, s, `source ${s.id}`);
    if (s.retrievedAt > today) errors.push(`source ${s.id}: retrieved in the future`);
  }
  for (const p of data.fineliners) check(FinelinerProfileSchema, p, `fineliner ${p.id}`);
  for (const p of data.papers) check(PaperProfileSchema, p, `paper ${p.id}`);
  for (const [what, ids] of [
    ["source", data.sources.map((s) => s.id)],
    ["fineliner", data.fineliners.map((p) => p.id)],
    ["paper", data.papers.map((p) => p.id)],
    ["claim", data.claims.map((c) => c.id)],
  ] as const) {
    for (const id of duplicates(ids)) errors.push(`${what} ${id}: duplicate id`);
  }
  if (data.fineliners.filter((p) => p.generic).length !== 1) {
    errors.push("exactly one generic fineliner profile is required");
  }
  const sources = new Map(data.sources.map((s) => [s.id, s]));
  const pens = new Map(data.fineliners.map((p) => [p.id, p]));
  const seen = new Set<string>();
  for (const c of data.claims) {
    if (!check(MaterialClaimSchema, c, `claim ${c.id}`)) continue;
    const pen = pens.get(c.subjectId);
    const source = sources.get(c.sourceId);
    if (!pen) errors.push(`claim ${c.id}: unknown fineliner ${c.subjectId}`);
    else if (pen.generic) errors.push(`claim ${c.id}: the generic profile takes no claims`);
    if (!source) errors.push(`claim ${c.id}: unknown source ${c.sourceId}`);
    else if (LEVEL_OF_SOURCE[source.sourceType] !== c.evidenceLevel) {
      errors.push(
        `claim ${c.id}: evidence ${c.evidenceLevel} does not match a ${source.sourceType} source`,
      );
    }
    if (c.verifiedAt > today) errors.push(`claim ${c.id}: verified in the future`);
    const value = FINELINER_PREDICATES[c.predicate as FinelinerPredicate];
    if (!value) errors.push(`claim ${c.id}: unknown predicate ${c.predicate}`);
    else check(value, c.value, `claim ${c.id} (${c.predicate})`);
    const key = `${c.subjectId}|${c.predicate}|${c.sourceId}`;
    if (seen.has(key)) errors.push(`claim ${c.id}: the same source says ${c.predicate} twice`);
    seen.add(key);
  }
  for (const p of data.fineliners) {
    if (!p.generic && !data.claims.some((c) => c.subjectId === p.id)) {
      errors.push(`fineliner ${p.id}: no sourced claim`);
    }
  }
  return errors;
}

/** What the dataset says about one property of a pen, with the claims behind it. */
export interface Fact {
  value: MaterialClaim["value"] | null;
  /** True when sources disagree; the value is then null and both claims stay visible. */
  conflict: boolean;
  claims: MaterialClaim[];
}

/** Size lists add up: a maker may list each size on its own page. */
function union(predicate: string, a: string, b: string): string {
  if (predicate === "tipSizesMm") {
    const sizes = new Set([...a.split(","), ...b.split(",")].map(Number));
    return [...sizes].sort((x, y) => x - y).join(",");
  }
  return [...new Set([...a.split("; "), ...b.split("; ")])].join("; ");
}

/**
 * The sourced facts about a pen, one per predicate; the generic pen has none. Sizes from
 * several sources add up; any other disagreement is a conflict and keeps both claims visible.
 */
export function factsFor(
  data: MaterialDataset,
  finelinerId: string,
): Partial<Record<FinelinerPredicate, Fact>> {
  const facts: Partial<Record<FinelinerPredicate, Fact>> = {};
  for (const c of data.claims) {
    if (c.subjectId !== finelinerId) continue;
    const key = c.predicate as FinelinerPredicate;
    const fact = facts[key];
    if (!fact) facts[key] = { value: c.value, conflict: false, claims: [c] };
    else {
      fact.claims.push(c);
      const additive = key === "tipSizesMm" || key === "tipSizeLabels";
      if (additive && typeof fact.value === "string" && typeof c.value === "string") {
        fact.value = union(key, fact.value, c.value);
      } else if (fact.value !== c.value) {
        fact.conflict = true;
        fact.value = null;
      }
    }
  }
  return facts;
}
