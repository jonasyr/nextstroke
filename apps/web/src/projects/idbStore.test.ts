import type { IdPrefix } from "@nextstroke/contracts";
import {
  addCheckpoint,
  ConflictError,
  createProject,
  exportProject,
  ImmutableAssetError,
  importProject,
  type ProjectDeps,
  sha256Hex,
  updateProject,
} from "@nextstroke/projects";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it, vi } from "vitest";
import {
  IdbStore,
  MIGRATIONS,
  type Migration,
  openDatabase,
  requestPersistence,
  storageStatus,
} from "./idbStore.ts";

const photo = (fill: number) => ({
  bytes: new Uint8Array([0xff, 0xd8, fill, 0xff, 0xd9]),
  origin: "camera" as const,
  mimeType: "image/jpeg",
  width: 100,
  height: 80,
});

function depsFor(store: IdbStore): ProjectDeps {
  let n = 0;
  return {
    store,
    now: () => "2026-10-05T20:00:00.000Z",
    id: (prefix: IdPrefix) => `${prefix}_${String(++n).padStart(4, "0")}`,
    sha256: sha256Hex,
  };
}

describe("IndexedDB project store (Phase 3 Task 4)", () => {
  it("stores projects and immutable assets, and refuses stale writes", async () => {
    const store = new IdbStore(new IDBFactory());
    const deps = depsFor(store);
    const project = await createProject(deps, "Leuchtturm", { ...photo(1), role: "original" });
    const next = await addCheckpoint(deps, project, photo(2));
    expect((await store.getProject(project.id))?.revision).toBe(1);
    expect((await store.getAsset(project.originalAssetId))?.bytes).toEqual(photo(1).bytes);
    await expect(updateProject(deps, project, (p) => p)).rejects.toThrow(ConflictError);
    const original = await store.getAsset(next.originalAssetId);
    if (!original) throw new Error("missing");
    await store.putAsset(original);
    await expect(
      store.putAsset({ ...original, record: { ...original.record, sha256: "0".repeat(64) } }),
    ).rejects.toThrow(ImmutableAssetError);
    expect(await store.listProjects()).toHaveLength(1);
    expect(await store.getProject("prj_none")).toBeNull();
    expect(await store.getAsset("ast_none")).toBeNull();
  });

  it("round-trips a package between two browsers' databases", async () => {
    const a = new IdbStore(new IDBFactory());
    const project = await createProject(depsFor(a), "A", { ...photo(3), role: "original" });
    const zip = await exportProject(depsFor(a), project.id, "0.1.0");
    const b = new IdbStore(new IDBFactory());
    expect(await importProject(depsFor(b), zip)).toEqual(project);
    await b.deleteProject(project.id);
    await b.deleteAsset(project.originalAssetId);
    expect(await b.listProjects()).toEqual([]);
  });

  it("reopens after the connection was closed, as iOS does in the background", async () => {
    const factory = new IDBFactory();
    const store = new IdbStore(factory);
    const project = await createProject(depsFor(store), "A", { ...photo(1), role: "original" });
    await store.close();
    expect((await store.getProject(project.id))?.title).toBe("A");
  });

  it("yields to a newer tab's upgrade, then reopens and keeps the data", async () => {
    const factory = new IDBFactory();
    const store = new IdbStore(factory);
    const project = await createProject(depsFor(store), "A", { ...photo(1), role: "original" });
    const addIndex: Migration = (_db, tx) =>
      tx.objectStore("projects").createIndex("title", "title");
    // Another tab ships version 2: this connection closes so its upgrade is not blocked.
    const newer = await openDatabase(factory, undefined, [...MIGRATIONS, addIndex]);
    expect(newer.version).toBe(2);
    newer.close();
    const upgraded = new IdbStore(factory, undefined, [...MIGRATIONS, addIndex]);
    expect((await upgraded.getProject(project.id))?.title).toBe("A");
    // The old tab's code still expects version 1: it tries to reopen and is told to update.
    await expect(store.getProject(project.id)).rejects.toMatchObject({ name: "VersionError" });
  });

  it("retries a failed open, and reports one that keeps failing", async () => {
    const factory = new IDBFactory();
    const flaky = {
      calls: 0,
      open(name: string, version?: number) {
        this.calls++;
        if (this.calls === 1) throw new DOMException("lost", "UnknownError");
        return factory.open(name, version);
      },
    };
    const db = await openDatabase(flaky as unknown as IDBFactory);
    expect(flaky.calls).toBe(2);
    db.close();
    const broken = {
      open() {
        throw new DOMException("no storage", "UnknownError");
      },
    } as unknown as IDBFactory;
    await expect(openDatabase(broken)).rejects.toThrow("no storage");
    const store = new IdbStore(broken);
    await expect(store.listProjects()).rejects.toThrow("no storage");
  });
});

describe("storage status", () => {
  it("reads what the browser offers and asks to persist", async () => {
    const storage = {
      persisted: vi.fn(async () => false),
      estimate: vi.fn(async () => ({ usage: 10, quota: 100 })),
      persist: vi.fn(async () => true),
    } as unknown as StorageManager;
    expect(await storageStatus(storage)).toEqual({ persisted: false, usage: 10, quota: 100 });
    expect(await requestPersistence(storage)).toBe(true);
    expect(await storageStatus(undefined)).toEqual({ persisted: null });
    expect(await requestPersistence(undefined)).toBe(false);
    const failing = {
      persisted: vi.fn(async () => {
        throw new Error("no");
      }),
      estimate: vi.fn(async () => {
        throw new Error("no");
      }),
      persist: vi.fn(async () => {
        throw new Error("no");
      }),
    } as unknown as StorageManager;
    expect(await storageStatus(failing)).toEqual({ persisted: null });
    expect(await requestPersistence(failing)).toBe(false);
  });
});
