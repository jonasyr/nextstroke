import {
  type ExportManifest,
  ExportManifestSchema,
  ImmutableAssetSchema,
  type Project,
  ProjectSchema,
} from "@nextstroke/contracts";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { assetIdsOf, NotFoundError, type ProjectDeps } from "./repository.ts";
import type { StoredAsset } from "./store.ts";

/**
 * Project packages (Phase 3 Task 4, D-036): one zip with `manifest.json`, `project.json`, and
 * every asset with its record. The manifest hashes the project and every asset, so a package
 * that changed after export is refused, and import never replaces an existing asset.
 */

export const PACKAGE_FORMAT_VERSION = 1;

/** A package could not be read; `message` is German, for the user. */
export class PackageError extends Error {}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
};

const json = (value: unknown) => strToU8(JSON.stringify(value, null, 2));

export async function exportProject(
  deps: ProjectDeps,
  projectId: string,
  appVersion: string,
): Promise<Uint8Array> {
  const project = await deps.store.getProject(projectId);
  if (!project) throw new NotFoundError(projectId);
  const files: Record<string, Uint8Array> = {};
  const assets: ExportManifest["assets"] = [];
  for (const id of assetIdsOf(project)) {
    const stored = await deps.store.getAsset(id);
    if (!stored) throw new NotFoundError(id);
    const path = `assets/${id}.${EXTENSIONS[stored.record.mimeType] ?? "bin"}`;
    const record = `assets/${id}.json`;
    files[path] = stored.bytes;
    files[record] = json(stored.record);
    assets.push({ id, sha256: stored.record.sha256, path, record });
  }
  files["project.json"] = json(project);
  const manifest = ExportManifestSchema.parse({
    format: "nextstroke-project",
    formatVersion: PACKAGE_FORMAT_VERSION,
    appVersion,
    exportedAt: deps.now(),
    project: {
      id: project.id,
      sha256: await deps.sha256(files["project.json"]),
      path: "project.json",
    },
    assets,
  });
  files["manifest.json"] = json(manifest);
  // Images are compressed already; storing them saves time on the phone.
  return zipSync(files, { level: 0 });
}

function parse<T>(
  schema: { parse(v: unknown): T },
  bytes: Uint8Array | undefined,
  what: string,
): T {
  if (!bytes) throw new PackageError(`Im Paket fehlt ${what}.`);
  try {
    return schema.parse(JSON.parse(strFromU8(bytes)));
  } catch {
    throw new PackageError(
      `${what} im Paket ist beschädigt oder stammt aus einer neueren Version.`,
    );
  }
}

/**
 * Checks every hash, then stores the assets and the project. A project whose id exists already
 * comes in as a copy with a new id, so an import never overwrites local work.
 */
export async function importProject(deps: ProjectDeps, zip: Uint8Array): Promise<Project> {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(zip);
  } catch {
    throw new PackageError("Die Datei ist kein NextStroke-Projekt.");
  }
  const manifest = parse(ExportManifestSchema, files["manifest.json"], "das Inhaltsverzeichnis");
  const projectBytes = files[manifest.project.path];
  if (!projectBytes || (await deps.sha256(projectBytes)) !== manifest.project.sha256) {
    throw new PackageError("Das Projekt im Paket wurde verändert oder ist unvollständig.");
  }
  const project = parse(ProjectSchema, projectBytes, "das Projekt");
  const listed = new Set(manifest.assets.map((a) => a.id));
  if (!assetIdsOf(project).every((id) => listed.has(id))) {
    throw new PackageError("Im Paket fehlen Bilder des Projekts.");
  }
  const assets: StoredAsset[] = [];
  for (const entry of manifest.assets) {
    const bytes = files[entry.path];
    const record = parse(ImmutableAssetSchema, files[entry.record], "eine Bildbeschreibung");
    if (
      !bytes ||
      record.id !== entry.id ||
      record.sha256 !== entry.sha256 ||
      (await deps.sha256(bytes)) !== entry.sha256
    ) {
      throw new PackageError("Ein Bild im Paket wurde verändert oder ist unvollständig.");
    }
    assets.push({ record, bytes });
  }
  for (const asset of assets) await deps.store.putAsset(asset);
  const exists = (await deps.store.getProject(project.id)) !== null;
  const imported: Project = exists
    ? { ...project, id: deps.id("prj"), title: `${project.title} (Kopie)`, revision: 0 }
    : project;
  await deps.store.putProject(ProjectSchema.parse(imported), null);
  return imported;
}
