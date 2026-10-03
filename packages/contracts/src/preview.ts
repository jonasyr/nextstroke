import { z } from "zod";
import { IsoDateTime, NonEmpty, Sha256 } from "./common.ts";
import { idOf } from "./ids.ts";

/** Preview artifact vocabulary of spec §7; trust is fixed by kind. */
export const ProvenanceSchema = z
  .object({
    sourceAssetHash: Sha256,
    transformRevision: NonEmpty,
    producer: NonEmpty,
    promptRevision: NonEmpty.optional(),
    createdAt: IsoDateTime,
  })
  .strict();

const base = { id: idOf("prv") };

export const GeneratedCompositeSchema = z
  .object({
    ...base,
    kind: z.literal("generated-composite"),
    assetId: idOf("ast"),
    providerRunId: NonEmpty,
    provenance: ProvenanceSchema,
    trust: z.literal("untrusted"),
  })
  .strict();

export const DerivedDifferenceOverlaySchema = z
  .object({
    ...base,
    kind: z.literal("derived-difference-overlay"),
    assetId: idOf("ast"),
    sourceCompositeId: idOf("prv"),
    provenance: ProvenanceSchema,
    trust: z.literal("diagnostic"),
  })
  .strict();

export const ControlledOverlaySchema = z
  .object({
    ...base,
    kind: z.literal("controlled-overlay"),
    assetId: idOf("ast"),
    construction: z.enum(["direct-alpha", "structured-strokes", "svg"]),
    editableMaskRevision: idOf("msk"),
    protectedGeometryRevision: idOf("msk"),
    /** The generated composite whose strokes were transferred into this plan (D-051). */
    derivedFromTemplateId: idOf("prv").optional(),
    provenance: ProvenanceSchema,
    trust: z.literal("controlled"),
  })
  .strict()
  .refine((o) => o.derivedFromTemplateId === undefined || o.construction === "structured-strokes", {
    message: "only structured strokes may be derived from a template (D-051)",
  });

export const ExperimentalInspirationSchema = z
  .object({
    ...base,
    kind: z.literal("experimental-inspiration"),
    assetId: idOf("ast"),
    source: z.enum(["generated-composite", "failed-overlay"]),
    sourceArtifactId: idOf("prv"),
    provenance: ProvenanceSchema,
    trust: z.literal("experimental"),
    warningCode: NonEmpty,
  })
  .strict();

export const RejectedCandidateSchema = z
  .object({
    ...base,
    kind: z.literal("rejected-candidate"),
    sourceArtifactId: idOf("prv"),
    reasonCode: NonEmpty,
    trust: z.literal("rejected"),
  })
  .strict();

export const PreviewArtifactSchema = z.union([
  GeneratedCompositeSchema,
  DerivedDifferenceOverlaySchema,
  ControlledOverlaySchema,
  ExperimentalInspirationSchema,
  RejectedCandidateSchema,
]);

export type GeneratedComposite = z.infer<typeof GeneratedCompositeSchema>;
export type ControlledOverlay = z.infer<typeof ControlledOverlaySchema>;
export type ExperimentalInspiration = z.infer<typeof ExperimentalInspirationSchema>;
export type PreviewArtifact = z.infer<typeof PreviewArtifactSchema>;
export type ArtifactKind = PreviewArtifact["kind"];
export type TargetTrust = "controlled" | "experimental" | "rejected";

/**
 * Allowed trust changes. Nothing becomes controlled by transition: a controlled overlay is
 * only ever created from a locally rendered construction that passed the boundary audit.
 * Human approval records preference and never appears here (spec §7).
 */
const TRANSITIONS: Record<ArtifactKind, readonly TargetTrust[]> = {
  "generated-composite": ["experimental", "rejected"],
  "derived-difference-overlay": ["rejected"],
  "controlled-overlay": ["experimental", "rejected"],
  "experimental-inspiration": ["rejected"],
  "rejected-candidate": [],
};

export function canTransition(from: ArtifactKind, to: TargetTrust): boolean {
  return TRANSITIONS[from].includes(to);
}

export function toExperimentalInspiration(
  composite: GeneratedComposite,
  next: { id: string; assetId: string; warningCode: string },
): ExperimentalInspiration {
  return ExperimentalInspirationSchema.parse({
    ...next,
    kind: "experimental-inspiration",
    source: "generated-composite",
    sourceArtifactId: composite.id,
    provenance: composite.provenance,
    trust: "experimental",
  });
}

export type ControlledOverlayInput = Omit<ControlledOverlay, "kind" | "trust">;

export function createControlledOverlay(
  input: ControlledOverlayInput,
  checks: { boundaryAuditPassed: boolean },
): ControlledOverlay {
  if (!checks.boundaryAuditPassed) {
    throw new Error("a controlled overlay needs a passed boundary audit (spec §8)");
  }
  return ControlledOverlaySchema.parse({
    ...input,
    kind: "controlled-overlay",
    trust: "controlled",
  });
}
