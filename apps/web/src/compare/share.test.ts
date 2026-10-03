import { describe, expect, it, vi } from "vitest";
import { shareOrDownload } from "./share.ts";

const file = new File(["x"], "Vergleich.png", { type: "image/png" });

describe("shareOrDownload (legacy I3)", () => {
  it("uses the share sheet when files can be shared", async () => {
    const share = vi.fn(async () => {});
    const download = vi.fn();
    expect(await shareOrDownload(file, { canShare: () => true, share, download })).toBe("shared");
    expect(share).toHaveBeenCalledWith({ files: [file], title: "Vergleich.png" });
    expect(download).not.toHaveBeenCalled();
  });

  it("does nothing when the user cancels the share sheet", async () => {
    const abort = Object.assign(new Error("x"), { name: "AbortError" });
    const download = vi.fn();
    const result = await shareOrDownload(file, {
      canShare: () => true,
      share: vi.fn(async () => Promise.reject(abort)),
      download,
    });
    expect(result).toBe("cancelled");
    expect(download).not.toHaveBeenCalled();
  });

  it("falls back to a download when sharing is unavailable or fails", async () => {
    const download = vi.fn();
    expect(await shareOrDownload(file, { canShare: () => false, share: vi.fn(), download })).toBe(
      "downloaded",
    );
    expect(
      await shareOrDownload(file, {
        canShare: () => true,
        share: vi.fn(async () => Promise.reject(new Error("NotAllowed"))),
        download,
      }),
    ).toBe("downloaded");
    expect(download).toHaveBeenCalledTimes(2);
  });
});
