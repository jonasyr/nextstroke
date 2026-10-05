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

/**
 * What a claim may say about a fineliner, with the value type each predicate takes. A claim
 * with another predicate, or the wrong value type, is rejected when the dataset is built.
 */
export const FINELINER_PREDICATES = {
  inkType: z.enum(["pigment", "dye", "water-based"]),
  waterResistantWhenDry: z.boolean(),
  /** The maker's own words ("lightfast", "fade resistant", "Lightfast rating: 8"): no shared scale. */
  lightfast: NonEmpty,
  archival: z.boolean(),
  acidFree: z.boolean(),
  smearResistant: z.boolean(),
  bleedThroughFree: z.boolean(),
  refillable: z.boolean(),
  replaceableNib: z.boolean(),
  /** Offered line widths in mm, comma-separated and ascending, e.g. "0.05,0.1,0.3". */
  tipSizesMm: z.string().regex(/^\d+(\.\d+)?(,\d+(\.\d+)?)*$/),
  /** Offered sizes as the maker labels them, when no mm are given, e.g. "S,F,M". */
  tipSizeLabels: NonEmpty,
  certification: NonEmpty,
} as const;
export type FinelinerPredicate = keyof typeof FINELINER_PREDICATES;

/**
 * A fineliner as the user picks it. Identity only: every property comes from a sourced claim.
 * The generic profile stands for an unknown pen and has no claims; rules then assume the
 * least (docs/product/material-knowledge-base.md).
 */
export const FinelinerProfileSchema = z
  .object({
    id: NonEmpty,
    brand: NonEmpty.optional(),
    productLine: NonEmpty.optional(),
    colorFamily: z.literal("black"),
    generic: z.boolean(),
  })
  .strict()
  .refine((p) => p.generic || (p.brand && p.productLine), {
    message: "a named fineliner needs brand and product line",
  });
export type FinelinerProfile = z.infer<typeof FinelinerProfileSchema>;

/**
 * A paper category, not a product: how its surface takes fineliner ink is a NextStroke rule
 * assumption, marked as generic, until a calibration or a source says more.
 */
export const PaperProfileSchema = z
  .object({
    id: NonEmpty,
    /** German name shown to the user. */
    name: NonEmpty,
    surface: z.enum(["smooth", "medium", "rough", "unknown"]),
    /** Ink may spread into the fibres (copy paper, cheap sketch paper). */
    feathers: z.enum(["no", "possible", "likely", "unknown"]),
    generic: z.literal(true),
  })
  .strict();
export type PaperProfile = z.infer<typeof PaperProfileSchema>;
