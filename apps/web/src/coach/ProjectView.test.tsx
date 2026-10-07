// @vitest-environment jsdom
import {
  addCheckpoint,
  createProject,
  MemoryStore,
  type ProjectDeps,
  sha256Hex,
  updateProject,
} from "@nextstroke/projects";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoachDeps } from "./deps.ts";
import { exportName, ProjectView } from "./ProjectView.tsx";

afterEach(cleanup);

function projectDeps(): ProjectDeps {
  let n = 0;
  return {
    store: new MemoryStore(),
    now: () => "2026-10-05T12:00:00.000Z",
    id: (prefix) => `${prefix}_${String(++n).padStart(4, "0")}`,
    sha256: sha256Hex,
  };
}

const photo = (b: number) => ({
  bytes: new Uint8Array([b, 2, 3]),
  origin: "user-upload" as const,
  mimeType: "image/jpeg",
  width: 3,
  height: 4,
});

function coach(projects: ProjectDeps | null) {
  const download = vi.fn();
  const deps: CoachDeps = {
    projects,
    storage: async () => ({ persisted: false }),
    persist: async () => true,
    decode: async () => {
      throw new Error("not used");
    },
    rgba: () => {
      throw new Error("not used");
    },
    fromRgba: async () => {
      throw new Error("not used");
    },
    download,
    renderPdf: async () => null,
  };
  return { deps, download };
}

async function show(deps: CoachDeps, id: string, navigate = vi.fn()) {
  render(<ProjectView deps={deps} id={id} navigate={navigate} />);
  await act(async () => undefined);
  return navigate;
}

describe("ProjectView", () => {
  it("names the export file after the project", () => {
    expect(exportName("Projekt vom 5. Okt.")).toBe("Projekt-vom-5-Okt.nextstroke.zip");
    expect(exportName("Löwe & Bär")).toBe("Lowe-Bar.nextstroke.zip");
    expect(exportName("???")).toBe("projekt.nextstroke.zip");
  });

  it("shows the start and checkpoints, the last idea, and saves the project as a file", async () => {
    const projects = projectDeps();
    let project = await createProject(projects, "Leuchtturm", photo(1));
    project = await addCheckpoint(projects, project, photo(2));
    project = await updateProject(projects, project, (p) => ({
      ...p,
      suggestions: {
        schemaVersion: 1,
        id: "sug_0001",
        ideas: [0, 1, 2].map((i) => ({
          title: `Idee ${i}`,
          risk: (["careful", "balanced", "bold"] as const)[i] ?? "careful",
          technique: "hatching",
          steps: ["a", "b"],
          materialClaimIds: [],
          why: "weil",
        })) as never,
      },
      selectedIdea: 1,
    }));
    const { deps, download } = coach(projects);
    await show(deps, project.id);
    expect(screen.getByRole("heading", { name: "Leuchtturm" })).toBeTruthy();
    expect(screen.getByText("Start · 5. Okt.")).toBeTruthy();
    expect(screen.getByText("Zwischenstand 1")).toBeTruthy();
    expect(screen.getByText("Idee 1")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Weiterzeichnen" }).getAttribute("href")).toBe(
      `#/guided/${project.id}`,
    );
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Als Datei sichern" })),
    );
    await vi.waitFor(() => expect(download).toHaveBeenCalled());
    const file = download.mock.calls[0]?.[0] as File;
    expect(file.name).toBe("Leuchtturm.nextstroke.zip");
    const bytes = new Uint8Array(await file.arrayBuffer());
    expect(String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0)).toBe("PK");
    expect(screen.getByText("Leuchtturm.nextstroke.zip gesichert")).toBeTruthy();
  });

  it("deletes only after a second tap", async () => {
    const projects = projectDeps();
    const project = await createProject(projects, "Weg", photo(1));
    const navigate = await show(coach(projects).deps, project.id);
    expect(screen.getByText("Noch kein Vorschlag gewählt.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Projekt löschen" }));
    expect(await projects.store.getProject(project.id)).not.toBeNull();
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: /Wirklich löschen/ })),
    );
    expect(await projects.store.getProject(project.id)).toBeNull();
    expect(navigate).toHaveBeenCalledWith("#/");
  });

  it("says when the project is not on this device, and when saving fails", async () => {
    const projects = projectDeps();
    const navigate = await show(coach(projects).deps, "prj_none");
    expect(screen.getByText(/gibt es auf diesem Gerät nicht/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Projekte" }));
    expect(navigate).toHaveBeenCalledWith("#/");
    cleanup();
    const project = await createProject(projects, "Kaputt", photo(1));
    await projects.store.deleteAsset(project.originalAssetId);
    await show(coach(projects).deps, project.id);
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Als Datei sichern" })),
    );
    await vi.waitFor(() =>
      expect(screen.getByText("Die Datei konnte nicht erstellt werden.")).toBeTruthy(),
    );
  });

  it("adds and removes a template, and opens the pair in Quick Compare (D-070)", async () => {
    const projects = projectDeps();
    const project = await createProject(projects, "Mit Vorlage", photo(1));
    const { deps } = coach(projects);
    deps.decode = async () => ({
      bitmap: { width: 30, height: 40 } as ImageBitmap,
      width: 30,
      height: 40,
      sourceWidth: 300,
      sourceHeight: 400,
    });
    await show(deps, project.id);
    expect(screen.queryByRole("link", { name: "Im Schnellvergleich öffnen" })).toBeNull();
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Vorlage wählen"), {
        target: { files: [new File([new Uint8Array([4])], "v.png", { type: "image/png" })] },
      });
    });
    expect(screen.getByRole("heading", { name: "Vorlage" })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Übernehmen" })));
    await vi.waitFor(() => expect(screen.getByText("Vorlage gespeichert.")).toBeTruthy());
    expect(
      screen.getByRole("link", { name: "Im Schnellvergleich öffnen" }).getAttribute("href"),
    ).toBe(`#/compare/${project.id}`);
    expect((await projects.store.getProject(project.id))?.referenceAssetId).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Entfernen" }));
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Wirklich entfernen?" })),
    );
    await vi.waitFor(() => expect(screen.getByText("Vorlage entfernt.")).toBeTruthy());
    expect((await projects.store.getProject(project.id))?.referenceAssetId).toBeUndefined();
  });

  it("goes back from the template step without a change", async () => {
    const projects = projectDeps();
    const project = await createProject(projects, "Ohne", photo(1));
    const { deps } = coach(projects);
    deps.decode = async () => ({
      bitmap: { width: 30, height: 40 } as ImageBitmap,
      width: 30,
      height: 40,
      sourceWidth: 300,
      sourceHeight: 400,
    });
    await show(deps, project.id);
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Vorlage wählen"), {
        target: { files: [new File([new Uint8Array([4])], "v.png", { type: "image/png" })] },
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(screen.getByText("Vorlage (optional)")).toBeTruthy();
    expect((await projects.store.getProject(project.id))?.referenceAssetId).toBeUndefined();
  });
});
