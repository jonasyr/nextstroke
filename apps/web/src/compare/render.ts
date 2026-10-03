import {
  type CompareState,
  effectiveOpacity,
  type Gray,
  layerMatrix,
  type Matrix,
  splitOnScreen,
  type View,
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
  warped: Drawable | null = null,
) {
  ctx.drawImage(original, -original.width / 2, -original.height / 2);
  const alpha = effectiveOpacity(state);
  if (alpha === 0) return;
  ctx.save();
  if (state.split !== null) {
    // Split view: the reference only right of the divider, unbounded above and below.
    const big = 4 * Math.max(original.width, original.height, reference.width, reference.height);
    ctx.beginPath();
    ctx.rect(state.split * original.width - original.width / 2, -big, big, 2 * big);
    ctx.clip();
  }
  if (state.corners && warped) {
    // Four-point perspective: the reference was warped into the original's pixel grid.
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      warped,
      -original.width / 2,
      -original.height / 2,
      original.width,
      original.height,
    );
    ctx.restore();
    return;
  }
  transform(ctx, layerMatrix(state.layer, original, reference));
  ctx.globalAlpha = alpha;
  ctx.drawImage(reference, 0, 0);
  ctx.restore();
}

interface Viewport {
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
}

/** Corner handles on screen, the one being moved, and whether to magnify it. */
export interface CornerOverlay {
  handles: readonly Point[];
  active: number;
  loupe?: boolean;
}

const HANDLE = 12;
const HANDLE_ACTIVE = 16;
const LOUPE_RADIUS = 56;
const LOUPE_ZOOM = 3;
const LOUPE_OFFSET = 110;

/** Clear, draw the scene in screen coordinates, then the overlay. */
function frame(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  dpr: number,
  scene: () => void,
  overlay?: CornerOverlay,
  extra?: () => void,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, viewport.width, viewport.height);
  ctx.save();
  scene();
  ctx.restore();
  extra?.();
  if (overlay) drawOverlay(ctx, viewport, scene, overlay);
}

function drawOverlay(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  scene: () => void,
  { handles, active, loupe }: CornerOverlay,
) {
  if (handles.length === 4) {
    // The quad: a dark line under a light one, visible on any paper.
    for (const [width, color] of [
      [3, "rgba(0,0,0,0.55)"],
      [1.5, "rgba(255,255,255,0.95)"],
    ] as const) {
      ctx.beginPath();
      handles.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
  }
  for (const [i, p] of handles.entries()) {
    // Rings, not dots: the corner itself stays visible inside the handle.
    ctx.beginPath();
    ctx.arc(p.x, p.y, i === active ? HANDLE_ACTIVE : HANDLE, 0, Math.PI * 2);
    ctx.lineWidth = i === active ? 4 : 3;
    ctx.strokeStyle = i === active ? "#4f7cff" : "rgba(255,255,255,0.95)";
    ctx.stroke();
  }
  const target = handles[active];
  if (loupe && target) drawLoupe(ctx, viewport, scene, target);
}

/** The scene around `p`, magnified in a circle away from the finger. */
function drawLoupe(ctx: CanvasRenderingContext2D, viewport: Viewport, scene: () => void, p: Point) {
  const r = LOUPE_RADIUS;
  const above = p.y - LOUPE_OFFSET;
  const at = {
    x: Math.min(Math.max(p.x, r), viewport.width - r),
    y: Math.min(above - r >= 0 ? above : p.y + LOUPE_OFFSET, viewport.height - r),
  };
  ctx.save();
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#000";
  ctx.fillRect(at.x - r, at.y - r, 2 * r, 2 * r);
  ctx.translate(at.x, at.y);
  ctx.scale(LOUPE_ZOOM, LOUPE_ZOOM);
  ctx.translate(-p.x, -p.y);
  scene();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(at.x - 10, at.y);
  ctx.lineTo(at.x + 10, at.y);
  ctx.moveTo(at.x, at.y - 10);
  ctx.lineTo(at.x, at.y + 10);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#4f7cff";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.stroke();
}

export function drawComparison(
  ctx: CanvasRenderingContext2D,
  input: {
    original: Drawable;
    reference: Drawable;
    state: CompareState;
    viewport: Viewport;
    dpr: number;
    warped?: Drawable | null;
  },
) {
  const { original, reference, state, viewport, dpr } = input;
  const fit = Math.min(viewport.width / original.width, viewport.height / original.height);
  const scene = () => {
    transform(ctx, viewMatrix(state.view, fit, viewport));
    drawArtwork(ctx, original, reference, state, input.warped ?? null);
  };
  frame(ctx, viewport, dpr, scene, undefined, () => {
    if (state.split === null || effectiveOpacity(state) === 0) return;
    const x = splitOnScreen(state.split, state.view, original, viewport);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, viewport.height);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, viewport.height / 2, 11, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fill();
    ctx.strokeStyle = "#1d2329";
    ctx.stroke();
  });
}

/** One image alone, for placing its paper corners. */
export function drawSingle(
  ctx: CanvasRenderingContext2D,
  input: {
    image: Drawable;
    view: View;
    viewport: Viewport;
    dpr: number;
    overlay?: CornerOverlay;
  },
) {
  const { image, view, viewport, dpr } = input;
  const fit = Math.min(viewport.width / image.width, viewport.height / image.height);
  const scene = () => {
    ctx.save();
    transform(ctx, viewMatrix(view, fit, viewport));
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    ctx.restore();
  };
  frame(ctx, viewport, dpr, scene, input.overlay);
}

/** Pixels of an image, for the perspective warp. */
export function toRgba(image: Drawable, makeCanvas: () => HTMLCanvasElement = newCanvas) {
  const canvas = makeCanvas();
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = context(canvas);
  ctx.drawImage(image, 0, 0);
  const { data } = ctx.getImageData(0, 0, image.width, image.height);
  return { data, width: image.width, height: image.height };
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
