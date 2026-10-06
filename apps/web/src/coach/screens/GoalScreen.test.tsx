// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CHOICES, type FlowChoices } from "../flow.ts";
import { GoalScreen } from "./GoalScreen.tsx";

afterEach(cleanup);

const RECT = { left: 0, top: 0, width: 300, height: 400, right: 300, bottom: 400, x: 0, y: 0 };

function Harness({ image }: { image: ImageBitmap | null }) {
  const [choices, setChoices] = useState<FlowChoices>(DEFAULT_CHOICES);
  return (
    <>
      <GoalScreen
        image={image}
        choices={choices}
        onChange={(c) => setChoices((p) => ({ ...p, ...c }))}
        onBack={() => undefined}
        onNext={() => undefined}
      />
      <output data-testid="state">{JSON.stringify(choices)}</output>
    </>
  );
}

const state = () => JSON.parse(screen.getByTestId("state").textContent ?? "{}") as FlowChoices;
const photo = (name: string) => {
  const el = screen.getByRole("img", { name });
  el.getBoundingClientRect = () => ({ ...RECT, toJSON: () => RECT });
  return el;
};

describe("GoalScreen (D-067)", () => {
  it("marks the area, clears it, and protects details under more options", () => {
    render(<Harness image={{ width: 300, height: 400 } as ImageBitmap} />);
    expect(screen.getByText("Tippe auf die Stelle, die du verbessern willst.")).toBeTruthy();
    fireEvent.pointerDown(photo("Stelle markieren"), { clientX: 150, clientY: 200, pointerId: 1 });
    expect(state().area).toMatchObject({ x: 0.5, y: 0.5 });
    expect(screen.getByText(/^Markiert\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Markierung entfernen" }));
    expect(state().area).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Weitere Optionen" }));
    fireEvent.click(screen.getByRole("button", { name: "Geschützte Stellen (0)" }));
    expect(screen.getByText(/Tippe auf Details, die so bleiben sollen/)).toBeTruthy();
    fireEvent.pointerDown(photo("Geschützte Stellen markieren"), {
      clientX: 60,
      clientY: 60,
      pointerId: 1,
    });
    expect(state().protectedSpots).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Fertig mit geschützten Stellen" }));
    expect(screen.getByRole("button", { name: "Geschützte Stellen (1)" })).toBeTruthy();
  });

  it("asks only for goal and experience without a photo", () => {
    render(<Harness image={null} />);
    expect(screen.queryByRole("img")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Viel Übung" }));
    expect(state().skill).toBe("advanced");
  });
});
