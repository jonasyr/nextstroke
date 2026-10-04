// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.tsx";

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}

describe("App shell (D-056)", () => {
  it("opens on the comparison start screen without a navigation bar", () => {
    render(<App />);
    expect(screen.getByText("NextStroke")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Vergleiche deine Zeichnung mit der Vorlage.",
      }),
    ).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("keeps later sections reachable by address, with a way back", async () => {
    render(<App />);
    await act(async () => {
      window.location.hash = "#/projects";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.getByRole("heading", { level: 1, name: "Projekte" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Zum Vergleich" }).getAttribute("href")).toBe("#/");
    await act(async () => {
      window.location.hash = "#/guided";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.getByRole("heading", { level: 1, name: "Geführtes Projekt" })).toBeTruthy();
  });

  it("says that comparing works offline while AI features need a network", async () => {
    render(<App />);
    await act(async () => setOnline(false));
    expect(screen.getAllByRole("status").some((s) => s.textContent?.includes("Offline"))).toBe(
      true,
    );
    await act(async () => setOnline(true));
    expect(screen.queryByText(/Offline/)).toBeNull();
  });
});

describe("update notice", () => {
  it("offers a reload when a new version is waiting", () => {
    let reloaded = false;
    render(
      <App
        onReloadForUpdate={() => {
          reloaded = true;
        }}
      />,
    );
    expect(screen.getByText("Eine neue Version ist bereit.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Neu laden" }));
    expect(reloaded).toBe(true);
  });
});
