import { describe, expect, it } from "vitest";
import { adviceFrom } from "./advice.ts";
import { analyzeCard, type CardMeasurements } from "./analyze.ts";
import { testCard } from "./testCard.ts";

const measure = (spec: Parameters<typeof testCard>[0], aspect = 1.5): CardMeasurements => {
  const result = analyzeCard(testCard(spec), aspect);
  if (!result.ok) throw new Error(JSON.stringify(result.problems));
  return result.card;
};

describe("advice from the test card", () => {
  it("takes the closest spacing that stayed separate", () => {
    const advice = adviceFrom(measure({}), 0.3);
    expect(advice.minSpacingMm).toBe(0.6);
    expect(advice.lineWidthMm).toBeCloseTo(0.35, 1);
    expect(advice.spreads).toBe(false);
    expect(advice.overdrawDarkens).toBe(true);
    expect(advice.approximate).toBe(false);
  });

  it("keeps more room when the tight field ran together", () => {
    const advice = adviceFrom(measure({ lineWidthMm: 0.7 }), 0.3);
    expect(advice.minSpacingMm).toBe(1);
    expect(advice.spreads).toBe(true);
  });

  it("keeps clearly more room when even the widest field ran together", () => {
    const card = measure({});
    const merged = { ...card.hatching.wide, separated: false, spacingMm: null };
    const advice = adviceFrom(
      { ...card, hatching: { wide: merged, middle: merged, tight: merged } },
      null,
    );
    expect(advice.minSpacingMm).toBe(2.5);
    expect(advice.spreads).toBeNull();
  });

  it("does not judge spreading on an unreliable scale", () => {
    const advice = adviceFrom(measure({ lineWidthMm: 0.7 }, 1), 0.3);
    expect(advice.spreads).toBeNull();
    expect(advice.approximate).toBe(true);
  });
});
