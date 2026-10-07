// @vitest-environment jsdom
import type { Quad } from "@nextstroke/compare";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CornerEditor, onImage, ringAt } from "./CornerEditor.tsx";
import { fakeCanvas } from "./fakeCanvas.ts";

afterEach(cleanup);

const QUAD: Quad = [
  { x: 0.1, y: 0.1 },
  { x: 0.9, y: 0.1 },
  { x: 0.9, y: 0.9 },
  { x: 0.1, y: 0.9 },
];
const RECT = { left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0 };

describe("CornerEditor", () => {
  it("grabs the nearest ring within reach", () => {
    expect(ringAt(QUAD, { x: 0.12, y: 0.1 }, RECT)).toBe(0);
    expect(ringAt(QUAD, { x: 0.88, y: 0.92 }, RECT)).toBe(2);
    expect(ringAt(QUAD, { x: 0.5, y: 0.5 }, RECT)).toBeNull();
  });

  it("drags a ring, keeps it on the photo, and reports the drop", () => {
    const onMove = vi.fn();
    const onDrop = vi.fn();
    render(
      <CornerEditor
        image={{ width: 400, height: 400 } as ImageBitmap}
        quad={QUAD}
        unsure={[1]}
        onMove={onMove}
        onDrop={onDrop}
        label="Blattecken"
      />,
    );
    const canvas = screen.getByRole("img", { name: "Blattecken" });
    canvas.getBoundingClientRect = () => ({ ...RECT, toJSON: () => RECT });
    fireEvent.pointerDown(canvas, { clientX: 200, clientY: 200, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(onMove).not.toHaveBeenCalled();
    // Ring 1 sits at 18 + 0.9 × 364 px across, 18 + 0.1 × 364 px down (inside the free border).
    fireEvent.pointerDown(canvas, { clientX: 346, clientY: 54, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 450, clientY: 18, pointerId: 1 });
    expect(onMove).toHaveBeenLastCalledWith(1, { x: 1, y: 0 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(onDrop).toHaveBeenCalledWith(1);
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(onDrop).toHaveBeenCalledTimes(1);
  });

  it("draws the rings, flags unsure ones, and shows a loupe while dragging", () => {
    const canvas2d = fakeCanvas();
    const image = { width: 400, height: 400 } as ImageBitmap;
    const props = {
      image,
      unsure: [1],
      onMove: () => undefined,
      onDrop: () => undefined,
      label: "Ecken",
    };
    const { rerender } = render(<CornerEditor quad={QUAD} {...props} />);
    const el = screen.getByRole("img", { name: "Ecken" });
    el.getBoundingClientRect = () => ({ ...RECT, toJSON: () => RECT });
    expect(canvas2d.calls.filter((c) => c === "arc")).toHaveLength(4);
    for (const x of [54, 346]) {
      canvas2d.calls.length = 0;
      fireEvent.pointerDown(el, { clientX: x, clientY: 54, pointerId: 1 });
      expect(canvas2d.calls.filter((c) => c === "clip")).toHaveLength(1);
      fireEvent.pointerUp(el, { pointerId: 1 });
    }
    rerender(<CornerEditor quad={QUAD} {...props} unsure={[]} />);
    canvas2d.restore();
  });

  it("maps a pointer into the image inside the free border", () => {
    expect(onImage({ clientX: 18, clientY: 18 }, RECT)).toEqual({ x: 0, y: 0 });
    expect(onImage({ clientX: 382, clientY: 200 }, RECT)).toEqual({ x: 1, y: 0.5 });
    expect(onImage({ clientX: 1, clientY: 1 }, { ...RECT, width: 30, height: 30 })).toBeNull();
  });
});
