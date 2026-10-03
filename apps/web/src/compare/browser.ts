/**
 * Browser bindings for Quick Compare. Thin glue only: the logic they call is unit-tested with
 * fakes, and these bindings are exercised in a real browser (apps/web/e2e), so they are
 * excluded from unit coverage (vitest.config.ts).
 */

import { type BitmapFactory, type Decoded, decodeToWorking } from "./decode.ts";
import { type PdfLib, renderPdfPage } from "./pdf.ts";
import type { CompareDeps } from "./QuickCompare.tsx";
import { renderToBlob, toGray, toRgba } from "./render.ts";
import { type ShareDeps, shareOrDownload } from "./share.ts";

export const createBitmap: BitmapFactory = (source, options) => createImageBitmap(source, options);

let worker: Worker | null = null;
let nextId = 0;

/** Decode in a worker when possible (Task 1), else on the main thread. */
function decode(blob: Blob): Promise<Decoded> {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") {
    return decodeToWorking(blob, createBitmap);
  }
  worker ??= new Worker(new URL("./decode.worker.ts", import.meta.url), { type: "module" });
  const active = worker;
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent<{ id: number; decoded?: Decoded; error?: string }>) => {
      if (event.data.id !== id) return;
      active.removeEventListener("message", onMessage);
      if (event.data.decoded) resolve(event.data.decoded);
      else reject(new Error(event.data.error ?? "decode failed"));
    };
    active.addEventListener("message", onMessage);
    active.postMessage({ id, blob });
  });
}

/** The legacy build, because the modern one needs very new JavaScript (Map.getOrInsertComputed). */
async function loadPdfjs(): Promise<PdfLib> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerUrl = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;
  return pdfjs as unknown as PdfLib;
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const share: ShareDeps = {
  canShare: (data) => Boolean(navigator.canShare?.(data)),
  share: (data) => navigator.share(data),
  download,
};

export const browserDeps: CompareDeps = {
  decode,
  renderPdf: (data, choose) =>
    renderPdfPage(data, choose, loadPdfjs, () => document.createElement("canvas")),
  share: (file) => shareOrDownload(file, share),
  renderBlob: renderToBlob,
  gray: toGray,
  rgba: (image) => toRgba(image),
  fromRgba: (rgba) =>
    createImageBitmap(new ImageData(new Uint8ClampedArray(rgba.data), rgba.width, rgba.height)),
  now: () => performance.now(),
};
