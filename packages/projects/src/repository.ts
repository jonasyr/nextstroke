import {
  type Checkpoint,
  type IdPrefix,
  type ImmutableAsset,
  ImmutableAssetSchema,
  type Project,
  ProjectSchema,
} from "@nextstroke/contracts";
import type { ProjectStore } from "./store.ts";

/** Everything the repository needs from outside: the store, a clock, ids and a hash. */
export interface ProjectDeps {
  store: ProjectStore;
  /** ISO date-time. */
  now(): string;
  id(prefix: IdPrefix): string;
  sha256(bytes: Uint8Array): Promise<string>;
}

/** A newer revision was saved meanwhile (another tab, or a screen opened before it). */
export class ConflictError extends Error {}
export class NotFoundError extends Error {}

export interface AssetInput {
  bytes: Uint8Array;
  role: ImmutableAsset["role"];
  origin: ImmutableAsset["origin"];
  mimeType: string;
  width: number;
  height: number;
}

/** SHA-256 as lowercase hex, with the platform's Web Crypto. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stores new bytes as an immutable asset and returns its record. */
export async function addAsset(deps: ProjectDeps, input: AssetInput): Promise<ImmutableAsset> {
  const record = ImmutableAssetSchema.parse({
    schemaVersion: 1,
    id: deps.id("ast"),
    role: input.role,
    origin: input.origin,
    sha256: await deps.sha256(input.bytes),
    mimeType: input.mimeType,
    width: input.width,
    height: input.height,
    createdAt: deps.now(),
  });
  await deps.store.putAsset({ record, bytes: input.bytes });
  return record;
}

export async function createProject(
  deps: ProjectDeps,
  title: string,
  original: Omit<AssetInput, "role">,
): Promise<Project> {
  const asset = await addAsset(deps, { ...original, role: "original" });
  const now = deps.now();
  const project = ProjectSchema.parse({
    schemaVersion: 1,
    id: deps.id("prj"),
    title,
    createdAt: now,
    updatedAt: now,
    revision: 0,
    originalAssetId: asset.id,
    checkpoints: [],
  });
  if (!(await deps.store.putProject(project, null))) throw new ConflictError(project.id);
  return project;
}

/**
 * Applies a change to the project as the caller last saw it. Fails with `ConflictError` when
 * the stored revision moved on, instead of silently overwriting newer work.
 */
export async function updateProject(
  deps: ProjectDeps,
  seen: Project,
  change: (project: Project) => Omit<Project, "revision" | "updatedAt">,
): Promise<Project> {
  const next = ProjectSchema.parse({
    ...change(seen),
    id: seen.id,
    revision: seen.revision + 1,
    updatedAt: deps.now(),
  });
  if (!(await deps.store.putProject(next, seen.revision))) throw new ConflictError(seen.id);
  return next;
}

/** A new photo of the work as an immutable checkpoint; the original is never touched. */
export async function addCheckpoint(
  deps: ProjectDeps,
  seen: Project,
  photo: Omit<AssetInput, "role">,
  extra: Pick<Checkpoint, "paperCorners"> = {},
): Promise<Project> {
  const asset = await addAsset(deps, { ...photo, role: "checkpoint" });
  return updateProject(deps, seen, (p) => ({
    ...p,
    checkpoints: [...p.checkpoints, { assetId: asset.id, createdAt: asset.createdAt, ...extra }],
  }));
}

/**
 * Sets, replaces or removes the project's template (D-070). The new image is stored as an
 * immutable `reference` asset; a replaced or removed one is deleted unless another project
 * uses it. Pass `null` to remove.
 */
export async function setReference(
  deps: ProjectDeps,
  seen: Project,
  template: { image: Omit<AssetInput, "role">; corners?: Project["referenceCorners"] } | null,
): Promise<Project> {
  const asset = template ? await addAsset(deps, { ...template.image, role: "reference" }) : null;
  const next = await updateProject(deps, seen, (p) => {
    const { referenceAssetId: _, referenceCorners: __, ...rest } = p;
    return asset
      ? {
          ...rest,
          referenceAssetId: asset.id,
          ...(template?.corners ? { referenceCorners: template.corners } : {}),
        }
      : rest;
  });
  const old = seen.referenceAssetId;
  if (old && old !== asset?.id) {
    const others = (await deps.store.listProjects()).filter((p) => p.id !== seen.id);
    if (!others.some((p) => assetIdsOf(p).includes(old))) await deps.store.deleteAsset(old);
  }
  return next;
}

/** Every asset a project refers to. */
export function assetIdsOf(project: Project): string[] {
  return [
    project.originalAssetId,
    ...(project.referenceAssetId ? [project.referenceAssetId] : []),
    ...project.checkpoints.map((c) => c.assetId),
  ];
}

/** Deletes a project and the assets no other project refers to. */
export async function deleteProject(deps: ProjectDeps, id: string): Promise<void> {
  const project = await deps.store.getProject(id);
  if (!project) throw new NotFoundError(id);
  const others = (await deps.store.listProjects()).filter((p) => p.id !== id);
  const kept = new Set(others.flatMap(assetIdsOf));
  await deps.store.deleteProject(id);
  for (const assetId of assetIdsOf(project)) {
    if (!kept.has(assetId)) await deps.store.deleteAsset(assetId);
  }
}
