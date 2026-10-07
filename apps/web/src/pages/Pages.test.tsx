// @vitest-environment jsdom
import { createProject, MemoryStore, type ProjectDeps } from "@nextstroke/projects";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoachDeps } from "../coach/deps.ts";
import type { CompareDeps } from "../compare/QuickCompare.tsx";

vi.mock("../coach/browser.ts", () => ({ browserCoachDeps: {} }));
vi.mock("../compare/browser.ts", () => ({ browserDeps: {} }));

const { Page } = await import("./Pages.tsx");

afterEach(() => {
  cleanup();
  window.location.hash = "";
});

function setup() {
  let n = 0;
  const projects: ProjectDeps = {
    store: new MemoryStore(),
    now: () => "2026-10-07T12:00:00.000Z",
    id: (prefix) => `${prefix}_${String(++n).padStart(4, "0")}`,
    sha256: async () => "0".repeat(64),
  };
  const never = async () => {
    throw new Error("not used");
  };
  const coach = {
    projects,
    storage: async () => ({ persisted: true }),
    persist: async () => true,
    decode: never,
    rgba: () => {
      throw new Error("not used");
    },
    fromRgba: never,
    download: () => undefined,
    renderPdf: async () => null,
  } as CoachDeps;
  const compare = {
    decode: never,
    renderPdf: async () => null,
    share: async () => undefined,
    download: () => undefined,
    now: () => 0,
  } as unknown as CompareDeps;
  return { projects, coach, compare };
}

const photo = {
  bytes: new Uint8Array([1]),
  origin: "user-upload" as const,
  mimeType: "image/jpeg",
  width: 3,
  height: 4,
};

describe("Page routes (D-067, D-070)", () => {
  it("opens a project's pair in Quick Compare and goes back to the project", async () => {
    const { projects, coach, compare } = setup();
    const project = await createProject(projects, "Leer", photo);
    render(<Page route="compare" id={project.id} coach={coach} compare={compare} />);
    expect(await screen.findByText(/Noch nichts zum Vergleichen/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(window.location.hash).toBe(`#/projects/${project.id}`);
  });

  it("opens Quick Compare on its own, a project, and the coach", async () => {
    const { projects, coach, compare } = setup();
    const project = await createProject(projects, "Leuchtturm", photo);
    const { rerender } = render(<Page route="compare" coach={coach} compare={compare} />);
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(window.location.hash).toBe("#/");
    rerender(<Page route="projects" id={project.id} coach={coach} compare={compare} />);
    expect(await screen.findByRole("heading", { name: "Leuchtturm" })).toBeTruthy();
    rerender(<Page route="guided" coach={coach} compare={compare} />);
    expect(screen.getByRole("heading", { name: /Deine Zeichnung/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(window.location.hash).toBe("#/");
    rerender(<Page route="projects" coach={coach} compare={compare} />);
    await act(async () => undefined);
    expect(screen.getByRole("heading", { name: "Was willst du heute machen?" })).toBeTruthy();
  });
});
