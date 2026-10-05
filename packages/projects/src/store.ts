import type { ImmutableAsset, Project } from "@nextstroke/contracts";

/** An immutable asset with its bytes. */
export interface StoredAsset {
  record: ImmutableAsset;
  bytes: Uint8Array;
}

/**
 * Where projects live (Phase 3 Task 4). The browser implements it on IndexedDB; tests use
 * `MemoryStore`. Writes are conditional, so a second tab or a stale screen cannot overwrite
 * newer work, and assets are never replaced (AGENTS rule 2).
 */
export interface ProjectStore {
  getProject(id: string): Promise<Project | null>;
  /** Writes when the stored revision equals `expected` (null: no project with that id yet). */
  putProject(project: Project, expected: number | null): Promise<boolean>;
  listProjects(): Promise<Project[]>;
  deleteProject(id: string): Promise<void>;
  getAsset(id: string): Promise<StoredAsset | null>;
  /** Adds an asset; the same id with the same hash is a no-op, a different hash is refused. */
  putAsset(asset: StoredAsset): Promise<void>;
  deleteAsset(id: string): Promise<void>;
}

export class ImmutableAssetError extends Error {}

/** An in-memory store with the same rules, for tests and as a fallback when storage fails. */
export class MemoryStore implements ProjectStore {
  private projects = new Map<string, Project>();
  private assets = new Map<string, StoredAsset>();

  async getProject(id: string) {
    return this.projects.get(id) ?? null;
  }
  async putProject(project: Project, expected: number | null) {
    const current = this.projects.get(project.id);
    if ((current?.revision ?? null) !== expected) return false;
    this.projects.set(project.id, project);
    return true;
  }
  async listProjects() {
    return [...this.projects.values()];
  }
  async deleteProject(id: string) {
    this.projects.delete(id);
  }
  async getAsset(id: string) {
    return this.assets.get(id) ?? null;
  }
  async putAsset(asset: StoredAsset) {
    const current = this.assets.get(asset.record.id);
    if (current) {
      if (current.record.sha256 !== asset.record.sha256) {
        throw new ImmutableAssetError(`asset ${asset.record.id} exists with other content`);
      }
      return;
    }
    this.assets.set(asset.record.id, asset);
  }
  async deleteAsset(id: string) {
    this.assets.delete(id);
  }
}
