import { describe, expect, it } from "vitest";
import {
  CORNER_VIEW,
  type CompareState,
  canRedo,
  canUndo,
  compare,
  effectiveOpacity,
  IMAGE_CORNERS,
  initialState,
  PARAMS,
} from "./state.ts";

const run = (...actions: Parameters<typeof compare>[1][]): CompareState =>
  actions.reduce(compare, initialState());

describe("comparison state (D-056; legacy C1, C4, C5, V1, V4, V5)", () => {
  it("starts at 50 % Vorlage opacity in overlay mode", () => {
    const s = initialState();
    expect(s.opacity).toBe(0.5);
    expect(effectiveOpacity(s)).toBe(0.5);
  });

  it("clamps opacity", () => {
    expect(run({ type: "opacity", percent: 140 }).opacity).toBe(1);
    expect(run({ type: "opacity", percent: -5 }).opacity).toBe(0);
  });

  it("shows only the drawing by tap until the next opacity change, and while held", () => {
    const shown = run({ type: "toggle-reveal" });
    expect(effectiveOpacity(shown)).toBe(0);
    expect(effectiveOpacity(compare(shown, { type: "toggle-reveal" }))).toBe(0.5);
    expect(compare(shown, { type: "opacity", percent: 30 }).tapReveal).toBe(false);
    const held = run({ type: "hold", active: true });
    expect(effectiveOpacity(held)).toBe(0);
    expect(effectiveOpacity(compare(held, { type: "hold", active: false }))).toBe(0.5);
  });

  it("opens alignment visibly overlaid, and cancel restores the layer from before", () => {
    const s = run(
      { type: "opacity", percent: 100 },
      { type: "split", on: true },
      { type: "toggle-reveal" },
      { type: "alignment", open: true },
    );
    expect(s.aligning).toBe(true);
    expect(s.opacity).toBe(0.5);
    expect(s.split).toBeNull();
    expect(s.tapReveal).toBe(false);
    expect(run({ type: "opacity", percent: 30 }, { type: "alignment", open: true }).opacity).toBe(
      0.3,
    );
    const moved = compare(s, { type: "layer-nudge", dx: 0.01, dy: -0.02 });
    expect(moved.layer.x).toBeCloseTo(0.01);
    expect(moved.layer.y).toBeCloseTo(-0.02);
    const cancelled = compare(moved, { type: "alignment-cancel" });
    expect(cancelled.aligning).toBe(false);
    expect(cancelled.layer).toEqual(initialState().layer);
    const kept = compare(moved, { type: "alignment", open: false });
    expect(kept.layer.x).toBeCloseTo(0.01);
  });

  it("scales and rotates the layer in steps within their ranges", () => {
    let s = run({ type: "layer-scale", delta: 0.02 }, { type: "layer-rotate", delta: -1 });
    expect(s.layer.scale).toBeCloseTo(1.02);
    expect(s.layer.rotationDeg).toBeCloseTo(-1);
    s = compare(s, { type: "layer-scale", delta: 9 });
    expect(s.layer.scale).toBe(PARAMS.scale.max);
    s = compare(s, { type: "layer-rotate", delta: 99 });
    expect(s.layer.rotationDeg).toBe(PARAMS.rotation.max);
    expect(compare(s, { type: "reset-layer" }).layer).toEqual(initialState().layer);
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

  it("resets view, layer, reveal and history when an image is replaced", () => {
    const s = run(
      { type: "zoom", factor: 2 },
      { type: "checkpoint" },
      { type: "set-layer", layer: { x: 0.1, y: 0, scale: 1.2, rotationDeg: 3 } },
      { type: "toggle-reveal" },
      { type: "image-replaced" },
    );
    expect(s.view).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(s.layer).toEqual(initialState().layer);
    expect(s.tapReveal).toBe(false);
    expect(canUndo(s)).toBe(false);
  });

  it("resets everything the user adjusted", () => {
    const s = run(
      { type: "opacity", percent: 80 },
      { type: "set-layer", layer: { x: 0.1, y: 0, scale: 1.2, rotationDeg: 3 } },
      { type: "corners-set", corners: IMAGE_CORNERS },
      { type: "reset-all" },
    );
    expect([s.opacity, s.layer, s.corners, s.split]).toEqual([
      0.5,
      initialState().layer,
      null,
      null,
    ]);
  });
});

describe("undo and redo", () => {
  it("steps back and forward through checkpoints of what the user adjusted", () => {
    let s = run({ type: "checkpoint" }, { type: "opacity", percent: 80 });
    s = compare(compare(s, { type: "checkpoint" }), { type: "layer-rotate", delta: 2 });
    expect(canUndo(s)).toBe(true);
    expect(canRedo(s)).toBe(false);
    s = compare(s, { type: "undo" });
    expect(s.layer.rotationDeg).toBe(0);
    expect(s.opacity).toBe(0.8);
    s = compare(s, { type: "undo" });
    expect(s.opacity).toBe(0.5);
    expect(canUndo(s)).toBe(false);
    expect(compare(s, { type: "undo" })).toBe(s);
    s = compare(compare(s, { type: "redo" }), { type: "redo" });
    expect([s.opacity, s.layer.rotationDeg]).toEqual([0.8, 2]);
    expect(compare(s, { type: "redo" })).toBe(s);
  });

  it("skips checkpoints that changed nothing and clears redo after a new change", () => {
    let s = run({ type: "checkpoint" }, { type: "checkpoint" });
    expect(canUndo(s)).toBe(false);
    s = compare(compare(s, { type: "checkpoint" }), { type: "opacity", percent: 20 });
    s = compare(s, { type: "undo" });
    expect(canRedo(s)).toBe(true);
    s = compare(compare(s, { type: "checkpoint" }), { type: "opacity", percent: 70 });
    expect(canRedo(s)).toBe(false);
  });

  it("does not record view changes", () => {
    const s = run({ type: "checkpoint" }, { type: "zoom", factor: 2 });
    expect(canUndo(s)).toBe(false);
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
  });

  it("edits the quad of the current step", () => {
    let s = run({ type: "corners-begin" }, { type: "select-corner", index: 2 });
    s = compare(s, { type: "corner-nudge", dx: -0.002, dy: 0 });
    expect(s.refCorners?.[2]?.x).toBeCloseTo(0.998);
    s = compare(s, { type: "corner-set", index: 0, point: { x: 0.05, y: 0.04 } });
    expect(s.refCorners?.[0]).toEqual({ x: 0.05, y: 0.04 });
    s = compare(s, { type: "corners-next", corners: guess });
    expect(s.cornerStep).toBe("original");
    expect(s.corners).toEqual(guess);
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

  it("snaps a step to the whole image and resets it to where the step began", () => {
    let s = run(
      { type: "corners-begin" },
      { type: "corners-suggest", step: "reference", corners: guess },
      { type: "corner-set", index: 0, point: { x: 0.3, y: 0.3 } },
      { type: "corners-whole" },
    );
    expect(s.refCorners).toEqual(IMAGE_CORNERS);
    s = compare(s, { type: "corners-reset" });
    expect(s.refCorners).toEqual(guess);
    s = compare(s, { type: "corners-next", corners: guess });
    s = compare(s, { type: "corner-set", index: 2, point: { x: 0.5, y: 0.5 } });
    expect(compare(s, { type: "corners-reset" }).corners).toEqual(guess);
    expect(compare(initialState(), { type: "corners-whole" })).toEqual(initialState());
  });

  it("re-detects on request even after the user moved the corners", () => {
    const s = run(
      { type: "corners-begin" },
      { type: "corner-set", index: 0, point: { x: 0.3, y: 0.3 } },
      { type: "corners-suggest", step: "reference", corners: guess, force: true },
    );
    expect(s.refCorners).toEqual(guess);
  });

  it("applies detected paper corners on both images at once", () => {
    const s = run({ type: "corners-auto", refCorners: guess, corners: IMAGE_CORNERS });
    expect(s.refCorners).toEqual(guess);
    expect(s.corners).toEqual(IMAGE_CORNERS);
    expect(s.cornerStep).toBeNull();
  });

  it("clears corners on request, on reset and on a new image", () => {
    const s = run({ type: "corners-begin" }, { type: "corners-next", corners: guess });
    for (const action of [
      { type: "corners-clear" },
      { type: "reset-all" },
      { type: "image-replaced" },
    ] as const) {
      const cleared = compare(s, action);
      expect([cleared.corners, cleared.refCorners, cleared.cornerStep]).toEqual([null, null, null]);
    }
  });

  const detected = [
    { x: 0.2, y: 0.15 },
    { x: 0.8, y: 0.1 },
    { x: 0.85, y: 0.9 },
    { x: 0.15, y: 0.85 },
  ] as const;

  it("places detected paper corners on a step the user has not touched yet", () => {
    let s = run({ type: "corners-begin" });
    expect(compare(s, { type: "corners-suggest", step: "original", corners: detected })).toBe(s);
    s = compare(s, { type: "corners-suggest", step: "reference", corners: detected });
    expect(s.refCorners).toEqual(detected);
    s = compare(s, { type: "corners-next", corners: guess });
    s = compare(s, { type: "corners-suggest", step: "original", corners: detected });
    expect(s.corners).toEqual(detected);
    expect(s.refCorners).toEqual(detected);
  });

  it("never replaces corners the user moved or placed earlier", () => {
    const moved = run(
      { type: "corners-begin" },
      { type: "corner-nudge", dx: 0.002, dy: 0 },
      { type: "corners-suggest", step: "reference", corners: detected },
    );
    expect(moved.refCorners?.[0]?.x).toBeCloseTo(0.002);
    const set = run(
      { type: "corners-begin" },
      { type: "corners-next", corners: guess },
      { type: "corner-set", index: 0, point: { x: 0.3, y: 0.3 } },
      { type: "corners-suggest", step: "original", corners: detected },
    );
    expect(set.corners?.[0]).toEqual({ x: 0.3, y: 0.3 });
    const back = compare(set, { type: "corners-back" });
    expect(compare(back, { type: "corners-suggest", step: "reference", corners: detected })).toBe(
      back,
    );
    const again = run(
      { type: "corners-begin" },
      { type: "corners-next", corners: guess },
      { type: "corners-done" },
      { type: "corners-begin" },
    );
    expect(compare(again, { type: "corners-suggest", step: "reference", corners: detected })).toBe(
      again,
    );
    const next = compare(again, { type: "corners-next", corners: IMAGE_CORNERS });
    expect(compare(next, { type: "corners-suggest", step: "original", corners: detected })).toBe(
      next,
    );
  });

  it("applies an automatic alignment as corners of the whole reference", () => {
    const s = run(
      { type: "corners-begin" },
      { type: "corners-next", corners: guess },
      { type: "corners-done" },
      { type: "corners-set", corners: detected },
    );
    expect(s.corners).toEqual(detected);
    expect(s.refCorners).toBeNull();
    expect(s.cornerStep).toBeNull();
  });
});

describe("split view", () => {
  it("shows the original left and the full reference right of the divider", () => {
    const split = run({ type: "split", on: true });
    expect(split.split).toBe(0.5);
    expect(effectiveOpacity(split)).toBe(1);
    expect(effectiveOpacity(compare(split, { type: "hold", active: true }))).toBe(0);
    expect(run({ type: "split", on: true }, { type: "split", on: false }).split).toBeNull();
  });

  it("moves the divider within the original", () => {
    expect(run({ type: "split", on: true }, { type: "split-set", value: 0.2 }).split).toBe(0.2);
    expect(run({ type: "split", on: true }, { type: "split-set", value: 1.4 }).split).toBe(1);
    expect(run({ type: "split-set", value: 0.2 }).split).toBeNull();
  });

  it("ends when an opacity is chosen or alignment opens", () => {
    expect(run({ type: "split", on: true }, { type: "split", on: true }).split).toBe(0.5);
    expect(run({ type: "split", on: true }, { type: "opacity", percent: 40 }).split).toBeNull();
    expect(run({ type: "split", on: true }, { type: "alignment", open: true }).split).toBeNull();
    expect(run({ type: "alignment", open: true }, { type: "split", on: true }).aligning).toBe(
      false,
    );
  });
});
