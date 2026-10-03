import {
  type CompareState,
  effectiveOpacity,
  type Gray,
  layerMatrix,
  type Matrix,
  viewMatrix,
} from "@nextstroke/compare";

type Drawable = CanvasImageSource & { width: number; height: number };

function transform(ctx: CanvasRenderingContext2D, m: Matrix) {
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
}

/** Draw original-centred content: the original, then the reference at the effective opacity. */
export function drawArtwork(
  ctx: CanvasRenderingContext2D,
  original: Drawable,
  reference: Drawable,
  state: CompareState,
) {
  ctx.drawImage(original, -original.width / 2, -original.height / 2);
  const alpha = effectiveOpacity(state);
  if (alpha === 0) return;
  ctx.save();
  transform(ctx, layerMatrix(state.layer, original, reference));
  ctx.globalAlpha = alpha;
  ctx.drawImage(reference, 0, 0);
  ctx.restore();
}

export function drawComparison(
  ctx: CanvasRenderingContext2D,
  input: {
    original: Drawable;
    reference: Drawable;
    state: CompareState;
    viewport: { width: number; height: number };
    dpr: number;
  },
) {
  const { original, reference, state, viewport, dpr } = input;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.save();
  const fit = Math.min(viewport.width / original.width, viewport.height / original.height);
  transform(ctx, viewMatrix(state.view, fit, viewport));
  drawArtwork(ctx, original, reference, state);
  ctx.restore();
}

const newCanvas = () => document.createElement("canvas");

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no 2d canvas context");
  return ctx;
}

/** Grayscale copy for auto-align: drawn on white at `width`, vertically centred (legacy). */
export function toGray(
  image: Drawable,
  width: number,
  height: number,
  makeCanvas: () => HTMLCanvasElement = newCanvas,
): Gray {
  const canvas = makeCanvas();
  canvas.width = width;
  canvas.height = height;
  const ctx = context(canvas);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  const drawnHeight = (width * image.height) / image.width;
  ctx.drawImage(image, 0, (height - drawnHeight) / 2, width, drawnHeight);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  const data = new Float32Array(width * height);
  for (let i = 0; i < data.length; i++) {
    data[i] =
      ((pixels[4 * i] as number) * 0.299 +
        (pixels[4 * i + 1] as number) * 0.587 +
        (pixels[4 * i + 2] as number) * 0.114) /
      255;
  }
  return { data, width, height };
}

/** Paint into a bounded canvas and encode; a null blob is reported, never swallowed. */
export async function renderToBlob(
  size: { width: number; height: number },
  type: "image/png" | "image/jpeg",
  paint: (ctx: CanvasRenderingContext2D) => void,
  makeCanvas: () => HTMLCanvasElement = newCanvas,
): Promise<Blob> {
  const canvas = makeCanvas();
  canvas.width = size.width;
  canvas.height = size.height;
  paint(context(canvas));
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
  if (!blob) throw new Error("the browser could not encode the image");
  return blob;
}
