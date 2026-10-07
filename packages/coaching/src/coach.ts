import type { CoachRequest, Idea, MaterialClaim, SuggestionSet } from "@nextstroke/contracts";
import {
  type Feasibility,
  factsFor,
  feasibility,
  type MaterialDataset,
  type Situation,
  type Technique,
} from "@nextstroke/materials";
import { FALLBACKS, type Level, TEMPLATES, type Template } from "./templates.ts";

/**
 * The deterministic coach (Phase 3 Task 3, D-065): exactly three ideas, Careful, Balanced and
 * Bold (D-014), from templates the feasibility rules allow for the user's pen and paper. No
 * model is involved: every number comes from the rules, every fact from a sourced claim.
 */

const LEVELS: Level[] = ["careful", "balanced", "bold"];

/** Beginners keep lines further apart: easier to control, and darker is always possible later. */
const BEGINNER_SPACING = 1.25;

const mm = (value: number) => `${String(Math.round(value * 100) / 100).replace(".", ",")} mm`;
/** Spacing a hand can hold: tenths of a millimetre. */
const spacingMm = (value: number) => mm(Math.round(value * 10) / 10);

export class UnknownMaterialError extends Error {}

function situation(request: CoachRequest, data: MaterialDataset): Situation {
  const pen = data.fineliners.find((p) => p.id === request.finelinerId);
  const paper = data.papers.find((p) => p.id === request.paperId);
  if (!pen) throw new UnknownMaterialError(`unknown fineliner ${request.finelinerId}`);
  if (!paper) throw new UnknownMaterialError(`unknown paper ${request.paperId}`);
  return {
    pen: factsFor(data, pen.id),
    paper,
    ...(request.ownedTipsMm?.length ? { ownedTipsMm: request.ownedTipsMm } : {}),
  };
}

/** The template for a level: the intent's own if the rules allow it at that level, else the fallback. */
function pick(
  request: CoachRequest,
  level: Level,
  s: Situation,
): { template: Template; check: Feasibility } {
  const own = TEMPLATES.find((t) => t.intent === request.intent && t.level === level);
  if (own) {
    const check = feasibility(own.technique, s);
    // Careful means low physical risk (D-014): a risky technique is never offered as careful.
    if (check.feasible && !(level === "careful" && check.risk === "high")) {
      return { template: own, check };
    }
  }
  const fallback = FALLBACKS[level];
  return { template: fallback, check: feasibility(fallback.technique, s) };
}

/** The spacing an idea states, in mm, to a tenth. */
function spacingValue(request: CoachRequest, check: Feasibility, s: Situation): number {
  // Every template states a spacing; techniques without one use the hatching spacing.
  const base = check.minSpacingMm ?? feasibility("hatching", s).minSpacingMm ?? 1;
  return Math.round((request.skill === "beginner" ? base * BEGINNER_SPACING : base) * 10) / 10;
}

/** The spacing in mm an idea for this request states, for the stroke-plan preview (D-071). */
export function ideaSpacingMm(request: CoachRequest, idea: Idea, data: MaterialDataset): number {
  const s = situation(request, data);
  return spacingValue(request, feasibility(idea.technique as Technique, s), s);
}

function idea(request: CoachRequest, level: Level, s: Situation): Idea {
  const { template, check } = pick(request, level, s);
  const spacing = spacingMm(spacingValue(request, check, s));
  const values = {
    spacing,
    place: request.area ? "im markierten Bereich" : "an der gewählten Stelle",
  };
  const cautions = check.reasons.filter((r) => r.kind === "caution").map((r) => r.text);
  const steps = [
    `Erst auf einem Rest desselben Papiers üben: ${template.practice(values)}.`,
    ...cautions,
    ...(request.protected?.length ? ["Die geschützten Stellen nicht berühren."] : []),
    ...template.steps(values),
    "Danach ein Foto machen und mit „Vergleichen“ prüfen, ob es besser geworden ist.",
  ];
  return {
    title: template.title,
    risk: level,
    technique: template.technique,
    steps,
    materialClaimIds: [...new Set(check.reasons.flatMap((r) => r.claims))],
    why: template.why,
  };
}

/** Exactly three ideas for a request; throws for a pen or paper the dataset does not know. */
export function suggest(request: CoachRequest, data: MaterialDataset, id: string): SuggestionSet {
  const s = situation(request, data);
  const [careful, balanced, bold] = LEVELS.map((level) => idea(request, level, s)) as [
    Idea,
    Idea,
    Idea,
  ];
  return { schemaVersion: 1, id, ideas: [careful, balanced, bold] };
}

/** One sourced fact behind an idea, in plain German, with where it comes from. */
export interface Evidence {
  text: string;
  publisher: string;
  url: string;
  retrievedAt: string;
}

const INK = {
  pigment: "Pigmenttinte",
  dye: "Farbstofftinte",
  "water-based": "Tinte auf Wasserbasis",
};

/** A claim in the user's words; the maker's own wording stays visible where there is no scale. */
export function describeClaim(claim: MaterialClaim): string {
  const v = claim.value;
  switch (claim.predicate) {
    case "inkType":
      return INK[v as keyof typeof INK] ?? String(v);
    case "tipSizesMm": {
      const sizes = String(v).split(",").map(Number);
      const range =
        sizes.length > 1
          ? `${mm(Math.min(...sizes))} bis ${mm(Math.max(...sizes))}`
          : mm(sizes[0] ?? 0);
      return `Spitzen von ${range}`;
    }
    case "waterResistantWhenDry":
      return v ? "wasserfest, wenn trocken" : "nicht wasserfest";
    case "smearResistant":
      return v ? "verwischt nicht" : "kann verwischen";
    case "lightfast":
      return `Lichtechtheit: „${v}“`;
    default:
      return `${claim.predicate}: ${String(v)}`;
  }
}

/** The evidence behind an idea, for the "Woher wissen wir das?" view (Task 3). */
export function evidenceFor(idea: Idea, data: MaterialDataset): Evidence[] {
  return idea.materialClaimIds.flatMap((id) => {
    const claim = data.claims.find((c) => c.id === id);
    const source = claim && data.sources.find((s) => s.id === claim.sourceId);
    if (!claim || !source) return [];
    // The pen's brand reads better than the publisher's legal name ("Laut Sakura").
    const brand = data.fineliners.find((f) => f.id === claim.subjectId)?.brand;
    return [
      {
        text: `Laut ${brand ?? source.publisher}: ${describeClaim(claim)}`,
        publisher: source.publisher,
        url: source.url,
        retrievedAt: source.retrievedAt,
      },
    ];
  });
}
