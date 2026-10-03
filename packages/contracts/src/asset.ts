import { z } from "zod";
import { IsoDateTime, NonEmpty, Sha256 } from "./common.ts";
import { idOf } from "./ids.ts";

/** Immutable assets (AGENTS rule 2): never edited; new content is a new asset. */
export const ImmutableAssetSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idOf("ast"),
    role: z.enum(["original", "reference", "checkpoint", "provider-template", "local-render"]),
    origin: z.enum(["user-upload", "camera", "provider", "local"]),
    sha256: Sha256,
    mimeType: NonEmpty,
    width: z.int().positive(),
    height: z.int().positive(),
    createdAt: IsoDateTime,
  })
  .strict()
  .refine((a) => (a.origin === "provider") === (a.role === "provider-template"), {
    message: "provider images are only ever untrusted provider-template assets (AGENTS rule 3)",
  })
  .transform((a) => Object.freeze(a));

export type ImmutableAsset = z.infer<typeof ImmutableAssetSchema>;
