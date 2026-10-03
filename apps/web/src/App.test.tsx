// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App.tsx";

describe("App", () => {
  it("names the product in German UI copy", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "NextStroke" })).toBeTruthy();
    expect(screen.getByText("Physische Kunst, Schritt für Schritt.")).toBeTruthy();
  });
});
