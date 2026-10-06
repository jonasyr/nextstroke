import type { ProjectDeps, StorageStatus } from "@nextstroke/projects";
import type { Decoded } from "../compare/decode.ts";

/** What the guided flow needs from outside; the browser binds it in `browser.ts`, tests fake it. */
export interface CoachDeps {
  /** Null where the browser cannot store projects (no IndexedDB); the coach then says so. */
  projects: ProjectDeps | null;
  storage(): Promise<StorageStatus>;
  /** Asks the browser to keep projects (`persist()`). */
  persist(): Promise<boolean>;
  /** A photo at working size, upright, with its source size. */
  decode(blob: Blob): Promise<Decoded>;
}
