import { describe, expect, it, vi } from "vitest";
import { decodeToWorking } from "./decode.ts";

function fakeBitmap(width: number, height: number) {
  return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

describe("decodeToWorking (legacy D1, Task 1)", () => {
  it("applies EXIF orientation and keeps small images as decoded", async () => {
    const full = fakeBitmap(1200, 900);
    const make = vi.fn(async () => full);
    const result = await decodeToWorking(new Blob(), make);
    expect(make).toHaveBeenCalledWith(expect.any(Blob), { imageOrientation: "from-image" });
    expect(result).toMatchObject({
      width: 1200,
      height: 900,
      sourceWidth: 1200,
      sourceHeight: 900,
    });
    expect(result.bitmap).toBe(full);
  });

  it("downsamples large photos to the working size and releases the full bitmap", async () => {
    const full = fakeBitmap(8064, 6048);
    const small = fakeBitmap(2048, 1536);
    const make = vi.fn().mockResolvedValueOnce(full).mockResolvedValueOnce(small);
    const result = await decodeToWorking(new Blob(), make);
    expect(make).toHaveBeenLastCalledWith(full, {
      resizeWidth: 2048,
      resizeHeight: 1536,
      resizeQuality: "high",
    });
    expect(full.close).toHaveBeenCalled();
    expect(result).toMatchObject({
      width: 2048,
      height: 1536,
      sourceWidth: 8064,
      sourceHeight: 6048,
    });
  });

  it("releases the full bitmap when resizing fails", async () => {
    const full = fakeBitmap(8064, 6048);
    const make = vi.fn().mockResolvedValueOnce(full).mockRejectedValueOnce(new Error("oom"));
    await expect(decodeToWorking(new Blob(), make)).rejects.toThrow("oom");
    expect(full.close).toHaveBeenCalled();
  });
});
