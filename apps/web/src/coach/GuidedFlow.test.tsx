// @vitest-environment jsdom
import { MemoryStore, type ProjectDeps } from "@nextstroke/projects";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CoachDeps } from "./deps.ts";
import { GuidedFlow } from "./GuidedFlow.tsx";

afterEach(cleanup);

function projectDeps(): ProjectDeps {
  let n = 0;
  return {
    store: new MemoryStore(),
    now: () => "2026-10-05T12:00:00.000Z",
    id: (prefix) => `${prefix}_${String(++n).padStart(4, "0")}`,
    sha256: async () => "0".repeat(64),
  };
}

function coach(projects: ProjectDeps | null, persisted = false) {
  const persist = vi.fn(async () => true);
  const deps: CoachDeps = {
    projects,
    storage: async () => ({ persisted }),
    persist,
    decode: async () => ({
      bitmap: { width: 300, height: 400 } as ImageBitmap,
      width: 300,
      height: 400,
      sourceWidth: 3000,
      sourceHeight: 4000,
    }),
    rgba: (image) => ({
      width: image.width,
      height: image.height,
      data: new Uint8ClampedArray(image.width * image.height * 4),
    }),
    fromRgba: async (rgba) => ({ width: rgba.width, height: rgba.height }) as ImageBitmap,
  };
  return { deps, persist };
}

const photo = () => new File([new Uint8Array([1, 2, 3])], "zeichnung.jpg", { type: "image/jpeg" });

