import type { Project } from "@nextstroke/contracts";
import {
  ImmutableAssetError,
  type ProjectStore,
  type StorageStatus,
  type StoredAsset,
} from "@nextstroke/projects";

/**
 * IndexedDB adapter for local projects (Phase 3 Task 4, spec §11). iOS closes database
 * connections while the app is in the background, and another tab may upgrade the schema:
 * every operation reopens the database when needed and retries once, so returning to the app
 * never loses the session. Migrations run step by step from the stored version.
 */

export const DB_NAME = "nextstroke";

/** One step per schema version; step i upgrades version i to i + 1. */
export type Migration = (db: IDBDatabase, tx: IDBTransaction) => void;

export const MIGRATIONS: Migration[] = [
  (db) => {
    db.createObjectStore("projects", { keyPath: "id" });
    db.createObjectStore("assets", { keyPath: "record.id" });
  },
];

const request = <T>(r: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });

const done = (tx: IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new DOMException("aborted", "AbortError"));
  });

/** Opens the database at the latest version, retrying a failed open (iOS after backgrounding). */
export async function openDatabase(
  factory: IDBFactory,
  name: string = DB_NAME,
  migrations: Migration[] = MIGRATIONS,
  attempts = 3,
): Promise<IDBDatabase> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const open = factory.open(name, migrations.length);
      open.onupgradeneeded = (event) => {
        const tx = open.transaction as IDBTransaction;
        for (let v = event.oldVersion; v < migrations.length; v++) migrations[v]?.(open.result, tx);
      };
      const db = await request(open);
      // A newer tab wants to upgrade: let it, and reopen on the next operation.
      db.onversionchange = () => db.close();
      return db;
    } catch (error) {
      last = error;
    }
  }
  throw last;
}

export class IdbStore implements ProjectStore {
  private db: Promise<IDBDatabase> | null = null;

  constructor(
    private readonly factory: IDBFactory,
    private readonly name: string = DB_NAME,
    private readonly migrations: Migration[] = MIGRATIONS,
  ) {}

  /** Runs `work` in a transaction; a closed connection is reopened once and the work retried. */
  private async run<T>(
    stores: string[],
    mode: IDBTransactionMode,
    work: (tx: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      this.db ??= openDatabase(this.factory, this.name, this.migrations);
      let db: IDBDatabase;
      try {
        db = await this.db;
      } catch (error) {
        this.db = null;
        throw error;
      }
      let tx: IDBTransaction;
      try {
        tx = db.transaction(stores, mode);
      } catch (error) {
        // "The database connection is closing": iOS or an upgrade in another tab closed it.
        this.db = null;
        if (attempt === 0 && error instanceof DOMException && error.name === "InvalidStateError") {
          continue;
        }
        throw error;
      }
      const result = await work(tx);
      await done(tx);
      return result;
    }
  }

  /** Closes the connection; the next operation opens it again. */
  async close() {
    const db = await this.db;
    db?.close();
    this.db = null;
  }

  getProject(id: string) {
    return this.run(["projects"], "readonly", async (tx) => {
      return ((await request(tx.objectStore("projects").get(id))) as Project | undefined) ?? null;
    });
  }

  putProject(project: Project, expected: number | null) {
    // Read and write in one transaction, so the revision check cannot race another tab.
    return this.run(["projects"], "readwrite", async (tx) => {
      const store = tx.objectStore("projects");
      const current = (await request(store.get(project.id))) as Project | undefined;
      if ((current?.revision ?? null) !== expected) return false;
      store.put(project);
      return true;
    });
  }

  listProjects() {
    return this.run(["projects"], "readonly", async (tx) => {
      return (await request(tx.objectStore("projects").getAll())) as Project[];
    });
  }

  deleteProject(id: string) {
    return this.run(["projects"], "readwrite", async (tx) => {
      tx.objectStore("projects").delete(id);
    });
  }

  getAsset(id: string) {
    return this.run(["assets"], "readonly", async (tx) => {
      return ((await request(tx.objectStore("assets").get(id))) as StoredAsset | undefined) ?? null;
    });
  }

  putAsset(asset: StoredAsset) {
    return this.run(["assets"], "readwrite", async (tx) => {
      const store = tx.objectStore("assets");
      const current = (await request(store.get(asset.record.id))) as StoredAsset | undefined;
      if (current) {
        if (current.record.sha256 !== asset.record.sha256) {
          throw new ImmutableAssetError(`asset ${asset.record.id} exists with other content`);
        }
        return;
      }
      store.put({ record: { ...asset.record }, bytes: asset.bytes });
    });
  }

  deleteAsset(id: string) {
    return this.run(["assets"], "readwrite", async (tx) => {
      tx.objectStore("assets").delete(id);
    });
  }
}

/** What the browser says about storage; every API is optional (older iOS has none). */
export async function storageStatus(storage: StorageManager | undefined): Promise<StorageStatus> {
  const persisted = storage?.persisted ? await storage.persisted().catch(() => null) : null;
  const estimate = storage?.estimate ? await storage.estimate().catch(() => null) : null;
  return {
    persisted,
    ...(estimate?.usage !== undefined ? { usage: estimate.usage } : {}),
    ...(estimate?.quota !== undefined ? { quota: estimate.quota } : {}),
  };
}

/** Asks once to keep projects (`persist()`); false where unsupported or refused. */
export async function requestPersistence(storage: StorageManager | undefined): Promise<boolean> {
  if (!storage?.persist) return false;
  return storage.persist().catch(() => false);
}
