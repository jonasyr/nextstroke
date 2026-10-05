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
  /** "spacing" restates the spacing; "caution" is something to watch out for. */
  kind: "spacing" | "caution";
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

const general = (text: string, kind: Reason["kind"] = "caution"): Reason => ({
  kind,
  text,
  claims: [],
});
const sourced = (
  text: string,
  fact: Fact | undefined,
  kind: Reason["kind"] = "caution",
): Reason => ({
  kind,
  text,
  claims: fact?.claims.map((c) => c.id) ?? [],
});

/** The tip assumed when the user has not said which one they draw with: a common 0.3 mm. */
export const ASSUMED_TIP_MM = 0.3;
/** Closer than this, hand-drawn lines or dots run together, whatever the tip. */
export const MIN_HAND_SPACING_MM = 0.5;

const tenth = (value: number) => Math.round(value * 10) / 10;

/** Whether every owned size is one the pen's maker lists, so the catalogue can be cited. */
function fromCatalogue(owned: number[], sizes: Fact | undefined): boolean {
  if (!sizes || sizes.conflict || typeof sizes.value !== "string") return false;
  const listed = sizes.value.split(",").map(Number);
  return owned.every((mm) => listed.includes(mm));
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
  // The spacing follows the tip the user draws with, not the finest the maker sells.
  const owned = s.ownedTipsMm?.length ? Math.min(...s.ownedTipsMm) : null;
  const tip = owned ?? ASSUMED_TIP_MM;
  let minSpacingMm: number | undefined;
  if (technique === "hatching" || technique === "crossHatching" || technique === "stippling") {
    // A line is about as wide as the tip; a gap of two line widths keeps lines apart.
    minSpacingMm = tenth(Math.max(tip * 2, MIN_HAND_SPACING_MM));
    const at = String(tip).replace(".", ",");
    const gap = String(minSpacingMm).replace(".", ",");
    if (owned === null) {
      reasons.push(
        general(
          `Für eine übliche ${at}-mm-Spitze: mindestens ${gap} mm Abstand. Mit dickerer Spitze mehr.`,
          "spacing",
        ),
      );
    } else {
      const text = `Mit ${at} mm Spitze: mindestens ${gap} mm Abstand.`;
      reasons.push(
        fromCatalogue(s.ownedTipsMm ?? [], s.pen.tipSizesMm)
          ? sourced(text, s.pen.tipSizesMm, "spacing")
          : general(text, "spacing"),
      );
    }
    // An unknown pen may draw wider than its nominal size: keep more room.
    if (Object.keys(s.pen).length === 0) risk = raise(risk);
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
    if (minSpacingMm !== undefined) minSpacingMm = tenth(minSpacingMm * 1.5);
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
