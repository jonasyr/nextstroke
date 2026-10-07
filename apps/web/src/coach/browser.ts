/**
 * Browser bindings for the guided flow. Thin glue only, excluded from unit coverage like
 * `compare/browser.ts`; exercised in a real browser (apps/web/e2e).
 */
import { newId } from "@nextstroke/contracts";
import { sha256Hex } from "@nextstroke/projects";
import { browserDeps } from "../compare/browser.ts";
import { IdbStore, requestPersistence, storageStatus } from "../projects/idbStore.ts";
import type { CoachDeps } from "./deps.ts";

const storage = typeof navigator === "undefined" ? undefined : navigator.storage;

export const browserCoachDeps: CoachDeps = {
  projects:
    typeof indexedDB === "undefined"
      ? null
      : {
          store: new IdbStore(indexedDB),
          now: () => new Date().toISOString(),
          id: (prefix) =>
            newId(prefix, () => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32),
          sha256: sha256Hex,
        },
  storage: () => storageStatus(storage),
  persist: () => requestPersistence(storage),
  decode: (blob) => browserDeps.decode(blob),
  ...(browserDeps.vision ? { vision: browserDeps.vision } : {}),
  rgba: (image) => browserDeps.rgba(image),
  fromRgba: (rgba) => browserDeps.fromRgba(rgba),
  download: (file) => browserDeps.download(file),
  renderPdf: (data, choose) => browserDeps.renderPdf(data, choose),
};