async function takePhoto() {
  await act(async () => {
    fireEvent.change(screen.getByLabelText("Foto der Zeichnung wählen"), {
      target: { files: [photo()] },
    });
  });
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
const choose = (name: string | RegExp) => fireEvent.click(screen.getByRole("radio", { name }));

describe("guided flow (Phase 3 Task 5)", () => {
  it("walks from the photo to steps and saves each choice to the project", async () => {
    const projects = projectDeps();
    const { deps, persist } = coach(projects);
    const exit = vi.fn();
    render(<GuidedFlow deps={deps} onExit={exit} />);
    expect(screen.getByRole("button", { name: "Weiter" })).toHaveProperty("disabled", true);
    await takePhoto();
    const [created] = await projects.store.listProjects();
    expect(created).toMatchObject({ title: "Projekt vom 5. Okt.", revision: 0 });
    const original = await projects.store.getAsset(created?.originalAssetId ?? "");
    expect(original?.record).toMatchObject({ role: "original", width: 3000, height: 4000 });
    expect(persist).toHaveBeenCalledOnce();

    await act(async () => click("Weiter"));
    expect(screen.getByRole("heading", { name: /Stift und Papier/ })).toBeTruthy();
    choose("Sakura Pigma Micron");
    choose("0,3");
    expect(screen.getByText(/Strichstärken in mm laut Sakura/)).toBeTruthy();
    click("Alle 17 Stifte");
    expect(screen.getByRole("radio", { name: "Tombow MONO drawing pen" })).toBeTruthy();
    choose("Zeichenpapier");
    click("Weiter");

    choose(/Mehr Kontrast/);
    choose("Etwas Übung");
    await act(async () => click("Vorschläge zeigen"));
    expect(
      screen.getByText(/Für mehr Kontrast mit Pigma Micron 0,3 mm auf Zeichenpapier\./),
    ).toBeTruthy();
    const ideas = screen.getAllByRole("listitem");
    expect(ideas).toHaveLength(3);
    expect(ideas.map((i) => i.textContent?.match(/Vorsichtig|Ausgewogen|Mutig/)?.[0])).toEqual([
      "Vorsichtig",
      "Ausgewogen",
      "Mutig",
    ]);

    await act(async () =>
      fireEvent.click(screen.getAllByRole("button", { name: /Schritte/ })[1] as HTMLElement),
    );
    expect(screen.getByRole("heading", { name: "Anleitung" })).toBeTruthy();
    const first = screen.getAllByRole("button", { pressed: false })[0] as HTMLElement;
    fireEvent.click(first);
    expect(first.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText(/Laut Sakura/)).toBeTruthy();
    expect(screen.getByText(/Allgemeine Regel von NextStroke/)).toBeTruthy();

    const [saved] = await projects.store.listProjects();
    expect(saved?.request).toMatchObject({
      intent: "contrast",
      skill: "intermediate",
      finelinerId: "sakura-pigma-micron",
      ownedTipsMm: [0.3],
      paperId: "drawing",
    });
    expect(saved?.suggestions?.ideas).toHaveLength(3);
    expect(saved?.selectedIdea).toBe(1);
    expect(saved?.revision).toBe(3);
    expect(saved?.paperCorners?.[0]).toEqual([0.06, 0.06]);

    click("Fertig für heute");
    expect(exit).toHaveBeenCalled();
  });

  it("goes back step by step and keeps the choices", async () => {
    const { deps } = coach(projectDeps(), true);
    render(<GuidedFlow deps={deps} onExit={() => undefined} />);
    await takePhoto();
    await act(async () => click("Weiter"));
    fireEvent.click(screen.getAllByRole("radio", { name: /^Weiß ich nicht/ })[0] as HTMLElement);
    click("Weiter");
    click("Zurück");
    const pen = screen.getAllByRole("radio", { name: /^Weiß ich nicht/ })[0] as HTMLInputElement;
    expect(pen.checked).toBe(true);
    click("Zurück");
    expect(screen.getByRole("heading", { name: /Deine Zeichnung/ })).toBeTruthy();
  });

  it("works without storage and says when a photo cannot be opened", async () => {
    const { deps, persist } = coach(null);
    deps.decode = async () => {
      throw new Error("broken");
    };
    render(<GuidedFlow deps={deps} onExit={() => undefined} />);
    await takePhoto();
    expect(screen.getByText(/konnte nicht geöffnet werden/)).toBeTruthy();
    expect(persist).not.toHaveBeenCalled();
  });

  it("does not ask to keep projects again once the browser keeps them", async () => {
    const { deps, persist } = coach(projectDeps(), true);
    render(<GuidedFlow deps={deps} onExit={() => undefined} />);
    await takePhoto();
    expect(persist).not.toHaveBeenCalled();
  });

  it("keeps going when a save fails", async () => {
    const projects = projectDeps();
    const { deps } = coach(projects);
    render(<GuidedFlow deps={deps} onExit={() => undefined} />);
    await takePhoto();
    projects.store.putProject = async () => false;
    await act(async () => click("Weiter"));
    click("Weiter");
    await act(async () => click("Vorschläge zeigen"));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(/in einem anderen Tab geändert/)).toBeTruthy();
  });

  it("finds the sheet, lets a ring snap, and refuses folded corners", async () => {
    const { deps } = coach(projectDeps());
    const at = { x: 0.1, y: 0.1 };
    deps.vision = {
      load: async () => ({ ok: true, ms: 1 }),
      detectPaper: async () => ({
        corners: [at, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }, { x: 0.1, y: 0.9 }],
        confidence: 0.6,
      }),
      align: async () => null,
      refine: async () => null,
      corners: async (_image, _quad, indices) => indices.map((i) => (i === 0 ? at : null)),
    };
    render(<GuidedFlow deps={deps} onExit={() => undefined} />);
    await takePhoto();
    expect(screen.getByText(/Prüf die gelb gestrichelten Ringe/)).toBeTruthy();
    const canvas = screen.getByRole("img", { name: "Blattecken" });
    const rect = { left: 0, top: 0, width: 300, height: 400, right: 300, bottom: 400, x: 0, y: 0 };
    canvas.getBoundingClientRect = () => ({ ...rect, toJSON: () => rect });
    // Ring 0 dragged a little away, then let go: it snaps back onto the corner.
    fireEvent.pointerDown(canvas, { clientX: 30, clientY: 40, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 45, clientY: 55, pointerId: 1 });
    await act(async () => fireEvent.pointerUp(canvas, { pointerId: 1 }));
    expect(screen.getByText("An der Blattecke eingerastet")).toBeTruthy();
    // Ring 0 dragged onto the opposite corner: no sheet, so no straight view.
    fireEvent.pointerDown(canvas, { clientX: 30, clientY: 40, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 285, clientY: 380, pointerId: 1 });
    deps.vision.corners = async () => null;
    await act(async () => fireEvent.pointerUp(canvas, { pointerId: 1 }));
    await act(async () => click("Weiter"));
    expect(screen.getByText(/Die Ringe ergeben kein Blatt/)).toBeTruthy();
  });

  it("replaces a photo without leaving an empty project behind", async () => {
    const projects = projectDeps();
    const { deps } = coach(projects, true);
    render(<GuidedFlow deps={deps} onExit={() => undefined} />);
    await takePhoto();
    await takePhoto();
    expect(await projects.store.listProjects()).toHaveLength(1);
  });
});
