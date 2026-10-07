import {
  type FormTones,
  ideaSpacingMm,
  type PlanResult,
  planFor,
  templateOf,
} from "@nextstroke/coaching";
import type { Idea } from "@nextstroke/contracts";
import { DATASET } from "@nextstroke/materials";
import { type FlowChoices, requestFrom } from "./flow.ts";

/**
 * The stroke plan for a chosen idea on the straight view (D-071): the coach's own spacing, the
 * user's tip, sheet and light, the circle and protected details as marked. `aspect` is the
 * straight view's width over its height.
 */
export function ideaPlan(
  idea: Idea,
  choices: FlowChoices,
  aspect: number,
  /** A tapped form's tone areas (D-073); the plan follows them instead of the circle. */
  tones: FormTones | null = null,
): PlanResult {
  const template = templateOf(idea);
  if (!template) return { reason: "form" };
  const spacingMm = ideaSpacingMm(requestFrom(choices, aspect), idea, DATASET);
  return planFor({
    template,
    spacingMm,
    tipMm: choices.tipMm,
    sheet: choices.sheet,
    aspect,
    area: choices.areaKind === "form" ? null : choices.area,
    form: choices.areaKind === "form" ? tones : null,
    light: choices.light,
    protectedSpots: choices.protectedSpots,
  });
}
