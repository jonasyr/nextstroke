import type { PaperProfile } from "@nextstroke/contracts";
import type { Fact } from "./dataset.ts";

/**
 * Deterministic feasibility of fineliner techniques (Phase 3 Task 1). Rules run before any
 * model sees a request: what fails here is never suggested. Every reason names the sourced
 * claims it rests on, or says it is a general NextStroke rule (material-knowledge-base.md).
 */

export const TECHNIQUES = [
  "hatching",
  "crossHatching",
  "stippling",
  "contour",
  "lineWeight",
  "negativeSpace",
  "lighten",
] as const;
export type Technique = (typeof TECHNIQUES)[number];

export type Risk = "low" | "medium" | "high";

export interface Reason {
  /** German, for the user. */
  text: string;
  /** Claim ids behind it; empty for a general rule. */
  claims: string[];
}

export interface Feasibility {
  technique: Technique;
  feasible: boolean;
  risk: Risk;
  /** Smallest spacing between parallel lines or dots that keeps them apart, in mm. */
  minSpacingMm?: number;
  reasons: Reason[];
}

export interface Situation {
  /** Facts about the user's pen (`factsFor`); empty for the generic pen. */
  pen: Partial<Record<string, Fact>>;
  paper: PaperProfile;
  /** Tip sizes the user owns, in mm, when they said so. */
  ownedTipsMm?: number[];
}

const RISK: Risk[] = ["low", "medium", "high"];
const raise = (risk: Risk, by = 1): Risk => RISK[Math.min(2, RISK.indexOf(risk) + by)] as Risk;

const general = (text: string): Reason => ({ text, claims: [] });
const sourced = (text: string, fact: Fact | undefined): Reason => ({
  text,
  claims: fact?.claims.map((c) => c.id) ?? [],
});

/** The finest tip the user can draw with: owned sizes first, else the pen's finest, else unknown. */
function finestTipMm(s: Situation): number | null {
  if (s.ownedTipsMm?.length) return Math.min(...s.ownedTipsMm);
  const sizes = s.pen.tipSizesMm;
  if (!sizes || sizes.conflict || typeof sizes.value !== "string") return null;
  return Math.min(...sizes.value.split(",").map(Number));
}

export function feasibility(technique: Technique, s: Situation): Feasibility {
  const reasons: Reason[] = [];
  let risk: Risk = "low";
  if (technique === "lighten") {
    // Ink cannot be erased or covered with white: lighter areas come from leaving paper free.
    return {
      technique,
      feasible: false,
      risk: "high",
      reasons: [
        general(
          "Schwarze Tinte lässt sich nicht aufhellen oder radieren. Helle Stellen entstehen, indem man das Papier dort frei lässt und die Umgebung dunkler macht.",
        ),
      ],
    };
  }
  const finest = finestTipMm(s);
  const known = finest !== null;
  // A line is about as wide as the tip; a gap of at least two line widths keeps lines apart.
  const tip = finest ?? 0.5;
  let minSpacingMm: number | undefined;
  if (technique === "hatching" || technique === "crossHatching" || technique === "stippling") {
    minSpacingMm = Math.round(tip * 2 * 100) / 100;
    reasons.push(
      known
        ? sourced(
            `Mit ${tip} mm Spitze Abstand mindestens ${minSpacingMm} mm halten.`,
            s.pen.tipSizesMm,
          )
        : general(
            `Strichstärke unbekannt: lieber ${minSpacingMm} mm Abstand oder mehr, erst auf einem Rest testen.`,
          ),
    );
    if (!known) risk = raise(risk);
  }
  if (s.paper.feathers === "likely" || s.paper.feathers === "unknown") {
    if (technique === "crossHatching" || technique === "stippling") risk = raise(risk);
    reasons.push(
      general(
        s.paper.feathers === "likely"
          ? "Dieses Papier kann die Tinte verlaufen lassen: leicht aufdrücken, zügig ziehen, dichte Stellen meiden."
          : "Papier unbekannt: erst auf einem Rand oder Rest testen, ob die Tinte verläuft.",
      ),
    );
    if (minSpacingMm !== undefined) minSpacingMm = Math.round(minSpacingMm * 1.5 * 100) / 100;
  }
  if (technique === "crossHatching") {
    const smear = s.pen.smearResistant;
    if (smear?.value === true) {
      reasons.push(
        sourced(
          "Laut Hersteller verwischt die Tinte nicht; trotzdem jede Lage trocknen lassen.",
          smear,
        ),
      );
    } else {
      risk = raise(risk);
      reasons.push(
        general("Zweite Lage erst, wenn die erste trocken ist, sonst kann sie verwischen."),
      );
    }
  }
  if (technique === "lineWeight" && (s.ownedTipsMm?.length ?? 0) < 2) {
    reasons.push(
      general(
        "Mit nur einer Spitze: dickere Linien durch eine zweite, dicht daneben gezogene Linie.",
      ),
    );
  }
  return { technique, feasible: true, risk, ...(minSpacingMm ? { minSpacingMm } : {}), reasons };
}

/** Every technique with its feasibility; the coach picks only from the feasible ones. */
export function feasibleTechniques(s: Situation): Feasibility[] {
  return TECHNIQUES.map((t) => feasibility(t, s));
}
