import type { StrokePlan } from "@nextstroke/contracts";

/**
 * Draws a stroke plan locally (D-071). The plan goes onto its own transparent layer; protected
 * details are cut out of that layer, and only then is it laid over the photo, so photo pixels
 * outside the fills and inside protected details stay exactly as they were (AGENTS rule 5).
 */

type Point = [number, number];
export type Segment = [Point, Point];

/** The part of the image a canvas shows, in normalized coordinates. */
export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const WHOLE: View = { x: 0, y: 0, w: 1, h: 1 };

/** Ink as near-black, never pure black, so it reads as a drawn line on a photo. */
const INK = "20, 20, 24";
/** The thinnest line or dot still visible on screen, in canvas pixels. */
const MIN_PX = 0.8;

/**
 * Parallel lines at `angleDeg`, `spacing` apart, covering a polygon's bounding box; the canvas
 * clips them to the polygon. Pure, in canvas pixels.
 */
export function hatchLines(polygon: Point[], angleDeg: number, spacing: number): Segment[] {
  if (polygon.length < 3 || !(spacing > 0)) return [];
  const a = (angleDeg * Math.PI) / 180;
  const along: Point = [Math.cos(a), Math.sin(a)];
  const across: Point = [-along[1], along[0]];
  const project = (p: Point, d: Point) => p[0] * d[0] + p[1] * d[1];
  const offsets = polygon.map((p) => project(p, across));
  const reach = polygon.map((p) => project(p, along));
  const from = Math.min(...offsets);
  const to = Math.max(...offsets);
  const start = Math.min(...reach);
  const end = Math.max(...reach);
  const lines: Segment[] = [];
  // Lines sit on a grid fixed to the image, so neighbouring fills line up.
  for (let k = Math.ceil(from / spacing); k * spacing <= to; k++) {
    const o = k * spacing;
    const point = (s: number): Point => [
      across[0] * o + along[0] * s,
      across[1] * o + along[1] * s,
    ];
    lines.push([point(start), point(end)]);
  }
  return lines;
}

/** Dot centres on staggered rows `spacing` apart, with a small fixed jitter; pure. */
export function dotGrid(polygon: Point[], spacing: number): Point[] {
  if (polygon.length < 3 || !(spacing > 0)) return [];
  const xs = polygon.map((p) => p[0]);
  const ys = polygon.map((p) => p[1]);
  const row = spacing * (Math.sqrt(3) / 2);
  const dots: Point[] = [];
  for (let j = Math.floor(Math.min(...ys) / row); j * row <= Math.max(...ys); j++) {
    const shift = j % 2 ? spacing / 2 : 0;
    for (let i = Math.floor(Math.min(...xs) / spacing); i * spacing <= Math.max(...xs); i++) {
      const jitter = noise(i, j) * spacing * 0.15;
      dots.push([i * spacing + shift + jitter, j * row + noise(j, i) * spacing * 0.15]);
    }
  }
  return dots;
}

/** A fixed value in [-1, 1] per grid cell, so the dots do not move between frames. */
function noise(i: number, j: number): number {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/** Draws the plan onto `ctx`, a transparent layer of `width` × `height` showing `view`. */
export function drawPlan(
  ctx: CanvasRenderingContext2D,
  plan: StrokePlan,
  keepFree: Point[][],
  size: { width: number; height: number },
  view: View = WHOLE,
): void {
  const px = (p: Point): Point => [
    ((p[0] - view.x) / view.w) * size.width,
    ((p[1] - view.y) / view.h) * size.height,
  ];
  // Plan lengths are shares of the image width.
  const scale = size.width / view.w;
  const path = (polygon: Point[]) => {
    ctx.beginPath();
    polygon.forEach((p, i) => {
      const [x, y] = px(p);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
  };

  ctx.clearRect(0, 0, size.width, size.height);
  for (const fill of [...plan.fills].sort((a, b) => a.order - b.order)) {
    const polygon = fill.polygon.map((p) => px(p as Point));
    const spacing = fill.spacing * scale;
    const width = Math.max(MIN_PX, fill.width * scale);
    ctx.save();
    path(fill.polygon as Point[]);
    ctx.clip();
    ctx.fillStyle = `rgba(${INK}, ${fill.darkness})`;
    ctx.strokeStyle = `rgba(${INK}, ${fill.darkness})`;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    if (fill.pattern === "dots") {
      ctx.beginPath();
      for (const [x, y] of dotGrid(polygon, spacing)) {
        ctx.moveTo(x + width / 2, y);
        ctx.arc(x, y, width / 2, 0, Math.PI * 2);
      }
      ctx.fill();
    } else {
      const angles = fill.cross ? [fill.angleDeg, fill.angleDeg + 90] : [fill.angleDeg];
      ctx.beginPath();
      for (const angle of angles) {
        for (const [a, b] of hatchLines(polygon, angle, spacing)) {
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
        }
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = "#000";
  for (const polygon of keepFree) {
    path(polygon);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The view around a marked circle: a square margin of `zoom` radii around it, kept on the
 * image. `aspect` is the image's width over its height; x and r are shares of the width.
 */
export function viewAround(
  circle: { x: number; y: number; r: number },
  aspect: number,
  zoom = 1.35,
): View {
  const half = circle.r * zoom;
  const w = Math.min(1, half * 2);
  const h = Math.min(1, half * 2 * aspect);
  const place = (centre: number, size: number) =>
    Math.min(1 - size, Math.max(0, centre - size / 2));
  return { x: place(circle.x, w), y: place(circle.y, h), w, h };
}
