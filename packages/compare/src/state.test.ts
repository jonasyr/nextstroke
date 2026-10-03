import { describe, expect, it } from "vitest";
import {
  badge,
  CORNER_STEP,
  CORNER_VIEW,
  type CompareState,
  compare,
  effectiveOpacity,
  IMAGE_CORNERS,
  initialState,
  PARAMS,
} from "./state.ts";

const run = (...actions: Parameters<typeof compare>[1][]): CompareState =>
  actions.reduce(compare, initialState());

describe("comparison state (legacy C1–C6, V3–V5)", () => {
  it("starts at 65 % reference opacity in overlay mode", () => {
    const s = initialState();
    expect(s.opacity).toBeCloseTo(0.65);
    expect(badge(s)).toBe("compare.badge.overlay");
  });

  it("clamps opacity and names the end points", () => {
    expect(run({ type: "opacity", percent: 140 }).opacity).toBe(1);
    expect(badge(run({ type: "opacity", percent: 100 }))).toBe("compare.badge.reference");
    expect(badge(run({ type: "opacity", percent: -5 }))).toBe("compare.badge.original");
    expect(run({ type: "half" }).opacity).toBe(0.5);
    expect(run({ type: "reference" }).opacity).toBe(1);
  });

  it("reveals the original by tap until the next opacity change", () => {
    const shown = run({ type: "show-original" });
    expect(effectiveOpacity(shown)).toBe(0);
    expect(badge(shown)).toBe("compare.badge.reveal");
    expect(effectiveOpacity(compare(shown, { type: "toggle-reveal" }))).toBeCloseTo(0.65);
    expect(compare(shown, { type: "opacity", percent: 30 }).tapReveal).toBe(false);
  });

  it("reveals the original only while held", () => {
    const held = run({ type: "hold", active: true });
    expect(effectiveOpacity(held)).toBe(0);
    expect(effectiveOpacity(compare(held, { type: "hold", active: false }))).toBeCloseTo(0.65);
  });

  it("opens alignment at 50 % without tap reveal and closes back to comparison", () => {
    const s = run({ type: "show-original" }, { type: "alignment", open: true });
    expect(s.aligning).toBe(true);
    expect(s.opacity).toBe(0.5);
    expect(s.tapReveal).toBe(false);
    expect(badge(s)).toBe("compare.badge.align");
    expect(compare(s, { type: "alignment", open: false }).aligning).toBe(false);
  });

  it("nudges and sets layer parameters within their ranges", () => {
    let s = run({ type: "select-param", param: "rotation" }, { type: "nudge", direction: 1 });
    expect(s.layer.rotationDeg).toBeCloseTo(PARAMS.rotation.step);
    s = compare(s, { type: "set-param", value: 999 });
    expect(s.layer.rotationDeg).toBe(PARAMS.rotation.max);
    s = compare(s, { type: "select-param", param: "scale" });
    s = compare(s, { type: "set-param", value: 0.1 });
    expect(s.layer.scale).toBe(PARAMS.scale.min);
    s = compare(s, { type: "reset-layer" });
    expect(s.layer).toEqual(initialState().layer);
  });

  it("zooms between 0.8× and 8× around the centre and fits back", () => {
    let s = run({ type: "zoom", factor: 1.5 });
    expect(s.view.zoom).toBe(1.5);
    s = compare(s, { type: "set-view", view: { zoom: 2, x: 40, y: -20 } });
    s = compare(s, { type: "zoom", factor: 100 });
    expect(s.view).toEqual({ zoom: 8, x: 160, y: -80 });
    s = compare(s, { type: "zoom", factor: 0.001 });
    expect(s.view.zoom).toBe(0.8);
    expect(compare(s, { type: "fit" }).view).toEqual({ zoom: 1, x: 0, y: 0 });
  });

  it("resets view, layer and reveal when an image is replaced", () => {
    const s = run(
      { type: "zoom", factor: 2 },
      { type: "set-layer", layer: { x: 0.1, y: 0, scale: 1.2, rotationDeg: 3 } },
      { type: "show-original" },
      { type: "image-replaced" },
    );
    expect(s.view).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(s.layer).toEqual(initialState().layer);
    expect(s.tapReveal).toBe(false);
    expect(s.opacity).toBeCloseTo(0.65);
  });

  it("toggles whether gestures move the layer while aligning", () => {
    expect(run({ type: "align-gestures", enabled: false }).alignGestures).toBe(false);
  });
});

