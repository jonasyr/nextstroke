import { type IdPrefix, ProjectSchema } from "@nextstroke/contracts";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { beforeEach, describe, expect, it } from "vitest";
import { exportProject, importProject, PackageError } from "./package.ts";
import {
  addCheckpoint,
  ConflictError,
  createProject,
  deleteProject,
  NotFoundError,
  type ProjectDeps,
  sha256Hex,
  updateProject,
} from "./repository.ts";
import { describeStorage } from "./storage.ts";
import { ImmutableAssetError, MemoryStore } from "./store.ts";

const photo = (fill: number) => ({
  bytes: new Uint8Array([0xff, 0xd8, fill, fill, 0xff, 0xd9]),
  origin: "camera" as const,
  mimeType: "image/jpeg",
  width: 4032,
  height: 3024,
});

let deps: ProjectDeps;
let store: MemoryStore;

beforeEach(() => {
  store = new MemoryStore();
  let n = 0;
  let t = 0;
  deps = {
    store,
    now: () => new Date(Date.UTC(2026, 9, 5, 18, 0, t++)).toISOString(),
    id: (prefix: IdPrefix) => `${prefix}_${String(++n).padStart(4, "0")}`,
    sha256: sha256Hex,
  };
});

describe("local projects (Phase 3 Task 4)", () => {
  it("keeps the original immutable and adds checkpoints as new assets", async () => {
    const project = await createProject(deps, "Leuchtturm", photo(1));
    expect(project.revision).toBe(0);
    const original = await store.getAsset(project.originalAssetId);
    expect(original?.record.role).toBe("original");
    expect(original?.record.sha256).toMatch(/^[0-9a-f]{64}$/);
    const next = await addCheckpoint(deps, project, photo(2));
    expect(next.revision).toBe(1);
    expect(next.checkpoints).toHaveLength(1);
    const checkpoint = await store.getAsset(next.checkpoints[0]?.assetId ?? "");
    expect(checkpoint?.record.role).toBe("checkpoint");
    expect((await store.getAsset(project.originalAssetId))?.bytes).toEqual(photo(1).bytes);
    const corners: [number, number][] = [
      [0.1, 0.1],
      [0.9, 0.1],
      [0.9, 0.9],
      [0.1, 0.9],
    ];
    const third = await addCheckpoint(deps, next, photo(3), {
      paperCorners: corners as [
        [number, number],
        [number, number],
        [number, number],
        [number, number],
      ],
    });
    expect(third.checkpoints[1]?.paperCorners).toEqual(corners);
  });

  it("refuses to overwrite a newer revision", async () => {
    const project = await createProject(deps, "A", photo(1));
    await updateProject(deps, project, (p) => ({ ...p, title: "B" }));
    await expect(updateProject(deps, project, (p) => ({ ...p, title: "C" }))).rejects.toThrow(
      ConflictError,
    );
    expect((await store.getProject(project.id))?.title).toBe("B");
  });

  it("never replaces an asset with other content", async () => {
    const project = await createProject(deps, "A", photo(1));
    const stored = await store.getAsset(project.originalAssetId);
    if (!stored) throw new Error("missing");
    await store.putAsset(stored);
    await expect(
      store.putAsset({ ...stored, record: { ...stored.record, sha256: "0".repeat(64) } }),
    ).rejects.toThrow(ImmutableAssetError);
  });

  it("deletes a project with the assets only it uses", async () => {
    const a = await createProject(deps, "A", photo(1));
    const b = await createProject(deps, "B", photo(2));
    // B also shows A's original as its reference.
    await updateProject(deps, b, (p) => ({ ...p, referenceAssetId: a.originalAssetId }));
    await deleteProject(deps, a.id);
    expect(await store.getProject(a.id)).toBeNull();
    expect(await store.getAsset(a.originalAssetId)).not.toBeNull();
    await deleteProject(deps, b.id);
    expect(await store.getAsset(a.originalAssetId)).toBeNull();
    await expect(deleteProject(deps, b.id)).rejects.toThrow(NotFoundError);
  });
});

describe("project packages", () => {
  it("round-trips a project with every hash checked", async () => {
    const project = await addCheckpoint(
      deps,
      await createProject(deps, "Leuchtturm", photo(1)),
      photo(2),
    );
    const zip = await exportProject(deps, project.id, "0.1.0");
    const files = unzipSync(zip);
    expect(Object.keys(files).sort()).toEqual([
      "assets/ast_0001.jpg",
      "assets/ast_0001.json",
      "assets/ast_0003.jpg",
      "assets/ast_0003.json",
      "manifest.json",
      "project.json",
    ]);
    const into = new MemoryStore();
    const imported = await importProject({ ...deps, store: into }, zip);
    expect(imported).toEqual(project);
    expect((await into.getAsset(project.originalAssetId))?.bytes).toEqual(photo(1).bytes);
  });

  it("imports a project that exists already as a copy", async () => {
    const project = await createProject(deps, "Leuchtturm", photo(1));
    const copy = await importProject(deps, await exportProject(deps, project.id, "0.1.0"));
    expect(copy.id).not.toBe(project.id);
    expect(copy.title).toBe("Leuchtturm (Kopie)");
    expect(await store.listProjects()).toHaveLength(2);
  });

  it("refuses changed, incomplete or foreign packages", async () => {
    const project = await createProject(deps, "A", photo(1));
    const files = unzipSync(await exportProject(deps, project.id, "0.1.0"));
    const repack = (change: (f: Record<string, Uint8Array>) => void) => {
      const copy = { ...files };
      change(copy);
      return importProject({ ...deps, store: new MemoryStore() }, zipSync(copy));
    };
    await expect(importProject(deps, new Uint8Array([1, 2, 3]))).rejects.toThrow(PackageError);
    await expect(repack((f) => delete f["manifest.json"])).rejects.toThrow(/Inhaltsverzeichnis/);
    await expect(
      repack((f) => {
        f["manifest.json"] = strToU8("{}");
      }),
    ).rejects.toThrow(/beschädigt/);
    await expect(
      repack((f) => {
        f["project.json"] = strToU8(strFromU8(f["project.json"] as Uint8Array).replace("A", "B"));
      }),
    ).rejects.toThrow(/Projekt im Paket wurde verändert/);
    await expect(
      repack((f) => {
        f["assets/ast_0001.jpg"] = new Uint8Array([9]);
      }),
    ).rejects.toThrow(/Bild im Paket wurde verändert/);
    await expect(
      repack((f) => {
        const manifest = JSON.parse(strFromU8(f["manifest.json"] as Uint8Array));
        manifest.assets = [];
        f["manifest.json"] = strToU8(JSON.stringify(manifest));
      }),
    ).rejects.toThrow(/fehlen Bilder/);
    expect(await exportProject(deps, project.id, "0.1.0")).toBeInstanceOf(Uint8Array);
    await expect(exportProject(deps, "prj_none", "0.1.0")).rejects.toThrow(NotFoundError);
    ProjectSchema.parse(project);
  });
});

describe("storage status in plain German", () => {
  it("explains best-effort storage, persistence and a nearly full quota", () => {
    expect(describeStorage({ persisted: true })[0]).toMatch(/bis du sie löschst/);
    expect(describeStorage({ persisted: null })[0]).toMatch(/darf Projekte löschen/);
    expect(describeStorage({ persisted: false, usage: 90, quota: 100 })).toHaveLength(3);
    expect(describeStorage({ persisted: false, usage: 10, quota: 100 })).toHaveLength(2);
  });
});
