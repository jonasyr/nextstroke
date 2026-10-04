import { describe, expect, it } from "vitest";
import {
  type GestureContext,
  type GestureOutput,
  gestures,
  HOLD_MS,
  idleGesture,
} from "./gestures.ts";

const ctx = (over: Partial<GestureContext> = {}): GestureContext => ({
  center: { x: 200, y: 300 },
  scale: 0.5,
  view: { zoom: 1, x: 0, y: 0 },
  layer: { x: 0, y: 0, scale: 1, rotationDeg: 0 },
  moveLayer: false,
  originalWidth: 1000,
  ...over,
});

function drive(events: Parameters<typeof gestures>[1][], context = ctx()): GestureOutput[] {
  let state = idleGesture();
  const out: GestureOutput[] = [];
  for (const event of events) {
    const step = gestures(state, event, context);
    state = step.state;
    out.push(...step.outputs);
  }
  return out;
}

describe("gesture machine (legacy C4, C5, C7, V1, V2)", () => {
  it("treats a short press without movement as a tap", () => {
    const out = drive([
      { type: "down", id: 1, x: 10, y: 10, t: 0 },
      { type: "up", id: 1, t: 100 },
    ]);
    expect(out).toEqual([{ type: "tap" }]);
  });

  it("reveals while held after the hold delay and ends on release without a tap", () => {
    const out = drive([
      { type: "down", id: 1, x: 10, y: 10, t: 0 },
      { type: "tick", t: HOLD_MS - 1 },
      { type: "tick", t: HOLD_MS },
      { type: "up", id: 1, t: 900 },
    ]);
    expect(out).toEqual([
      { type: "hold", active: true },
      { type: "hold", active: false },
    ]);
  });

  it("ends a hold on cancel and on blur", () => {
    for (const end of [{ type: "cancel", id: 1 } as const, { type: "blur" } as const]) {
      const out = drive([{ type: "down", id: 1, x: 0, y: 0, t: 0 }, { type: "tick", t: 400 }, end]);
      expect(out.at(-1)).toEqual({ type: "hold", active: false });
    }
  });

  it("ignores jitter under 5 px and pans the view beyond it", () => {
    const jitter = drive([
      { type: "down", id: 1, x: 10, y: 10, t: 0 },
      { type: "move", id: 1, x: 13, y: 12, t: 20 },
      { type: "up", id: 1, t: 50 },
    ]);
    expect(jitter).toEqual([{ type: "tap" }]);
    const pan = drive([
      { type: "down", id: 1, x: 10, y: 10, t: 0 },
      { type: "move", id: 1, x: 40, y: 50, t: 20 },
      { type: "up", id: 1, t: 50 },
    ]);
    expect(pan).toEqual([{ type: "view", view: { zoom: 1, x: 30, y: 40 } }]);
  });

  it("pinches the view around the midpoint between 1× and 8×", () => {
    const out = drive([
      { type: "down", id: 1, x: 150, y: 300, t: 0 },
      { type: "down", id: 2, x: 250, y: 300, t: 0 },
      { type: "move", id: 2, x: 350, y: 300, t: 10 },
    ]);
    const last = out.at(-1);
    expect(last?.type).toBe("view");
    if (last?.type === "view") {
      expect(last.view.zoom).toBeCloseTo(2);
      expect(last.view.x).toBeCloseTo(50);
    }
  });

  it("moves the reference with one finger while aligning (D-059)", () => {
    const out = drive(
      [
        { type: "down", id: 1, x: 100, y: 100, t: 0 },
        { type: "move", id: 1, x: 300, y: 100, t: 10 },
      ],
      ctx({ moveLayer: true }),
    );
    const last = out.at(-1);
    expect(last?.type).toBe("layer");
    // 200 px on screen = 400 source px at scale 0.5 = 0.4 of the width
    expect(last?.type === "layer" && last.layer.x).toBeCloseTo(0.4);
  });

  it("zooms and pans the view with two fingers while aligning, not the reference", () => {
    const out = drive(
      [
        { type: "down", id: 1, x: 100, y: 100, t: 0 },
        { type: "down", id: 2, x: 200, y: 100, t: 0 },
        { type: "move", id: 2, x: 300, y: 100, t: 10 },
      ],
      ctx({ moveLayer: true }),
    );
    const last = out.at(-1);
    expect(last?.type).toBe("view");
    expect(last?.type === "view" && last.view.zoom).toBeCloseTo(2);
  });

  it("ignores a third pointer", () => {
    const out = drive([
      { type: "down", id: 1, x: 150, y: 300, t: 0 },
      { type: "down", id: 2, x: 250, y: 300, t: 0 },
      { type: "down", id: 3, x: 500, y: 500, t: 0 },
      { type: "move", id: 3, x: 900, y: 900, t: 5 },
      { type: "up", id: 3, t: 6 },
    ]);
    expect(out).toEqual([]);
  });

  it("does not tap when a second finger joined", () => {
    const out = drive([
      { type: "down", id: 1, x: 150, y: 300, t: 0 },
      { type: "down", id: 2, x: 250, y: 300, t: 10 },
      { type: "up", id: 2, t: 20 },
      { type: "up", id: 1, t: 30 },
    ]);
    expect(out).toEqual([]);
  });
});
