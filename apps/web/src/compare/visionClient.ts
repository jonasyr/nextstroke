import type { AlignVerdict, PaperResult, Quad } from "@nextstroke/compare";

/**
 * Main-thread side of the opencv.js vision worker (D-055). opencv.js (about 13 MB) loads only
 * when asked, in its own worker; if it cannot load or the worker dies, every call answers
 * "unavailable" (null) and Quick Compare keeps working without it (product rule 1).
 */

export type VisionRequest =
  | { id: number; type: "load" }
  | { id: number; type: "paper"; image: ImageBitmap }
  | { id: number; type: "align"; original: ImageBitmap; reference: ImageBitmap }
  | {
      id: number;
      type: "refine";
      original: ImageBitmap;
      prewarped: ImageBitmap;
      /** The drawing's paper corners (normalized): only blocks on the paper are compared. */
      paper: Quad;
    };

export type VisionResponse =
  | { id: number; type: "load"; ms: number }
  | { id: number; type: "paper"; paper: PaperResult | null }
  | { id: number; type: "align"; verdict: AlignVerdict }
  | { id: number; type: "error"; error: string };

export interface VisionDeps {
  /** Load opencv.js once; `ms` is the load time in the worker. */
  load(): Promise<{ ok: boolean; ms: number }>;
  /** Paper corners on the image, or null when none was found or vision is unavailable. */
  detectPaper(image: ImageBitmap): Promise<PaperResult | null>;
  /** Feature homography of the reference onto the original; null when unavailable. */
  align(original: ImageBitmap, reference: ImageBitmap): Promise<AlignVerdict | null>;
  /**
   * Small correction of a Vorlage already warped into the drawing's grid by placed corners
   * (D-060): where the prewarped image's corners land on the drawing; null when unavailable.
   */
  refine(original: ImageBitmap, prewarped: ImageBitmap, paper: Quad): Promise<AlignVerdict | null>;
}

type Pending = (response: VisionResponse | null) => void;

export function createVisionClient(
  makeWorker: () => Worker,
  clone: (image: ImageBitmap) => Promise<ImageBitmap>,
): VisionDeps {
  let worker: Worker | null = null;
  let loading: Promise<{ ok: boolean; ms: number }> | null = null;
  let failed = false;
  let nextId = 0;
  const pending = new Map<number, Pending>();

  function fail() {
    failed = true;
    worker?.terminate();
    worker = null;
    for (const resolve of pending.values()) resolve(null);
    pending.clear();
  }

  function send(message: VisionRequest, transfer: Transferable[] = []) {
    return new Promise<VisionResponse | null>((resolve) => {
      if (!worker) return resolve(null);
      pending.set(message.id, resolve);
      worker.postMessage(message, transfer);
    });
  }

  function start(): Promise<{ ok: boolean; ms: number }> {
    try {
      worker = makeWorker();
    } catch {
      failed = true;
      return Promise.resolve({ ok: false, ms: 0 });
    }
    worker.addEventListener("message", (event: MessageEvent<VisionResponse>) => {
      const resolve = pending.get(event.data.id);
      pending.delete(event.data.id);
      resolve?.(event.data);
    });
    worker.addEventListener("error", fail);
    return send({ id: ++nextId, type: "load" }).then((response) => {
      if (response?.type === "load") return { ok: true, ms: response.ms };
      fail();
      return { ok: false, ms: 0 };
    });
  }

  const load = () => {
    loading ??= start();
    return loading;
  };

  async function ask(
    build: (id: number, images: ImageBitmap[]) => VisionRequest,
    sources: ImageBitmap[],
  ): Promise<VisionResponse | null> {
    if (!(await load()).ok || failed) return null;
    const images = await Promise.all(sources.map((source) => clone(source)));
    return send(build(++nextId, images), images);
  }

  return {
    load,
    async detectPaper(image) {
      const response = await ask(
        (id, [copy]) => ({ id, type: "paper", image: copy as ImageBitmap }),
        [image],
      );
      return response?.type === "paper" ? response.paper : null;
    },
    async align(original, reference) {
      const response = await ask(
        (id, [o, r]) => ({
          id,
          type: "align",
          original: o as ImageBitmap,
          reference: r as ImageBitmap,
        }),
        [original, reference],
      );
      return response?.type === "align" ? response.verdict : null;
    },
    async refine(original, prewarped, paper) {
      const response = await ask(
        (id, [o, p]) => ({
          id,
          type: "refine",
          original: o as ImageBitmap,
          prewarped: p as ImageBitmap,
          paper,
        }),
        [original, prewarped],
      );
      return response?.type === "align" ? response.verdict : null;
    },
  };
}
