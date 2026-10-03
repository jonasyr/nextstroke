import { z } from "zod";
import { Polygon } from "./common.ts";
import { idOf } from "./ids.ts";

/** Editable region, protected geometry and feather width for one original (spec §8). */
export const MaskRevisionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idOf("msk"),
    originalAssetId: idOf("ast"),
    transformRevision: idOf("tr"),
    editable: z.array(Polygon).min(1),
    protected: z.array(Polygon),
    featherPx: z.int().min(0).max(64),
    reviewedByUser: z.boolean(),
  })
  .strict();

export type MaskRevision = z.infer<typeof MaskRevisionSchema>;
