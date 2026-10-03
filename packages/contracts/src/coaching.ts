import { z } from "zod";
import { NonEmpty } from "./common.ts";
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
