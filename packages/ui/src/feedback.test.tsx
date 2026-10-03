// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

import { ErrorNotice, Loading } from "./feedback.tsx";

describe("feedback primitives", () => {
  it("announces loading politely", () => {
    render(<Loading label="Bild wird geladen" />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe("Bild wird geladen");
  });

  it("shows an error with what happened and how to recover", () => {
    render(<ErrorNotice title="Bild zu groß" detail="Bitte ein kleineres Bild wählen." />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Bild zu groß");
    expect(alert.textContent).toContain("Bitte ein kleineres Bild wählen.");
  });
});
