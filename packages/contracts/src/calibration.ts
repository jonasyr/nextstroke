import { z } from "zod";
import { IsoDateTime, NonEmpty, Unit } from "./common.ts";
import { idOf } from "./ids.ts";

/**
 * The optional test card (Phase 3 Task 2, D-028): relative observations of one pen on one
 * paper, with the photo context they were taken in. No absolute colour or density, and never a
 * product fact: it describes this user's pen on this user's paper.
 */

const Mm = z.number().positive().max(20);

/** What the coach uses from a card. */
export const CalibrationAdviceSchema = z
  .object({
    lineWidthMm: Mm,
    minSpacingMm: Mm,
    spreads: z.boolean().nullable(),
    overdrawDarkens: z.boolean(),
    /** Millimetres rest on a frame that was not about 120 × 80 mm. */
    approximate: z.boolean(),
  })
  .strict();
export type CalibrationAdvice = z.infer<typeof CalibrationAdviceSchema>;

const HatchingSchema = z
  .object({ targetMm: Mm, spacingMm: Mm.nullable(), separated: z.boolean(), tone: Unit })
  .strict();

export const CalibrationSampleSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idOf("cal"),
    createdAt: IsoDateTime,
    method: z.literal("card-v1"),
    finelinerId: NonEmpty,
    tipMm: z.number().positive().max(5).nullable(),
    paperId: NonEmpty,
    photo: z
      .object({ pxPerMm: z.number().positive(), scaleReliable: z.boolean(), lightEvenness: Unit })
      .strict(),
    measurements: z
      .object({
        lineWidthMm: Mm,
        hatching: z
          .object({ wide: HatchingSchema, middle: HatchingSchema, tight: HatchingSchema })
          .strict(),
        crossTone: Unit,
        stippleTone: Unit,
        overdraw: z.object({ once: Unit, twice: Unit }).strict(),
        paperTexture: z.number().nonnegative(),
      })
      .strict(),
    /** The user's answer to the wipe test; null when skipped. */
    smudged: z.boolean().nullable(),
    advice: CalibrationAdviceSchema,
  })
  .strict();
export type CalibrationSample = z.infer<typeof CalibrationSampleSchema>;
