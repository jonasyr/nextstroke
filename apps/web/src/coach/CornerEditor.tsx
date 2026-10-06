import type { Point, Quad } from "@nextstroke/compare";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { normalized } from "./PhotoMarker.tsx";

const ACCENT = "#8fb0ff";
const WARN = "#ffd479";
/** A press this close to a ring (CSS px) grabs it. */
export const GRAB_PX = 40;
const RING_PX = 14;
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
  const [dragging, setDragging] = useState<number | null>(null);
  const aspect = image.width / image.height;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    el.width = Math.round(el.clientWidth * dpr);
    el.height = Math.round(el.width / aspect);
    const W = el.width;
    const H = el.height;
    ctx.drawImage(image, 0, 0, W, H);
    const px = quad.map((p) => ({ x: p.x * W, y: p.y * H }));
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
      const sx = (held.x / W) * image.width;
      const sy = (held.y / H) * image.height;
      const span = ((2 * r) / ZOOM) * (image.width / W);
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
    normalized(event, event.currentTarget.getBoundingClientRect());

  const end = () => {
    if (dragging !== null) onDrop(dragging);
    setDragging(null);
  };

  return (
    <canvas
      ref={canvas}
      className="ns-g-photo"
      style={{ aspectRatio: String(aspect) }}
      role="img"
      aria-label={label}
      onPointerDown={(event) => {
        const p = at(event);
        if (!p) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const index = ringAt(quad, p, rect);
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
