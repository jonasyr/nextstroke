import { z } from "zod";
import { IsoDateTime, NonEmpty, Sha256 } from "./common.ts";
import { idOf } from "./ids.ts";

/** Versioned local export package manifest; no cloud sync fields (spec §11). */
export const ExportManifestSchema = z
  .object({
    format: z.literal("nextstroke-project"),
    formatVersion: z.literal(1),
    appVersion: NonEmpty,
    exportedAt: IsoDateTime,
    assets: z.array(z.object({ id: idOf("ast"), sha256: Sha256, path: NonEmpty }).strict()),
  })
  .strict();

export type ExportManifest = z.infer<typeof ExportManifestSchema>;
