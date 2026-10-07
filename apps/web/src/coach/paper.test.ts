import type { Quad } from "@nextstroke/compare";
import { describe, expect, it } from "vitest";
import type { VisionDeps } from "../compare/visionClient.ts";
import { guessCorners, INSET_CORNERS, snapCorner } from "./paper.ts";

const image = { width: 100, height: 100 } as ImageBitmap;
const SHEET: Quad = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 },
];

function vision(overrides: Partial<VisionDeps> = {}): VisionDeps {
  return {
    load: async () => ({ ok: true, ms: 1 }),
    detectPaper: async () => ({ corners: SHEET, confidence: 0.99 }),
    align: async () => null,
    refine: async () => null,
    corners: async (_i, _q, indices) => indices.map(() => null),
    ...overrides,
  };
}

describe("paper corners for the guided photo", () => {
  it("takes a sure guess as it is", async () => {
    expect(await guessCorners(vision(), image)).toEqual({ quad: SHEET, unsure: [], found: true });
  });

  it("checks an unsure guess corner by corner and flags the rest", async () => {
    const guess = await guessCorners(
      vision({
        detectPaper: async () => ({ corners: SHEET, confidence: 0.6 }),
        corners: async () => [{ x: 0.11, y: 0.1 }, null, null, null],
      }),
      image,
    );
    expect(guess.found).toBe(true);
    expect(guess.unsure.length).toBeGreaterThan(0);
  });

  it("starts the rings inside the photo when there is no sheet or no vision", async () => {
    const none = { quad: INSET_CORNERS, unsure: [], found: false };
    expect(await guessCorners(null, image)).toEqual(none);
    expect((await guessCorners(null, image, SHEET)).quad).toEqual(SHEET);
    expect(await guessCorners(vision({ load: async () => ({ ok: false, ms: 0 }) }), image)).toEqual(
      none,
    );
    expect(await guessCorners(vision({ detectPaper: async () => null }), image)).toEqual(none);
    expect(
      await guessCorners(
        vision({
          detectPaper: async () => {
            throw new Error("worker gone");
          },
        }),
        image,
      ),
    ).toEqual(none);
  });

  it("snaps a dropped ring, but not back where the user moved it away from", async () => {
    const at = { x: 0.1, y: 0.1 };
    const v = vision({ corners: async () => [at] });
    expect(await snapCorner(v, image, SHEET, 0, [])).toEqual(at);
    expect(await snapCorner(v, image, SHEET, 0, [at])).toBeNull();
    expect(await snapCorner(null, image, SHEET, 0, [])).toBeNull();
    expect(await snapCorner(vision({ corners: async () => null }), image, SHEET, 0, [])).toBeNull();
    const broken = vision({
      corners: async () => {
        throw new Error("x");
      },
    });
    expect(await snapCorner(broken, image, SHEET, 0, [])).toBeNull();
  });
});
