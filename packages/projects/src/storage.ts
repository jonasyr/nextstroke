/**
 * What the user is told about local storage (spec §11): IndexedDB is best effort, the browser
 * may evict it, and an export is the copy that survives. Built from `navigator.storage` values.
 */
export interface StorageStatus {
  /** `navigator.storage.persisted()`; null where the browser cannot say. */
  persisted: boolean | null;
  /** `navigator.storage.estimate()`, in bytes; absent where unsupported. */
  usage?: number;
  quota?: number;
}

/** Share of the quota from which the user is warned. */
export const NEARLY_FULL = 0.8;

export function describeStorage(status: StorageStatus): string[] {
  const lines = [
    status.persisted
      ? "Projekte bleiben auf diesem Gerät, bis du sie löschst."
      : "Der Browser darf Projekte löschen, wenn der Speicher knapp wird.",
    "Exportiere wichtige Projekte: Die Datei ist die sichere Kopie.",
  ];
  if (status.usage !== undefined && status.quota) {
    if (status.usage / status.quota >= NEARLY_FULL) {
      lines.push("Der Speicher ist fast voll. Exportiere Projekte und lösche alte.");
    }
  }
  return lines;
}
