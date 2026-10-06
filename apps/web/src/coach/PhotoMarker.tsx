import { type PointerEvent, useEffect, useRef, useState } from "react";
import { dragArea, pressArea, type Spot, toggleProtected } from "./flow.ts";
import { photoStyle } from "./photoStyle.ts";

export type MarkMode = "area" | "protect";

const AREA = "#8fb0ff";
const PROTECT = "#ffd479";

/** A pointer position as a share of the element's width and height. */
export function normalized(
  event: { clientX: number; clientY: number },
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } | null {
  if (!rect.width || !rect.height) return null;
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

/**
 * The photo with the area to work on and the protected details (D-067). In area mode a tap
 * places the circle and dragging from its ring resizes it; in protect mode a tap adds or
 * removes a protected spot.
 */
export function PhotoMarker({
  image,
  mode,
  area,
  protectedSpots,
  onArea,
  onProtected,
  label,
}: {
  image: ImageBitmap;
  mode: MarkMode;
  area: Spot | null;
  protectedSpots: Spot[];
  onArea: (area: Spot) => void;
  onProtected: (spots: Spot[]) => void;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [resizing, setResizing] = useState<Spot | null>(null);
  const aspect = image.width / image.height;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const width = el.clientWidth * (window.devicePixelRatio || 1);
    el.width = Math.round(width);
    el.height = Math.round(width / aspect);
    ctx.drawImage(image, 0, 0, el.width, el.height);
    const ring = (spot: Spot, color: string, dashed: boolean) => {
      ctx.beginPath();
      ctx.arc(spot.x * el.width, spot.y * el.height, spot.r * el.width, 0, Math.PI * 2);
      ctx.fillStyle = `${color}2e`;
      ctx.fill();
      ctx.setLineDash(dashed ? [8, 6] : []);
      ctx.lineWidth = Math.max(2, el.width / 150);
      ctx.strokeStyle = color;
      ctx.stroke();
    };
    for (const spot of protectedSpots) ring(spot, PROTECT, false);
    if (area) ring(area, AREA, true);
  }, [image, aspect, area, protectedSpots]);

  const at = (event: PointerEvent<HTMLCanvasElement>) =>
    normalized(event, event.currentTarget.getBoundingClientRect());

  return (
    <canvas
      ref={canvas}
      className="ns-g-photo"
      style={photoStyle(aspect)}
      role="img"
      aria-label={label}
      onPointerDown={(event) => {
        const p = at(event);
        if (!p) return;
        if (mode === "protect") {
          onProtected(toggleProtected(protectedSpots, p, aspect));
          return;
        }
        const press = pressArea(area, p, aspect);
        if (press.resizing) {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          setResizing(press.area);
        } else {
          onArea(press.area);
        }
      }}
      onPointerMove={(event) => {
        const p = resizing && at(event);
        if (resizing && p) onArea(dragArea(resizing, p, aspect));
      }}
      onPointerUp={() => setResizing(null)}
      onPointerCancel={() => setResizing(null)}
    />
  );
}
