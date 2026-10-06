// @vitest-environment jsdom
import { createProject, MemoryStore, type ProjectDeps } from "@nextstroke/projects";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CoachDeps } from "./deps.ts";
import { Home } from "./Home.tsx";

afterEach(cleanup);

const NOW = "2026-10-05T12:00:00.000Z";

function projectDeps(): ProjectDeps {
  let n = 0;
  return {
    store: new MemoryStore(),
    now: () => NOW,
    id: (prefix) => `${prefix}_${String(++n).padStart(4, "0")}`,
    sha256: async () => "0".repeat(64),
  };
}

function coach(projects: ProjectDeps | null, persisted: boolean | null = false): CoachDeps {
  return {
    projects,
    storage: async () => ({ persisted }),
    persist: async () => true,
    decode: async () => {
      throw new Error("not used");
    },
  };
}

async function show(deps: CoachDeps) {
  render(<Home deps={deps} now={() => NOW} />);
  await act(async () => undefined);
}

const photo = {
  bytes: new Uint8Array([1, 2, 3]),
  origin: "user-upload" as const,
  mimeType: "image/jpeg",
  width: 3,
  height: 4,
};

describe("Home (D-067)", () => {
  it("lists the projects on this device with a link to each", async () => {
    const deps = projectDeps();
    const project = await createProject(deps, "Leuchtturm", photo);
    await show(coach(deps));
    const link = screen.getByRole("link", { name: /Leuchtturm/ });
    expect(link.getAttribute("href")).toBe(`#/projects/${project.id}`);
    expect(link.textContent).toContain("Noch kein Zwischenstand · heute");
    expect(screen.getByText(/Der Browser darf Projekte löschen/)).toBeTruthy();
  });

  it("explains how a project starts when there is none", async () => {
    await show(coach(projectDeps(), true));
    expect(screen.getByText(/Noch keine Projekte/)).toBeTruthy();
    expect(screen.getByText(/bis du sie löschst/)).toBeTruthy();
  });

  it("says so when the browser cannot store projects", async () => {
    await show(coach(null));
    expect(screen.getByText(/können in diesem Browser nicht gespeichert werden/)).toBeTruthy();
    expect(screen.queryByText(/Der Browser darf/)).toBeNull();
  });
});
