import type { Point, Quad } from "@nextstroke/compare";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useNoTouchDefaults } from "../useNoTouchDefaults.ts";
import { photoStyle } from "./photoStyle.ts";

const ACCENT = "#8fb0ff";
const WARN = "#ffd479";
/** A press this close to a ring (CSS px) grabs it. */
export const GRAB_PX = 40;
const RING_PX = 14;
/** Free border around the image (CSS px), so rings on its very corners stay whole and grabbable. */
export const MARGIN_PX = 18;

/** A pointer position as a share of the image inside the canvas's margin; null without size. */
export function onImage(
  event: { clientX: number; clientY: number },
  rect: { left: number; top: number; width: number; height: number },
  margin = MARGIN_PX,
): Point | null {
  const width = rect.width - 2 * margin;
  const height = rect.height - 2 * margin;
  if (width <= 0 || height <= 0) return null;
  return {
    x: (event.clientX - rect.left - margin) / width,
    y: (event.clientY - rect.top - margin) / height,
  };
}
const LOUPE_PX = 120;
const ZOOM = 3;

/** The ring under a press, nearest first; null when none is within `GRAB_PX`. */
export function ringAt(
  quad: Quad,
  at: Point,
  size: { width: number; height: number },
): number | null {
  let best: number | null = null;
  let bestD = GRAB_PX;
  quad.forEach((p, i) => {
    const d = Math.hypot((p.x - at.x) * size.width, (p.y - at.y) * size.height);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

const clamp = (v: number) => Math.min(1, Math.max(0, v));

/**
 * The photo with four rings on the paper corners (Phase 3 Task 5). Drag a ring onto its
 * corner; a loupe shows what the finger covers, and the ring snaps when it is let go.
 * Unsure rings are dashed in amber until touched (D-061).
 */
export function CornerEditor({
  image,
  quad,
  unsure,
  onMove,
  onDrop,
  label,
}: {
  image: ImageBitmap;
  quad: Quad;
  unsure: number[];
  onMove: (index: number, point: Point) => void;
  onDrop: (index: number) => void;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useNoTouchDefaults(canvas);
  const [dragging, setDragging] = useState<number | null>(null);
  const aspect = image.width / image.height;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    // The image sits inside a free border; the canvas is as tall as image plus border.
    const innerCss = Math.max(1, el.clientWidth - 2 * MARGIN_PX);
    el.style.height = `${innerCss / aspect + 2 * MARGIN_PX}px`;
    el.width = Math.round(el.clientWidth * dpr);
    el.height = Math.round((innerCss / aspect + 2 * MARGIN_PX) * dpr);
    const W = el.width;
    const m = MARGIN_PX * dpr;
    const iw = innerCss * dpr;
    const ih = iw / aspect;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.drawImage(image, m, m, iw, ih);
    const px = quad.map((p) => ({ x: m + p.x * iw, y: m + p.y * ih }));
    ctx.beginPath();
    px.forEach((p, i) => {
      if (i) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = ACCENT;
    ctx.setLineDash([]);
    ctx.stroke();
    px.forEach((p, i) => {
      const flagged = unsure.includes(i);
      ctx.beginPath();
      ctx.arc(p.x, p.y, RING_PX * dpr, 0, Math.PI * 2);
      ctx.setLineDash([]);
      ctx.lineWidth = 5 * dpr;
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.stroke();
      ctx.setLineDash(flagged ? [5 * dpr, 4 * dpr] : []);
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeStyle = flagged ? WARN : "#fff";
      ctx.stroke();
    });
    const held = dragging === null ? undefined : px[dragging];
    if (held) {
      // Loupe in the upper corner away from the finger.
      const r = (LOUPE_PX / 2) * dpr;
      const cx = held.x < W / 2 ? W - r - 8 * dpr : r + 8 * dpr;
      const cy = r + 8 * dpr;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const sx = ((held.x - m) / iw) * image.width;
      const sy = ((held.y - m) / ih) * image.height;
      const span = ((2 * r) / ZOOM) * (image.width / iw);
      ctx.drawImage(image, sx - span / 2, sy - span / 2, span, span, cx - r, cy - r, 2 * r, 2 * r);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = "#fff";
      ctx.setLineDash([]);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 10 * dpr, cy);
      ctx.lineTo(cx + 10 * dpr, cy);
      ctx.moveTo(cx, cy - 10 * dpr);
      ctx.lineTo(cx, cy + 10 * dpr);
      ctx.strokeStyle = ACCENT;
      ctx.stroke();
    }
  }, [image, aspect, quad, unsure, dragging]);

  const at = (event: PointerEvent<HTMLCanvasElement>) =>
    onImage(event, event.currentTarget.getBoundingClientRect());

  const end = () => {
    if (dragging !== null) onDrop(dragging);
    setDragging(null);
  };

  return (
    <canvas
      ref={canvas}
      className="ns-g-photo"
      style={photoStyle(aspect)}
      role="img"
      aria-label={label}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        const p = at(event);
        if (!p) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const index = ringAt(quad, p, {
          width: rect.width - 2 * MARGIN_PX,
          height: rect.height - 2 * MARGIN_PX,
        });
        if (index === null) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setDragging(index);
      }}
      onPointerMove={(event) => {
        const p = dragging !== null && at(event);
        if (dragging !== null && p) onMove(dragging, { x: clamp(p.x), y: clamp(p.y) });
      }}
      onPointerUp={end}
      onPointerCancel={end}
    />
  );
}
