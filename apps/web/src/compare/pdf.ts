import { pdfRenderScale } from "@nextstroke/imaging";

/** The part of pdf.js this adapter uses, so tests can supply a fake. */
export interface PdfLib {
  getDocument(src: { data: Uint8Array }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{
        getViewport(o: { scale: number }): { width: number; height: number };
        render(o: { canvas: HTMLCanvasElement; viewport: unknown }): { promise: Promise<void> };
      }>;
    }>;
    /** pdf.js 6 releases the document through its loading task. */
    destroy(): Promise<void>;
  };
}

export class PdfPasswordError extends Error {
  constructor() {
    super("password-protected PDF");
  }
}

/** Render one selected page to PNG under the PDF edge budget, then release the document. */
export async function renderPdfPage(
  data: ArrayBuffer,
  choosePage: (count: number) => Promise<number | null>,
  load: () => Promise<PdfLib>,
  makeCanvas: () => HTMLCanvasElement,
): Promise<{ blob: Blob; page: number; count: number } | null> {
  const lib = await load();
  const task = lib.getDocument({ data: new Uint8Array(data) });
  try {
    const doc = await task.promise.catch((error: { name?: string }) => {
      throw error?.name === "PasswordException" ? new PdfPasswordError() : error;
    });
    const count = doc.numPages;
    const page = count === 1 ? 1 : await choosePage(count);
    if (page === null) return null;
    const pdfPage = await doc.getPage(page);
    const natural = pdfPage.getViewport({ scale: 1 });
    const viewport = pdfPage.getViewport({ scale: pdfRenderScale(natural.width, natural.height) });
    const canvas = makeCanvas();
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await pdfPage.render({ canvas, viewport }).promise;
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("PDF render produced no image");
    return { blob, page, count };
  } finally {
    await task.destroy();
  }
}
