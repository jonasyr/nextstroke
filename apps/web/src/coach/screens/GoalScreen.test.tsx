// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CHOICES, type FlowChoices } from "../flow.ts";
import { formImage, formMask } from "../form.ts";
import { GoalScreen } from "./GoalScreen.tsx";

afterEach(cleanup);

const RECT = { left: 0, top: 0, width: 300, height: 400, right: 300, bottom: 400, x: 0, y: 0 };

/** A 300 × 400 drawing with one closed ring, for form mode. */
const drawing = formImage({
  width: 300,
  height: 400,
  data: Uint8Array.from({ length: 300 * 400 }, (_, i) =>
    Math.abs(Math.hypot((i % 300) - 150, Math.floor(i / 300) - 200) - 60) <= 1.5 ? 30 : 235,
  ),
});

/** A square frame with a small ring inside: a form inside a form. */
const nested = formImage({
  width: 300,
  height: 400,
  data: Uint8Array.from({ length: 300 * 400 }, (_, i) => {
    const x = i % 300;
    const y = Math.floor(i / 300);
    const frame =
      x >= 60 && x <= 240 && y >= 110 && y <= 290 && (x < 63 || x > 237 || y < 113 || y > 287);
    return frame || Math.abs(Math.hypot(x - 150, y - 200) - 30) <= 1.5 ? 30 : 235;
  }),
});

function Harness({ image, art = drawing }: { image: ImageBitmap | null; art?: typeof drawing }) {
  const [choices, setChoices] = useState<FlowChoices>(DEFAULT_CHOICES);
  const form = useMemo(
    () => (choices.areaKind === "form" ? { image: art, mask: formMask(art, choices.form) } : null),
    [choices.areaKind, choices.form, art],
  );
  return (
    <>
      <GoalScreen
        image={image}
        form={form}
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

  it("finds a tapped form, says why a tap fails, and corrects it by hand (D-073)", async () => {
    render(<Harness image={{ width: 300, height: 400 } as ImageBitmap} />);
    fireEvent.click(screen.getByRole("radio", { name: "Form" }));
    expect(screen.getByText(/Tippe auf die Form, die Schatten bekommen soll/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rückgängig" })).toHaveProperty("disabled", true);
    fireEvent.pointerDown(photo("Form markieren"), { clientX: 150, clientY: 200, pointerId: 1 });
    expect(screen.getByText("Suche die Form …")).toBeTruthy();
    await waitFor(() => expect(state().form.taps).toHaveLength(1));
    expect(screen.getByText(/Stimmt die blaue Fläche/)).toBeTruthy();
    fireEvent.pointerDown(photo("Form markieren"), { clientX: 10, clientY: 10, pointerId: 1 });
    await waitFor(() => expect(screen.getByText(/Hier ist der Umriss offen/)).toBeTruthy());
    expect(state().form.taps).toHaveLength(1);

    fireEvent.click(screen.getByRole("radio", { name: "flach" }));
    expect(state().form.kind).toBe("flat");
    fireEvent.click(screen.getByRole("radio", { name: "Malen" }));
    expect(screen.getByText(/über alles, was zur Form gehört/)).toBeTruthy();
    const canvas = photo("Form markieren");
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 60, clientY: 20, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 60.5, clientY: 20, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(state().form.strokes[0]?.points).toHaveLength(2);
    expect(state().form.strokes[0]?.value).toBe(1);
    fireEvent.click(screen.getByRole("radio", { name: "Radieren" }));
    expect(screen.getByText(/nicht dazugehört/)).toBeTruthy();
    fireEvent.pointerDown(canvas, { clientX: 150, clientY: 200, pointerId: 1 });
    fireEvent.pointerCancel(canvas, { pointerId: 1 });
    expect(state().form.strokes[1]?.value).toBe(0);

    fireEvent.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(state().form.strokes).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Neu" }));
    expect(state().form).toMatchObject({ taps: [], strokes: [], kind: "flat" });
    expect(screen.getByRole("radio", { name: "Antippen" })).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("radio", { name: "Kreis" }));
    expect(screen.getByRole("img", { name: "Stelle markieren" })).toBeTruthy();
  });

  it("steps between a form and the form around it (D-074)", async () => {
    render(<Harness image={{ width: 300, height: 400 } as ImageBitmap} art={nested} />);
    fireEvent.click(screen.getByRole("radio", { name: "Form" }));
    fireEvent.pointerDown(photo("Form markieren"), { clientX: 150, clientY: 200, pointerId: 1 });
    await waitFor(() => expect(state().form.taps).toHaveLength(1));
    expect(screen.getByText(/„Kleiner“ oder „Größer“/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kleiner" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Größer" }));
    expect(state().form.sizes).toEqual([1]);
    expect(screen.getByRole("button", { name: "Größer" })).toHaveProperty("disabled", true);
    fireEvent.click(screen.getByRole("button", { name: "Kleiner" }));
    expect(state().form.sizes).toEqual([0]);
  });
});
