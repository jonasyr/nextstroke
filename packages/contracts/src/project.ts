import { z } from "zod";
import { CoachRequestSchema, SuggestionSetSchema } from "./coaching.ts";
import { IsoDateTime, NonEmpty, NormalizedPoint } from "./common.ts";
import { idOf } from "./ids.ts";

/**
 * A local guided project (Phase 3 Task 4, spec §10–11). It only refers to immutable assets by
 * id; every save raises `revision`, so a stale tab cannot overwrite newer work.
 */
export const CheckpointSchema = z.object({ assetId: idOf("ast"), createdAt: IsoDateTime }).strict();

export const ProjectSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idOf("prj"),
    title: NonEmpty,
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
    revision: z.int().nonnegative(),
    originalAssetId: idOf("ast"),
    referenceAssetId: idOf("ast").optional(),
    /** Paper corners on the original (TL, TR, BR, BL, normalized); the straight view derives from them. */
    paperCorners: z
      .tuple([NormalizedPoint, NormalizedPoint, NormalizedPoint, NormalizedPoint])
      .optional(),
    request: CoachRequestSchema.optional(),
    suggestions: SuggestionSetSchema.optional(),
    selectedIdea: z.int().min(0).max(2).optional(),
    checkpoints: z.array(CheckpointSchema),
  })
  .strict();

export type Checkpoint = z.infer<typeof CheckpointSchema>;
export type Project = z.infer<typeof ProjectSchema>;
