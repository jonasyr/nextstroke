import type { Refusal } from "@nextstroke/imaging";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useNoTouchDefaults } from "../useNoTouchDefaults.ts";
import {
  addStroke,
  addTap,
  applyStroke,
  BRUSH,
  type BrushStroke,
  type FormImage,
  type FormMarks,
  type Pt,
} from "./form.ts";
import { normalized } from "./PhotoMarker.tsx";
import { photoStyle } from "./photoStyle.ts";

export type FormTool = "tap" | "paint" | "erase";

/** The form's tint: the area colour of the circle, see-through so the drawing stays readable. */
const TINT = [143, 176, 255, 120] as const;

/**
 * The photo with the tapped form tinted (D-073). "Antippen" finds the area inside the outline,
 * "Malen" and "Radieren" correct it with a fingertip-sized brush; a stroke shows while it is
 * drawn and is kept when the finger lifts.
 */
export function FormMarker({
  image,
  form,
  mask,
  marks,
  tool,
  onMarks,
  onRefused,
  onSearching,
  label,
}: {
  image: ImageBitmap;
  form: FormImage;
  mask: Uint8Array;
  marks: FormMarks;
  tool: FormTool;
  onMarks: (marks: FormMarks) => void;
  onRefused: (reason: Refusal) => void;
  /** Finding a form takes up to about a second: true while it runs. */
  onSearching: (searching: boolean) => void;
  label: string;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useNoTouchDefaults(canvas);
  const [stroke, setStroke] = useState<{ stroke: BrushStroke; mask: Uint8Array } | null>(null);
  const aspect = image.width / image.height;
  const shown = stroke?.mask ?? mask;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const width = el.clientWidth * (window.devicePixelRatio || 1) || 300;
    el.width = Math.round(width);
    el.height = Math.round(width / aspect);
    ctx.drawImage(image, 0, 0, el.width, el.height);
    const { width: w, height: h } = form.gray;
    const layer = document.createElement("canvas");
    layer.width = w;
    layer.height = h;
    const layerCtx = layer.getContext("2d");
    if (!layerCtx) return;
    const pixels = layerCtx.createImageData(w, h);
    shown.forEach((v, i) => {
      if (v) pixels.data.set(TINT, i * 4);
    });
    layerCtx.putImageData(pixels, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(layer, 0, 0, el.width, el.height);
  }, [image, aspect, form, shown]);

  const at = (event: PointerEvent<HTMLCanvasElement>): Pt | null => {
    const p = normalized(event, event.currentTarget.getBoundingClientRect());
    return p ? [Math.min(1, Math.max(0, p.x)), Math.min(1, Math.max(0, p.y))] : null;
  };

  const extend = (p: Pt) => {
    if (!stroke) return;
    const last = stroke.stroke.points.at(-1) as Pt;
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.004) return;
    const segment = { ...stroke.stroke, points: [last, p] };
    setStroke({
      stroke: { ...stroke.stroke, points: [...stroke.stroke.points, p] },
      mask: applyStroke(form, stroke.mask, segment),
    });
  };

  const finish = () => {
    if (stroke) onMarks(addStroke(marks, stroke.stroke));
    setStroke(null);
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
        if (tool === "tap") {
          // Let the "searching" line paint before the work starts.
          onSearching(true);
          window.setTimeout(() => {
            const result = addTap(form, marks, p);
            onSearching(false);
            if ("marks" in result) onMarks(result.marks);
            else onRefused(result.refused);
          }, 30);
          return;
        }
        event.currentTarget.setPointerCapture?.(event.pointerId);
        const first: BrushStroke = { points: [p], radius: BRUSH, value: tool === "paint" ? 1 : 0 };
        setStroke({ stroke: first, mask: applyStroke(form, mask, first) });
      }}
      onPointerMove={(event) => {
        const p = stroke && at(event);
        if (p) extend(p);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
    />
  );
}
