import {
  addCheckpoint,
  createProject,
  MemoryStore,
  type ProjectDeps,
  setReference,
  updateProject,
} from "@nextstroke/projects";
import { describe, expect, it } from "vitest";
import { projectPair } from "./pair.ts";

function projectDeps(): ProjectDeps {
  let n = 0;
  return {
    store: new MemoryStore(),
    now: () => "2026-10-07T12:00:00.000Z",
    id: (prefix) => `${prefix}_${String(++n).padStart(4, "0")}`,
    sha256: async (bytes) => String(bytes[0]).padStart(64, "0"),
  };
}

const photo = (b: number) => ({
  bytes: new Uint8Array([b]),
  origin: "user-upload" as const,
  mimeType: "image/jpeg",
  width: 3,
  height: 4,
});
const corners: [[number, number], [number, number], [number, number], [number, number]] = [
  [0.1, 0.1],
  [0.9, 0.1],
  [0.9, 0.9],
  [0.1, 0.9],
];

describe("projectPair (D-070)", () => {
  it("has nothing to compare for a lone start photo, or an unknown project", async () => {
    const deps = projectDeps();
    const project = await createProject(deps, "A", photo(1));
    expect(await projectPair(deps.store, project.id)).toBeNull();
    expect(await projectPair(deps.store, "prj_none")).toBeNull();
  });

  it("compares the latest checkpoint with the start, carrying the saved corners", async () => {
    const deps = projectDeps();
    let project = await createProject(deps, "A", photo(1));
    project = await addCheckpoint(deps, project, photo(2), { paperCorners: corners });
    project = await addCheckpoint(deps, project, photo(3));
    const pair = await projectPair(deps.store, project.id);
    expect(pair?.original.name).toBe("Zwischenstand 2");
    expect(pair?.original.corners).toBeUndefined();
    expect(pair?.reference.name).toBe("Start");
    expect([...new Uint8Array(await (pair?.original.blob ?? new Blob()).arrayBuffer())]).toEqual([
      3,
    ]);
  });

  it("compares the latest drawing with the template when there is one", async () => {
    const deps = projectDeps();
    let project = await createProject(deps, "A", photo(1));
    project = await updateCorners(deps, project);
    project = await setReference(deps, project, { image: photo(7), corners });
    const pair = await projectPair(deps.store, project.id);
    expect(pair?.original.name).toBe("Start");
    expect(pair?.original.corners?.[0]).toEqual({ x: 0.2, y: 0.2 });
    expect(pair?.reference).toMatchObject({
      name: "Vorlage",
      corners: [{ x: 0.1, y: 0.1 }, {}, {}, {}],
    });
  });
});

async function updateCorners(
  deps: ProjectDeps,
  project: Awaited<ReturnType<typeof createProject>>,
) {
  return updateProject(deps, project, (p) => ({
    ...p,
    paperCorners: [
      [0.2, 0.2],
      [0.8, 0.2],
      [0.8, 0.8],
      [0.2, 0.8],
    ],
  }));
}
