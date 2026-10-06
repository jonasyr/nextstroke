import type { CoachIntent, CoachRequest, FinelinerProfile, Idea } from "@nextstroke/contracts";
import { de as DE_KEYS, type MessageKey, t } from "@nextstroke/ui";
import { mmLabel } from "./flow.ts";

/** Labels for the guided flow (prototype approved by the owner, D-067); copy lives in `de.ts`. */

export const INTENTS: CoachIntent[] = [
  "depth",
  "contrast",
  "texture",
  "outline",
  "background",
  "detail",
];
export const SKILLS: CoachRequest["skill"][] = ["beginner", "intermediate", "advanced"];

export const intentLabel = (id: CoachIntent, part: "" | ".hint" | ".phrase" = "") =>
  t(`intent.${id}${part}` as MessageKey);
export const skillLabel = (id: CoachRequest["skill"]) => t(`skill.${id}`);

export const LEVELS: Record<Idea["risk"], 1 | 2 | 3> = { careful: 1, balanced: 2, bold: 3 };
export const levelLabel = (risk: Idea["risk"]) => t(`level.${risk}`);

/** A technique in German; an id without a label shows as it is. */
export function techniqueLabel(technique: string): string {
  const key = `technique.${technique}`;
  return key in DE_KEYS ? t(key as MessageKey) : technique;
}

/** The pens most people start with, listed first; the rest follow under "Alle Stifte". */
export const POPULAR_PENS = [
  "sakura-pigma-micron",
  "staedtler-pigment-liner-308",
  "faber-castell-pitt-artist-pen-fineliner",
];

/** Common tips, offered when the pen is unknown or its maker lists none. */
export const COMMON_TIPS_MM = [0.1, 0.2, 0.3, 0.5, 0.8];

export function penName(pen: FinelinerProfile | undefined): string {
  if (!pen || pen.generic) return t("guided.unknown");
  return `${pen.brand} ${pen.productLine}`;
}

/** Popular pens first, then the others by name; the generic pen is offered separately. */
export function orderPens(pens: FinelinerProfile[]): FinelinerProfile[] {
  const named = pens.filter((p) => !p.generic);
  const rank = (p: FinelinerProfile) => {
    const i = POPULAR_PENS.indexOf(p.id);
    return i < 0 ? POPULAR_PENS.length : i;
  };
  return named.sort((a, b) => rank(a) - rank(b) || penName(a).localeCompare(penName(b), "de"));
}

/** "Für mehr Tiefe mit Pigma Micron 0,3 mm auf Zeichenpapier." */
export function ideasLead(
  intent: CoachIntent,
  pen: FinelinerProfile | undefined,
  tipMm: number | null,
  paper: { id: string; name: string } | undefined,
): string {
  return t("guided.lead", {
    intent: intentLabel(intent, ".phrase"),
    tool:
      pen && !pen.generic && pen.productLine
        ? t("guided.lead.pen", { pen: pen.productLine })
        : t("guided.lead.anyPen"),
    tip: tipMm === null ? "" : t("guided.lead.tip", { mm: mmLabel(tipMm) }),
    paper: !paper || paper.id === "unknown" ? "" : t("guided.lead.paper", { paper: paper.name }),
  });
}

/** The general rules behind every spacing, shown with the sourced facts (D-065). */
export const generalRules = (skill: CoachRequest["skill"]) =>
  t(skill === "beginner" ? "guided.rule.beginner" : "guided.rule");
