// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeCanvas } from "./fakeCanvas.ts";
import { SPOT, type Spot } from "./flow.ts";
import { normalized, PhotoMarker } from "./PhotoMarker.tsx";

afterEach(cleanup);

const image = { width: 400, height: 400 } as ImageBitmap;
const RECT = { left: 0, top: 0, width: 400, height: 400, right: 400, bottom: 400, x: 0, y: 0 };

function show(props: Partial<Parameters<typeof PhotoMarker>[0]> = {}) {
  const onArea = vi.fn();
  const onProtected = vi.fn();
  render(
    <PhotoMarker
      image={image}
      mode="area"
      area={null}
      protectedSpots={[]}
      onArea={onArea}
      onProtected={onProtected}
      label="Stelle markieren"
      {...props}
    />,
  );
  const canvas = screen.getByRole("img", { name: props.label ?? "Stelle markieren" });
  canvas.getBoundingClientRect = () => ({ ...RECT, toJSON: () => RECT });
  return { canvas, onArea, onProtected };
}

describe("PhotoMarker (D-067)", () => {
  it("turns a pointer into a share of the photo", () => {
    expect(
      normalized({ clientX: 50, clientY: 30 }, { left: 10, top: 10, width: 80, height: 40 }),
    ).toEqual({
      x: 0.5,
      y: 0.5,
    });
    expect(
      normalized({ clientX: 1, clientY: 1 }, { left: 0, top: 0, width: 0, height: 0 }),
    ).toBeNull();
  });

  it("places the circle with a tap", () => {
    const { canvas, onArea } = show();
    fireEvent.pointerDown(canvas, { clientX: 200, clientY: 100, pointerId: 1 });
    expect(onArea).toHaveBeenCalledWith({ x: 0.5, y: 0.25, r: SPOT.start });
  });

  it("resizes the circle when dragged from its ring", () => {
    const area: Spot = { x: 0.5, y: 0.5, r: 0.1 };
    const { canvas, onArea } = show({ area });
    fireEvent.pointerDown(canvas, { clientX: 240, clientY: 200, pointerId: 1 });
    expect(onArea).not.toHaveBeenCalled();
    fireEvent.pointerMove(canvas, { clientX: 320, clientY: 200, pointerId: 1 });
    expect(onArea.mock.lastCall?.[0].r).toBeCloseTo(0.3);
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 360, clientY: 200, pointerId: 1 });
    expect(onArea).toHaveBeenCalledTimes(1);
  });

  it("adds a protected spot with a tap in protect mode", () => {
    const { canvas, onArea, onProtected } = show({ mode: "protect", label: "Geschützte Stellen" });
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(onProtected).toHaveBeenCalledWith([{ x: 0.25, y: 0.25, r: SPOT.start * 0.6 }]);
    expect(onArea).not.toHaveBeenCalled();
  });

  it("draws the area dashed and protected spots solid", () => {
    const canvas2d = fakeCanvas();
    show({ area: { x: 0.5, y: 0.5, r: 0.1 }, protectedSpots: [{ x: 0.2, y: 0.2, r: 0.05 }] });
    expect(canvas2d.calls.filter((c) => c === "arc")).toHaveLength(2);
    canvas2d.restore();
  });

  it("ignores presses it cannot place", () => {
    const { canvas, onArea } = show();
    canvas.getBoundingClientRect = () => ({ ...RECT, width: 0, height: 0, toJSON: () => RECT });
    fireEvent.pointerDown(canvas, { clientX: 1, clientY: 1, pointerId: 1 });
    expect(onArea).not.toHaveBeenCalled();
  });
});
