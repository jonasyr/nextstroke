import { z } from "zod";

export const Sha256 = z.string().regex(/^[0-9a-f]{64}$/, "expected a lowercase SHA-256 hex digest");
export const IsoDateTime = z.iso.datetime();
export const IsoDate = z.iso.date();
export const NonEmpty = z.string().min(1);
export const Unit = z.number().min(0).max(1);
/** A point in source-normalized coordinates (0..1, origin top-left; spec §8). */
export const NormalizedPoint = z.tuple([Unit, Unit]);
export const Polygon = z.array(NormalizedPoint).min(3).max(256);
