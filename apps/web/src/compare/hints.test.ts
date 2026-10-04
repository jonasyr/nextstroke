import { describe, expect, it } from "vitest";
import { hintStore } from "./hints.ts";

describe("hint store", () => {
  it("remembers dismissed hints in storage", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    };
    const first = hintStore(storage);
    expect(first.seen("compare")).toBe(false);
    first.dismiss("compare");
    expect(hintStore(storage).seen("compare")).toBe(true);
  });

  it("works for the session when storage is missing, broken or full", () => {
    const none = hintStore(null);
    none.dismiss("align");
    expect(none.seen("align")).toBe(true);
    const broken = hintStore({
      getItem: () => "{not json",
      setItem: () => {
        throw new Error("quota");
      },
    });
    broken.dismiss("corners");
    expect(broken.seen("corners")).toBe(true);
  });
});
