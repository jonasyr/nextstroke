import type { PlanResult } from "@nextstroke/coaching";
import type { LightSide } from "@nextstroke/contracts";
import { t } from "@nextstroke/ui";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import type { Spot } from "../flow.ts";
import { photoStyle } from "../photoStyle.ts";
import { drawPlan, type View, viewAround, WHOLE } from "../planRender.ts";
import { Pill } from "./parts.tsx";

const LIGHTS: LightSide[] = ["left", "top", "right"];

/** The view's width over its height, in pixels of the image. */
const viewAspect = (image: ImageBitmap, view: View) =>
  (view.w * image.width) / (view.h * image.height);

/**
 * Draws the straight view, or a part of it, with the plan over it (D-071). The plan is drawn on
 * its own layer and laid over the photo, which itself is never changed.
 */
function usePlanCanvas(image: ImageBitmap, result: PlanResult, view: View, showPlan: boolean) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const width = Math.round(el.clientWidth * (window.devicePixelRatio || 1)) || 300;
    el.width = width;
    el.height = Math.round(width / viewAspect(image, view));
    ctx.drawImage(
      image,
      view.x * image.width,
      view.y * image.height,
      view.w * image.width,
      view.h * image.height,
      0,
      0,
      el.width,
      el.height,
    );
    if (!showPlan || !("plan" in result)) return;
    const layer = document.createElement("canvas");
    layer.width = el.width;
    layer.height = el.height;
    const layerCtx = layer.getContext("2d");
    if (!layerCtx) return;
    drawPlan(layerCtx, result.plan, result.keepFree, layer, view);
    ctx.drawImage(layer, 0, 0);
  }, [image, result, view, showPlan]);
  return canvas;
}

const viewFor = (image: ImageBitmap, area: Spot | null, zoomed: boolean) =>
  zoomed && area ? viewAround(area, image.width / image.height) : WHOLE;

/** A small preview of an idea's plan for the idea cards; decorative, the steps explain it. */
export function PlanThumb({
  image,
  result,
  area,
}: {
  image: ImageBitmap;
  result: PlanResult;
  area: Spot | null;
}) {
  const view = viewFor(image, area, true);
  const canvas = usePlanCanvas(image, result, view, true);
  return (
    <span aria-hidden="true">
      <canvas
        ref={canvas}
        className="ns-g-plan-thumb"
        style={{ aspectRatio: String(viewAspect(image, view)) }}
      />
    </span>
  );
}

/**
 * The chosen idea on the user's sheet (D-071): zoomed to the marked area or the whole sheet,
 * the light's side when it matters, and a hold to see the sheet without the strokes. Without a
 * plan it says why, and offers marking an area where that would help.
 */
export function PlanPreview({
  image,
  result,
  area,
  light,
  onLight,
  onMark,
}: {
  image: ImageBitmap;
  result: PlanResult;
  area: Spot | null;
  light: LightSide;
  onLight: (light: LightSide) => void;
  /** Back to marking the area. */
  onMark: () => void;
}) {
  const [zoomed, setZoomed] = useState(true);
  const [holding, setHolding] = useState(false);
  const view = viewFor(image, area, zoomed);
  const canvas = usePlanCanvas(image, result, view, !holding);

  if (!("plan" in result)) {
    const mark =
      result.reason === "noArea" || result.reason === "protect" || result.reason === "circle";
    return (
      <section className="ns-g-plan-none ns-stack" aria-label={t("guided.plan.title")}>
        <p className="ns-note">{t(`guided.plan.none.${result.reason}`)}</p>
        {mark && (
          <button type="button" className="ns-text ns-accent ns-start-self" onClick={onMark}>
            {t("guided.plan.mark")}
          </button>
        )}
      </section>
    );
  }

  const hold = (on: boolean) => () => setHolding(on);
  const key = (on: boolean) => (event: KeyboardEvent) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      setHolding(on);
    }
  };
  const aspect = viewAspect(image, view);
  return (
    <section className="ns-g-plan ns-stack" aria-label={t("guided.plan.title")}>
      <canvas
        ref={canvas}
        className="ns-g-plan-view"
        style={photoStyle(aspect)}
        role="img"
        aria-label={t("guided.plan.image")}
      />
      <p className="ns-note">{t("guided.plan.note")}</p>
      <div className="ns-g-plan-tools">
        <div className="ns-g-segs" role="radiogroup" aria-label={t("guided.plan.view")}>
          <Pill kind="seg" name="plan-view" selected={zoomed} onSelect={() => setZoomed(true)}>
            {t("guided.plan.zoom")}
          </Pill>
          <Pill kind="seg" name="plan-view" selected={!zoomed} onSelect={() => setZoomed(false)}>
            {t("guided.plan.sheet")}
          </Pill>
        </div>
        {result.usesLight && (
          <div className="ns-stack ns-g-plan-light">
            <span className="ns-label" aria-hidden="true">
              {t("guided.plan.light")}
            </span>
            <div className="ns-g-segs" role="radiogroup" aria-label={t("guided.plan.light")}>
              {LIGHTS.map((side) => (
                <Pill
                  key={side}
                  kind="seg"
                  name="plan-light"
                  selected={light === side}
                  onSelect={() => onLight(side)}
                >
                  {t(`guided.plan.light.${side}`)}
                </Pill>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          className="ns-g-secondary ns-g-hold"
          aria-pressed={holding}
          onPointerDown={hold(true)}
          onPointerUp={hold(false)}
          onPointerLeave={hold(false)}
          onPointerCancel={hold(false)}
          onKeyDown={key(true)}
          onKeyUp={key(false)}
          onBlur={hold(false)}
        >
          {t("guided.plan.original")}
        </button>
      </div>
    </section>
  );
}