describe("paper corners in the state (two steps: reference, then original)", () => {
  const guess = [
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.1 },
    { x: 0.9, y: 0.9 },
    { x: 0.1, y: 0.9 },
  ] as const;

  it("starts on the reference with its image corners and a fitted view", () => {
    const s = run(
      { type: "zoom", factor: 2 },
      { type: "split", on: true },
      { type: "corners-begin" },
    );
    expect(s.cornerStep).toBe("reference");
    expect(s.refCorners).toEqual(IMAGE_CORNERS);
    expect(s.view).toEqual(CORNER_VIEW);
    expect(compare(s, { type: "fit" }).view).toEqual(CORNER_VIEW);
    expect(s.split).toBeNull();
    expect(badge(s)).toBe("compare.badge.cornersReference");
  });

  it("edits the quad of the current step", () => {
    let s = run({ type: "corners-begin" }, { type: "select-corner", index: 2 });
    s = compare(s, { type: "corner-nudge", dx: -1, dy: 0 });
    expect(s.refCorners?.[2]?.x).toBeCloseTo(1 - CORNER_STEP);
    s = compare(s, { type: "corner-set", index: 0, point: { x: 0.05, y: 0.04 } });
    expect(s.refCorners?.[0]).toEqual({ x: 0.05, y: 0.04 });
    s = compare(s, { type: "corners-next", corners: guess });
    expect(s.cornerStep).toBe("original");
    expect(s.corners).toEqual(guess);
    expect(badge(s)).toBe("compare.badge.cornersOriginal");
    s = compare(s, { type: "corner-set", index: 1, point: { x: 0.8, y: 0.2 } });
    expect(s.corners?.[1]).toEqual({ x: 0.8, y: 0.2 });
    expect(s.refCorners?.[1]).toEqual({ x: 1, y: 0 });
  });

  it("keeps earlier original corners instead of the new guess", () => {
    const done = run(
      { type: "corners-begin" },
      { type: "corners-next", corners: guess },
      { type: "corners-done" },
    );
    expect(done.cornerStep).toBeNull();
    expect(effectiveOpacity(done)).toBe(0.5);
    const again = compare(compare(done, { type: "corners-begin" }), {
      type: "corners-next",
      corners: IMAGE_CORNERS,
    });
    expect(again.corners).toEqual(guess);
    expect(compare(again, { type: "corners-back" }).cornerStep).toBe("reference");
  });

  it("cancels back to the corners from before", () => {
    const s = run(
      { type: "corners-begin" },
      { type: "corner-set", index: 0, point: { x: 0.2, y: 0.2 } },
      { type: "corners-next", corners: guess },
      { type: "corners-cancel" },
    );
    expect(s.cornerStep).toBeNull();
    expect(s.corners).toBeNull();
    expect(s.refCorners).toBeNull();
  });

  it("ignores corner edits outside the corner steps", () => {
    const s = initialState();
    expect(compare(s, { type: "corner-nudge", dx: 1, dy: 0 })).toBe(s);
    expect(compare(s, { type: "corner-set", index: 0, point: { x: 0, y: 0 } })).toBe(s);
    expect(compare(s, { type: "corners-next", corners: guess })).toBe(s);
  });

  it("clears corners on request, on reset and on a new image", () => {
    const s = run({ type: "corners-begin" }, { type: "corners-next", corners: guess });
    for (const action of [
      { type: "corners-clear" },
      { type: "reset-layer" },
      { type: "image-replaced" },
    ] as const) {
      const cleared = compare(s, action);
      expect([cleared.corners, cleared.refCorners, cleared.cornerStep]).toEqual([null, null, null]);
    }
  });
});

describe("split view", () => {
  it("shows the original left and the full reference right of the divider", () => {
    const split = run({ type: "split", on: true });
    expect(split.split).toBe(0.5);
    expect(effectiveOpacity(split)).toBe(1);
    expect(badge(split)).toBe("compare.badge.split");
    expect(effectiveOpacity(compare(split, { type: "hold", active: true }))).toBe(0);
    expect(run({ type: "split", on: true }, { type: "split", on: false }).split).toBeNull();
  });

  it("moves the divider within the original", () => {
    expect(run({ type: "split", on: true }, { type: "split-set", value: 0.2 }).split).toBe(0.2);
    expect(run({ type: "split", on: true }, { type: "split-set", value: 1.4 }).split).toBe(1);
    expect(run({ type: "split-set", value: 0.2 }).split).toBeNull();
  });

  it("ends when an opacity is chosen or alignment opens", () => {
    expect(run({ type: "split", on: true }, { type: "half" }).split).toBeNull();
    expect(run({ type: "split", on: true }, { type: "alignment", open: true }).split).toBeNull();
    expect(run({ type: "alignment", open: true }, { type: "split", on: true }).aligning).toBe(
      false,
    );
  });
});
