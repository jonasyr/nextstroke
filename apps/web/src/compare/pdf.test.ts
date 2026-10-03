import { describe, expect, it, vi } from "vitest";
import { type PdfLib, renderPdfPage } from "./pdf.ts";

function fakeLib(pages: number, options: { password?: boolean } = {}) {
  const destroy = vi.fn(async () => {});
  const render = vi.fn(() => ({ promise: Promise.resolve() }));
  const lib: PdfLib = {
    getDocument: () => ({
      promise: options.password
        ? Promise.reject(Object.assign(new Error("pw"), { name: "PasswordException" }))
        : Promise.resolve({
            numPages: pages,
            getPage: async () => ({
              getViewport: ({ scale }: { scale: number }) => ({
                width: 595 * scale,
                height: 842 * scale,
              }),
              render,
            }),
          }),
      destroy,
    }),
  };
  return { lib, destroy, render };
}

const canvas = () => ({
  width: 0,
  height: 0,
  toBlob: (done: (b: Blob | null) => void) => done(new Blob(["png"])),
});

describe("PDF import (legacy I2)", () => {
  it("renders a single page at most 2400 px and destroys the document", async () => {
    const { lib, destroy, render } = fakeLib(1);
    const c = canvas();
    const choose = vi.fn();
    const result = await renderPdfPage(
      new ArrayBuffer(1),
      choose,
      async () => lib,
      () => c as never,
    );
    expect(choose).not.toHaveBeenCalled();
    expect(result?.page).toBe(1);
    expect(Math.max(c.width, c.height)).toBeLessThanOrEqual(2400);
    expect(render).toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  it("asks which page of a multi-page file and supports cancelling", async () => {
    const { lib, destroy } = fakeLib(4);
    const choose = vi.fn(async () => null);
    expect(
      await renderPdfPage(
        new ArrayBuffer(1),
        choose,
        async () => lib,
        () => canvas() as never,
      ),
    ).toBeNull();
    expect(choose).toHaveBeenCalledWith(4);
    expect(destroy).toHaveBeenCalled();
  });

  it("explains password-protected files and still releases the loading task", async () => {
    const { lib, destroy } = fakeLib(1, { password: true });
    await expect(
      renderPdfPage(
        new ArrayBuffer(1),
        vi.fn(),
        async () => lib,
        () => canvas() as never,
      ),
    ).rejects.toThrow(/password/i);
    expect(destroy).toHaveBeenCalled();
  });

  it("fails visibly when the canvas cannot produce a blob", async () => {
    const { lib } = fakeLib(1);
    const empty = { ...canvas(), toBlob: (done: (b: Blob | null) => void) => done(null) };
    await expect(
      renderPdfPage(
        new ArrayBuffer(1),
        vi.fn(),
        async () => lib,
        () => empty as never,
      ),
    ).rejects.toThrow(/render/);
  });
});
