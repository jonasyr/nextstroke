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

describe("App shell", () => {
  it("names the product and offers the four screens as navigation", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Start" })).toBeTruthy();
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    const links = Array.from(nav.querySelectorAll("a")).map((a) => a.textContent);
    expect(links).toEqual(["Start", "Schnellvergleich", "Projekte", "Geführtes Projekt"]);
  });

  it("follows the hash and marks the current page", async () => {
    render(<App />);
    await act(async () => {
      window.location.hash = "#/compare";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(screen.getByRole("heading", { level: 1, name: "Schnellvergleich" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Schnellvergleich" }).getAttribute("aria-current"),
    ).toBe("page");
  });

  it("says that Quick Compare works offline while AI features need a network", async () => {
    render(<App />);
    await act(async () => setOnline(false));
    expect(screen.getByRole("status").textContent).toContain("Offline");
    await act(async () => setOnline(true));
    expect(screen.queryByRole("status")).toBeNull();
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
