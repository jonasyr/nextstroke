// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// IndexedDB is not in jsdom; Home then says projects cannot be stored, which the shell test needs not.
vi.mock("./coach/browser.ts", () => ({
  browserCoachDeps: {
    projects: null,
    storage: async () => ({ persisted: null }),
    persist: async () => false,
    decode: async () => {
      throw new Error("not used");
    },
  },
}));

const { App } = await import("./App.tsx");

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value });
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}

async function go(hash: string) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

describe("App shell (D-056, D-067)", () => {
  it("opens on the start screen with the coach and quick compare, without a navigation bar", async () => {
    render(<App />);
    await act(async () => undefined);
    expect(screen.getByText("NextStroke")).toBeTruthy();
    expect(
      screen.getByRole("heading", { level: 1, name: "Was willst du heute machen?" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Mit Coach weiterzeichnen/ }).getAttribute("href"),
    ).toBe("#/guided");
    expect(screen.getByRole("link", { name: /Schnell vergleichen/ }).getAttribute("href")).toBe(
      "#/compare",
    );
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("opens quick compare with a way back to the start", async () => {
    render(<App />);
    await go("#/compare");
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Vergleiche deine Zeichnung mit der Vorlage.",
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(window.location.hash).toBe("#/");
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
