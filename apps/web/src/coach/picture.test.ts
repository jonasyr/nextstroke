import { describe, expect, it, vi } from "vitest";
import { PdfPasswordError } from "../compare/pdf.ts";
import { loadPicture, type PictureError } from "./picture.ts";

const decoded = {
  bitmap: { width: 30, height: 40 } as ImageBitmap,
  width: 30,
  height: 40,
  sourceWidth: 300,
  sourceHeight: 400,
};

function deps(overrides: Partial<Parameters<typeof loadPicture>[0]> = {}) {
  return {
    decode: vi.fn(async () => decoded),
    renderPdf: vi.fn(async () => ({
      blob: new Blob([new Uint8Array([9, 9])], { type: "image/png" }),
      page: 2,
      count: 3,
    })),
    ...overrides,
  };
}

const file = (name: string, type: string, bytes = [1, 2, 3]) =>
  new File([new Uint8Array(bytes)], name, { type });
const choose = async () => 2;

describe("loadPicture (D-070)", () => {
  it("keeps an image's own bytes and its source size", async () => {
    const picture = await loadPicture(deps(), file("vorlage.jpg", "image/jpeg"), choose);
    expect(picture?.asset).toMatchObject({ mimeType: "image/jpeg", width: 300, height: 400 });
    expect([...(picture?.asset.bytes ?? [])]).toEqual([1, 2, 3]);
  });

  it("stores a PDF page as the rendered PNG, and returns null when no page is chosen", async () => {
    const d = deps();
    const picture = await loadPicture(d, file("vorlage.pdf", "application/pdf"), choose);
    expect(picture?.asset.mimeType).toBe("image/png");
    expect([...(picture?.asset.bytes ?? [])]).toEqual([9, 9]);
    const cancelled = await loadPicture(
      deps({ renderPdf: vi.fn(async () => null) }),
      file("vorlage.pdf", "application/pdf"),
      choose,
    );
    expect(cancelled).toBeNull();
  });

  it("says why a file cannot be used", async () => {
    const reject = async (d: ReturnType<typeof deps>, f: File) =>
      loadPicture(d, f, choose).catch((error: PictureError) => error.key);
    expect(await reject(deps(), file("notiz.txt", "text/plain"))).toBe("status.unsupported");
    const big = new File([new Uint8Array(1)], "riesig.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 200 * 1024 * 1024 });
    expect(await reject(deps(), big)).toBe("status.tooLarge");
    const locked = deps({
      renderPdf: vi.fn(async () => {
        throw new PdfPasswordError();
      }),
    });
    expect(await reject(locked, file("geheim.pdf", "application/pdf"))).toBe("status.password");
    const broken = deps({
      decode: vi.fn(async () => {
        throw new Error("x");
      }),
    });
    expect(await reject(broken, file("foto.heic", "image/heic"))).toBe("status.heic");
    expect(await reject(broken, file("foto.png", "image/png"))).toBe("status.unsupported");
  });
});
