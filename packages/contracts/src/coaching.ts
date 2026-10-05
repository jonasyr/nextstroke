import { z } from "zod";
import { NonEmpty, Polygon } from "./common.ts";
import { idOf } from "./ids.ts";

/** One physically executable idea: at least a practice step and a drawing step (rules check order in Phase 3). */
export const IdeaSchema = z
  .object({
    title: NonEmpty,
    risk: z.enum(["careful", "balanced", "bold"]),
    technique: NonEmpty,
    steps: z.array(NonEmpty).min(2),
    materialClaimIds: z.array(NonEmpty),
    why: NonEmpty,
  })
  .strict();

/** Exactly three ideas per request (spec §5). */
export const SuggestionSetSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idOf("sug"),
    ideas: z.tuple([IdeaSchema, IdeaSchema, IdeaSchema]),
  })
  .strict();

export type Idea = z.infer<typeof IdeaSchema>;
export type SuggestionSet = z.infer<typeof SuggestionSetSchema>;

/** What the user wants more of (spec §6.2 step 5); each maps to fineliner techniques. */
export const CoachIntent = z.enum([
  "depth",
  "contrast",
  "texture",
  "outline",
  "background",
  "detail",
]);
export type CoachIntent = z.infer<typeof CoachIntent>;

/** A request to the coach (Phase 3 Task 3): intent, area, tool, paper and skill. */
export const CoachRequestSchema = z
  .object({
    intent: CoachIntent,
    /** Where the user wants the change, in source-normalized coordinates; optional. */
    area: Polygon.optional(),
    /** Details that must stay untouched. */
    protected: z.array(Polygon).max(16).optional(),
    skill: z.enum(["beginner", "intermediate", "advanced"]),
    finelinerId: NonEmpty,
    /** Tip sizes the user owns, in mm. */
    ownedTipsMm: z.array(z.number().positive().max(5)).max(12).optional(),
    paperId: NonEmpty,
  })
  .strict();
export type CoachRequest = z.infer<typeof CoachRequestSchema>;
