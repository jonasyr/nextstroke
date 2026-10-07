// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { useNoTouchDefaults } from "./useNoTouchDefaults.ts";

afterEach(cleanup);

function Surface() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useNoTouchDefaults(ref);
  return <canvas ref={ref} aria-label="Fläche" role="img" />;
}

describe("useNoTouchDefaults", () => {
  it("cancels touchstart and selectstart on the surface, and lets go on unmount", () => {
    const { unmount } = render(<Surface />);
    const el = screen.getByRole("img", { name: "Fläche" });
    for (const type of ["touchstart", "selectstart"]) {
      const event = new Event(type, { cancelable: true });
      el.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    unmount();
    const after = new Event("touchstart", { cancelable: true });
    el.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it("also takes an element that mounts later", () => {
    function Later() {
      const [el, setEl] = useState<HTMLDivElement | null>(null);
      useNoTouchDefaults(el);
      return <div ref={setEl} role="application" aria-label="Bühne" />;
    }
    render(<Later />);
    const event = new Event("touchstart", { cancelable: true });
    screen.getByRole("application", { name: "Bühne" }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });
});
