/**
 * One hint strip per editor mode, shown until dismissed (D-056). Stored per device in
 * localStorage when it works; private mode or blocked storage just shows hints again.
 */
export interface HintStore {
  seen(key: string): boolean;
  dismiss(key: string): void;
}

const KEY = "nextstroke.hints";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;

export function hintStore(storage: Storage | null): HintStore {
  const memory = new Set<string>();
  try {
    for (const key of JSON.parse(storage?.getItem(KEY) ?? "[]") as string[]) memory.add(key);
  } catch {
    // unreadable storage: start with no hints seen
  }
  return {
    seen: (key) => memory.has(key),
    dismiss(key) {
      memory.add(key);
      try {
        storage?.setItem(KEY, JSON.stringify([...memory]));
      } catch {
        // storage full or blocked: remembered for this session only
      }
    },
  };
}
