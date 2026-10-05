/**
 * Browser bindings for Quick Compare. Thin glue only: the logic they call is unit-tested with
 * fakes, and these bindings are exercised in a real browser (apps/web/e2e), so they are
 * excluded from unit coverage (vitest.config.ts).
 */

import { type BitmapFactory, type Decoded, decodeToWorking } from "./decode.ts";
import { demoDrawing, type Stroke } from "./demo.ts";
import { hintStore } from "./hints.ts";
import { type PdfLib, renderPdfPage } from "./pdf.ts";
import type { CompareDeps } from "./QuickCompare.tsx";
import { renderToBlob, toGray, toRgba } from "./render.ts";
import { type ShareDeps, shareOrDownload } from "./share.ts";
import { createVisionClient } from "./visionClient.ts";

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

/** localStorage, or null where reading it throws (private mode, blocked site data). */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** opencv.js in a classic worker (importScripts, as in the iPhone probe), loaded on first use (D-055). */
const vision =
  typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined"
    ? createVisionClient(
        () => new Worker(new URL("./vision.worker.ts", import.meta.url)),
        (image) => createImageBitmap(image),
      )
    : null;

function paint(ctx: CanvasRenderingContext2D, strokes: Stroke[], size: number) {
  ctx.strokeStyle = "#16181b";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of strokes) {
    ctx.lineWidth = s.width * size;
    ctx.beginPath();
    for (const [i, p] of s.points.entries()) {
      if (i) ctx.lineTo(p.x * size, p.y * size);
      else ctx.moveTo(p.x * size, p.y * size);
    }
    ctx.stroke();
  }
}

function canvas(width: number, height: number) {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return [c, c.getContext("2d") as CanvasRenderingContext2D] as const;
}

const toFile = (c: HTMLCanvasElement, name: string, type: string) =>
  new Promise<File>((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(new File([b], name, { type })) : reject(new Error("no blob"))),
      type,
      0.9,
    ),
  );

/**
 * The demo pair (D-056): the Vorlage as a clean scan, and the hand version as a phone photo:
 * a sheet slightly turned on a wooden table, warm light falling off towards the edges.
 */
async function demoPair() {
  const [vorlage, v] = canvas(1200, 1200);
  v.fillStyle = "#fff";
  v.fillRect(0, 0, 1200, 1200);
  paint(v, demoDrawing(false), 1200);

  const [sheet, p] = canvas(1200, 1200);
  p.fillStyle = "#f6f3ec";
  p.fillRect(0, 0, 1200, 1200);
  paint(p, demoDrawing(true), 1200);

  const [photo, c] = canvas(1500, 2000);
  const wood = c.createLinearGradient(0, 0, 1500, 2000);
  wood.addColorStop(0, "#8a6a4a");
  wood.addColorStop(1, "#6e523a");
  c.fillStyle = wood;
  c.fillRect(0, 0, 1500, 2000);
  c.strokeStyle = "rgba(40,25,10,0.18)";
  for (let y = 0; y < 2000; y += 23) {
    c.lineWidth = 1 + (y % 3);
    c.beginPath();
    c.moveTo(0, y);
    c.bezierCurveTo(500, y + 18, 1000, y - 14, 1500, y + 6);
    c.stroke();
  }
  c.save();
  c.translate(750, 1000);
  c.rotate((4 * Math.PI) / 180);
  c.transform(1, 0.03, -0.02, 1, 0, 0);
  c.shadowColor = "rgba(0,0,0,0.35)";
  c.shadowBlur = 30;
  c.shadowOffsetY = 12;
  c.drawImage(sheet, -560, -560, 1120, 1120);
  c.restore();
  const light = c.createRadialGradient(700, 900, 300, 750, 1000, 1400);
  light.addColorStop(0, "rgba(255,240,210,0)");
  light.addColorStop(1, "rgba(30,20,10,0.35)");
  c.fillStyle = light;
  c.fillRect(0, 0, 1500, 2000);
  return {
    reference: await toFile(vorlage, "Beispiel-Vorlage.png", "image/png"),
    original: await toFile(photo, "Beispiel-Zeichnung.jpg", "image/jpeg"),
  };
}

export const browserDeps: CompareDeps = {
  demoPair,
  decode,
  renderPdf: (data, choose) =>
    renderPdfPage(data, choose, loadPdfjs, () => document.createElement("canvas")),
  share: (file) => shareOrDownload(file, share),
  download,
  keepAwake: async () => {
    try {
      await navigator.wakeLock.request("screen");
      return true;
    } catch {
      return false;
    }
  },
  hints: hintStore(storage()),
  renderBlob: renderToBlob,
  gray: toGray,
  rgba: (image) => toRgba(image),
  fromRgba: (rgba) =>
    createImageBitmap(new ImageData(new Uint8ClampedArray(rgba.data), rgba.width, rgba.height)),
  now: () => performance.now(),
  ...(vision ? { vision } : {}),
};
