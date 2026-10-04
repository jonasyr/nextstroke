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
    // Paper corners: the reference was warped into the original's pixel grid. Only the paper
    // inside the corners is shown, and the fine adjustment applies on top (D-056).
    const { width: w, height: h } = original;
    ctx.beginPath();
    state.corners.forEach((c, i) => {
      const x = c.x * w - w / 2;
      const y = c.y * h - h / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    const { layer } = state;
    ctx.translate(layer.x * w, layer.y * w);
    ctx.rotate((layer.rotationDeg * Math.PI) / 180);
    ctx.scale(layer.scale, layer.scale);
    ctx.clip();
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

const HANDLE = 15;
const HANDLE_ACTIVE = 18;
const ACCENT = "#8fb0ff";
const LABEL_FONT = "600 12px -apple-system, system-ui, sans-serif";
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
  const cx = handles.reduce((sum, p) => sum + p.x, 0) / (handles.length || 1);
  const cy = handles.reduce((sum, p) => sum + p.y, 0) / (handles.length || 1);
  for (const [i, p] of handles.entries()) {
    // Rings with a crosshair, not dots: the corner itself stays visible inside the handle.
    const on = i === active;
    const r = on ? HANDLE_ACTIVE : HANDLE;
    for (const [width, color] of [
      [5, "rgba(0,0,0,0.55)"],
      [on ? 3 : 2.5, on ? ACCENT : "rgba(255,255,255,0.95)"],
    ] as const) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.lineWidth = width;
      ctx.strokeStyle = color;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(p.x - 5, p.y);
    ctx.lineTo(p.x + 5, p.y);
    ctx.moveTo(p.x, p.y - 5);
    ctx.lineTo(p.x, p.y + 5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // The number sits just inside the quad (outside it would leave the screen at the image
    // edge), so both images pair corners by number.
    const dx = cx - p.x;
    const dy = cy - p.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = p.x + (dx / len) * 36;
    const ny = p.y + (dy / len) * 36;
    ctx.beginPath();
    ctx.arc(nx, ny, 11, 0, Math.PI * 2);
    ctx.fillStyle = on ? ACCENT : "rgba(14,16,18,0.85)";
    ctx.fill();
    ctx.fillStyle = on ? "#0c1633" : "#fff";
    ctx.font = LABEL_FONT;
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), nx, ny + 4);
    ctx.textAlign = "start";
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
  ctx.strokeStyle = ACCENT;
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
    /** Names of the two sides in split view. */
    splitLabels?: { left: string; right: string };
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
    // Grip: a white pill with two notches, 44 px tall.
    const mid = viewport.height / 2;
    ctx.beginPath();
    ctx.roundRect(x - 14, mid - 22, 28, 44, 14);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 4, mid - 8);
    ctx.lineTo(x - 4, mid + 8);
    ctx.moveTo(x + 4, mid - 8);
    ctx.lineTo(x + 4, mid + 8);
    ctx.strokeStyle = "#0e1012";
    ctx.stroke();
    const labels = input.splitLabels;
    if (!labels) return;
    label(ctx, labels.left, x - 12, viewport.height - 40, "right");
    label(ctx, labels.right, x + 12, viewport.height - 40, "left");
  });
}

/** A small plate with text, right- or left-aligned at x. */
function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  side: "left" | "right",
) {
  ctx.font = LABEL_FONT;
  const width = ctx.measureText(text).width + 16;
  const left = side === "right" ? x - width : x;
  ctx.beginPath();
  ctx.roundRect(left, y, width, 24, 12);
  ctx.fillStyle = "rgba(14,16,18,0.78)";
  ctx.fill();
  ctx.fillStyle = "#eef0f2";
  ctx.fillText(text, left + 8, y + 16);
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
