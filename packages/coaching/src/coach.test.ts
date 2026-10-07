import { type CoachRequest, CoachRequestSchema, SuggestionSetSchema } from "@nextstroke/contracts";
import { DATASET } from "@nextstroke/materials";
import { describe, expect, it } from "vitest";
import {
  describeClaim,
  evidenceFor,
  ideaSpacingMm,
  suggest,
  UnknownMaterialError,
} from "./coach.ts";
import { TEMPLATES } from "./templates.ts";

const request: CoachRequest = {
  intent: "depth",
  skill: "intermediate",
  finelinerId: "sakura-pigma-micron",
  paperId: "bristol-smooth",
};
const ID = "sug_0123456789abcdef";

describe("the deterministic coach (Phase 3 Task 3)", () => {
  it("returns exactly three valid ideas, careful to bold", () => {
    const set = suggest(request, DATASET, ID);
    expect(SuggestionSetSchema.parse(set).ideas.map((i) => i.risk)).toEqual([
      "careful",
      "balanced",
      "bold",
    ]);
    expect(set.ideas[0].title).toBe("Die dunkelste Stelle schraffieren");
  });

  it("starts with practice on a scrap, ends with a check, and computes the spacing", () => {
    const steps = suggest(request, DATASET, ID).ideas[0].steps;
    expect(steps[0]).toMatch(/^Erst auf einem Rest desselben Papiers üben/);
    expect(steps.at(-1)).toMatch(/„Vergleichen“/);
    // No tip given: a common 0.3 mm tip, lines at least 0.6 mm apart.
    expect(steps.join(" ")).toMatch(/0,6 mm Abstand/);
    expect(steps.join(" ")).toMatch(/an der gewählten Stelle/);
  });

  it("cites the sourced sizes behind the spacing and explains them in plain German", () => {
    const careful = suggest({ ...request, ownedTipsMm: [0.3] }, DATASET, ID).ideas[0];
    expect(careful.materialClaimIds).toEqual(["sakura-pigma-micron-tipSizesMm-7"]);
    const [evidence] = evidenceFor(careful, DATASET);
    expect(evidence?.text).toBe("Laut Sakura: Spitzen von 0,15 mm bis 0,7 mm");
    expect(evidence?.url).toMatch(/^https:\/\/sakuracraypas\.com\//);
  });

  it("is more careful for beginners, unknown pens and unknown paper", () => {
    const beginner = suggest({ ...request, skill: "beginner" }, DATASET, ID).ideas[0].steps.join(
      " ",
    );
    expect(beginner).toMatch(/0,8 mm Abstand/);
    const beginnerRequest = { ...request, skill: "beginner" as const };
    const first = suggest(beginnerRequest, DATASET, ID).ideas[0];
    expect(ideaSpacingMm(beginnerRequest, first, DATASET)).toBe(0.8);
    const unknown = suggest(
      { ...request, intent: "texture", finelinerId: "generic", paperId: "unknown" },
      DATASET,
      ID,
    );
    // Stippling is too risky to be the careful idea here: the safe fallback takes its place.
    expect(unknown.ideas[0].title).toBe("Eine Kontur klarer ziehen");
    expect(unknown.ideas[1].steps.join(" ")).toMatch(/erst auf einem Rand oder Rest testen/);
    expect(unknown.ideas.every((i) => i.materialClaimIds.length === 0)).toBe(true);
  });

  it("uses the user's own tips, the marked area and protected details", () => {
    const set = suggest(
      {
        ...request,
        ownedTipsMm: [0.5],
        area: [
          [0.1, 0.1],
          [0.5, 0.1],
          [0.5, 0.5],
        ],
        protected: [
          [
            [0.2, 0.2],
            [0.3, 0.2],
            [0.3, 0.3],
          ],
        ],
      },
      DATASET,
      ID,
    );
    const steps = set.ideas[0].steps.join(" ");
    expect(steps).toMatch(/im markierten Bereich/);
    expect(steps).toMatch(/1 mm Abstand/);
    expect(steps).toMatch(/geschützten Stellen nicht berühren/);
    // 0.5 mm is in Micron's own list, so the list is cited.
    expect(set.ideas[0].materialClaimIds).toEqual(["sakura-pigma-micron-tipSizesMm-7"]);
  });

  it("never suggests lightening, and every intent gets three ideas for every paper", () => {
    for (const intent of CoachRequestSchema.shape.intent.options) {
      for (const paper of DATASET.papers) {
        const set = suggest({ ...request, intent, paperId: paper.id }, DATASET, ID);
        expect(SuggestionSetSchema.safeParse(set).success).toBe(true);
        expect(set.ideas.some((i) => i.technique === "lighten")).toBe(false);
      }
    }
    expect(TEMPLATES.some((t) => t.technique === "lighten")).toBe(false);
  });

  it("refuses a pen or paper the dataset does not know", () => {
    expect(() => suggest({ ...request, finelinerId: "nope" }, DATASET, ID)).toThrow(
      UnknownMaterialError,
    );
    expect(() => suggest({ ...request, paperId: "nope" }, DATASET, ID)).toThrow(/unknown paper/);
  });
});

describe("claims in plain German", () => {
  const claim = (predicate: string, value: string | boolean) => ({
    id: "c",
    subjectId: "p",
    predicate,
    value,
    sourceId: "s",
    evidenceLevel: "B" as const,
    confidence: "medium" as const,
    verifiedAt: "2026-10-05",
  });

  it("describes each kind of claim", () => {
    expect(describeClaim(claim("inkType", "pigment"))).toBe("Pigmenttinte");
    expect(describeClaim(claim("inkType", "other"))).toBe("other");
    expect(describeClaim(claim("tipSizesMm", "0.4"))).toBe("Spitzen von 0,4 mm");
    expect(describeClaim(claim("waterResistantWhenDry", true))).toBe("wasserfest, wenn trocken");
    expect(describeClaim(claim("waterResistantWhenDry", false))).toBe("nicht wasserfest");
    expect(describeClaim(claim("smearResistant", true))).toBe("verwischt nicht");
    expect(describeClaim(claim("smearResistant", false))).toBe("kann verwischen");
    expect(describeClaim(claim("lightfast", "non-fading"))).toBe("Lichtechtheit: „non-fading“");
    expect(describeClaim(claim("archival", true))).toBe("archival: true");
  });

  it("skips evidence it cannot resolve", () => {
    const idea = { ...suggest(request, DATASET, ID).ideas[0], materialClaimIds: ["missing"] };
    expect(evidenceFor(idea, DATASET)).toEqual([]);
  });
});
