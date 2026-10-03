import { z } from "zod";
import { IsoDate, NonEmpty } from "./common.ts";

/** Evidence and provenance model of docs/product/material-knowledge-base.md. */
export const EvidenceLevel = z.enum(["A", "B", "C", "D", "E"]);
export const Confidence = z.enum(["low", "medium", "high"]);

const RANK = { low: 0, medium: 1, high: 2 } as const;
const MAX_CONFIDENCE = { A: "high", B: "medium", C: "high", D: "medium", E: "low" } as const;

export const SourceRecordSchema = z
  .object({
    id: NonEmpty,
    title: NonEmpty,
    publisher: NonEmpty,
    url: z.url(),
    sourceType: z.enum([
      "standard",
      "certification",
      "manufacturer",
      "nextstroke-test",
      "independent-test",
      "community",
    ]),
    retrievedAt: IsoDate,
    licenseNote: NonEmpty,
  })
  .strict();

export const MaterialClaimSchema = z
  .object({
    id: NonEmpty,
    subjectId: NonEmpty,
    predicate: NonEmpty,
    value: z.union([z.string(), z.number(), z.boolean()]),
    unit: NonEmpty.optional(),
    conditions: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    sourceId: NonEmpty,
    evidenceLevel: EvidenceLevel,
    confidence: Confidence,
    verifiedAt: IsoDate,
    supersedesClaimId: NonEmpty.optional(),
  })
  .strict()
  .superRefine((claim, ctx) => {
    if (claim.evidenceLevel === "E") {
      ctx.addIssue({
        code: "custom",
        message: `${claim.id}: evidence level E is a research lead, not a fact`,
      });
      return;
    }
    const cap = MAX_CONFIDENCE[claim.evidenceLevel];
    if (RANK[claim.confidence] > RANK[cap]) {
      ctx.addIssue({
        code: "custom",
        message: `${claim.id}: confidence ${claim.confidence} exceeds ${cap} for level ${claim.evidenceLevel}`,
      });
    }
  });

export type SourceRecord = z.infer<typeof SourceRecordSchema>;
export type MaterialClaim = z.infer<typeof MaterialClaimSchema>;
