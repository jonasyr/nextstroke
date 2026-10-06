import { vi } from "vitest";

/** jsdom has no 2D canvas: a context that accepts every call and setting, for drawing code paths. */
export function fakeCanvas() {
  const calls: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key) =>
      key in target
        ? target[key as string]
        : (..._args: unknown[]) => {
            calls.push(String(key));
          },
    set: (target, key, value) => {
      target[key as string] = value;
      return true;
    },
  });
  const spy = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockImplementation(() => ctx as unknown as CanvasRenderingContext2D);
  return { calls, restore: () => spy.mockRestore() };
}
