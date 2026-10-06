import { describe, expect, it } from "vitest";
import { analyzeCard } from "./analyze.ts";
import { testCard } from "./testCard.ts";

const ok = (result: ReturnType<typeof analyzeCard>) => {
  if (!result.ok) throw new Error(JSON.stringify(result.problems));
  return result.card;
};

describe("test card measurements", () => {
  it("measures line width and which spacings stay separate", () => {
    const card = ok(analyzeCard(testCard(), 1.5));
    expect(card.lineWidthMm).toBeCloseTo(0.35, 1);
    expect(card.hatching.wide.separated).toBe(true);
    expect(card.hatching.wide.spacingMm).toBeCloseTo(2, 0);
    expect(card.hatching.middle.spacingMm ?? 0).toBeGreaterThan(0.85);
    expect(card.hatching.middle.spacingMm ?? 0).toBeLessThan(1.15);
    expect(card.hatching.tight.separated).toBe(true);
    expect(card.hatching.tight.tone).toBeGreaterThan(card.hatching.wide.tone);
    expect(card.crossTone).toBeGreaterThan(card.hatching.middle.tone);
    expect(card.overdraw.twice).toBeGreaterThan(card.overdraw.once);
    expect(card.scaleReliable).toBe(true);
    expect(card.lightEvenness).toBeGreaterThan(0.95);
  });

  it("sees a wider line and lines that run together", () => {
    const card = ok(analyzeCard(testCard({ lineWidthMm: 0.7, spacingsMm: [2, 1, 0.6] }), 1.5));
    expect(card.lineWidthMm).toBeCloseTo(0.7, 1);
    expect(card.hatching.tight.separated).toBe(false);
    expect(card.hatching.tight.spacingMm).toBeNull();
    expect(card.hatching.wide.separated).toBe(true);
  });

  it("measures fine and wide lines to a few hundredths of a millimetre", () => {
    for (const lineWidthMm of [0.2, 0.5, 0.7]) {
      for (const pxPerMm of [8, 12]) {
        const card = ok(analyzeCard(testCard({ lineWidthMm, pxPerMm }), 1.5));
        expect(card.lineWidthMm).toBeCloseTo(lineWidthMm, 1);
      }
    }
  });

  it("is not thrown by paper grain, and reports its texture", () => {
    const smooth = ok(analyzeCard(testCard(), 1.5));
    const grainy = ok(analyzeCard(testCard({ grain: 10 }), 1.5));
    expect(grainy.lineWidthMm).toBeCloseTo(0.35, 1);
    expect(grainy.hatching.middle.separated).toBe(true);
    expect(grainy.paperTexture).toBeGreaterThan(smooth.paperTexture);
  });

  it("copes with hand-drawn lines that slope a little", () => {
    const card = ok(analyzeCard(testCard({ slope: 0.05 }), 1.5));
    expect(card.hatching.middle.separated).toBe(true);
  });

  it("calls millimetres unreliable when the frame is not about 3 : 2", () => {
    expect(ok(analyzeCard(testCard(), 1)).scaleReliable).toBe(false);
  });

  it("rejects photos it cannot measure, and says why", () => {
    expect(analyzeCard(testCard({ pxPerMm: 5 }), 1.5)).toEqual({
      ok: false,
      problems: [{ kind: "resolution" }],
    });
    expect(analyzeCard(testCard({ lightFalloff: 0.4 }), 1.5)).toMatchObject({
      ok: false,
      problems: [{ kind: "light" }],
    });
    expect(analyzeCard(testCard({ ink: 200 }), 1.5)).toMatchObject({
      ok: false,
      problems: [{ kind: "contrast" }],
    });
    expect(analyzeCard(testCard({ blur: 4 }), 1.5)).toMatchObject({
      ok: false,
      problems: [{ kind: "blur" }],
    });
    expect(analyzeCard(testCard({ empty: [0, 5] }), 1.5)).toEqual({
      ok: false,
      problems: [
        { kind: "empty", cell: 0 },
        { kind: "empty", cell: 5 },
      ],
    });
  });
});
