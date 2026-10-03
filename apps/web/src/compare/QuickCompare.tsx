import {
  autoAlign,
  badge,
  type CompareState,
  compare,
  cornersFromLayer,
  cornersOnScreen,
  type GestureEvent,
  gestures,
  HOLD_MS,
  hitCorner,
  hitSplit,
  idleGesture,
  initialState,
  invertHomography,
  PARAMS,
  type Param,
  paramValue,
  referenceHomography,
  screenToOriginal,
  splitFromScreen,
} from "@nextstroke/compare";
import { classifyFile, exportSize, type Rgba, warpPerspective } from "@nextstroke/imaging";
import { type MessageKey, t } from "@nextstroke/ui";
import {
  type ChangeEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { Immersive } from "../Immersive.tsx";
import type { Decoded } from "./decode.ts";
import { PdfPasswordError, type renderPdfPage } from "./pdf.ts";
import { drawArtwork, drawComparison, type renderToBlob, type toGray } from "./render.ts";

export interface Loaded extends Decoded {
  name: string;
  blob: Blob;
}

export interface CompareDeps {
  decode(blob: Blob): Promise<Decoded>;
  renderPdf: (
    data: ArrayBuffer,
    choose: (count: number) => Promise<number | null>,
  ) => ReturnType<typeof renderPdfPage>;
  share(file: File): Promise<unknown>;
  renderBlob: typeof renderToBlob;
  gray: typeof toGray;
  /** Pixels of a bitmap and back, for the four-point perspective warp. */
  rgba(image: ImageBitmap): Rgba;
  fromRgba(rgba: Rgba): Promise<ImageBitmap>;
  now(): number;
}

const HANDLE_RADIUS = 28;

const PARAM_LABEL: Record<Param, MessageKey> = {
  x: "compare.param.x",
  y: "compare.param.y",
  scale: "compare.param.scale",
  rotation: "compare.param.rotation",
};

function formatParam(param: Param, value: number): string {
  if (param === "scale") return `${(value * 100).toFixed(1)} %`;
  if (param === "rotation") return `${value.toFixed(2)}°`;
  return `${(value * 100).toFixed(2)} %`;
}

type Slot = "original" | "reference";

export function QuickCompare({ deps }: { deps: CompareDeps }) {
  const [state, dispatch] = useReducer(compare, undefined, initialState);
  const [images, setImages] = useState<Partial<Record<Slot, Loaded>>>({});
  const [status, setStatus] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [aligningAuto, setAligningAuto] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfAsk, setPdfAsk] = useState<{
    count: number;
    resolve: (n: number | null) => void;
  } | null>(null);
  const [pdfPage, setPdfPage] = useState(1);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [warped, setWarped] = useState<ImageBitmap | null>(null);
  /** A corner handle (index) or the split divider under a pointer. */
  const [dragging, setDragging] = useState<{ pointer: number; target: number | "split" } | null>(
    null,
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [workspaceEl, setWorkspaceEl] = useState<HTMLDivElement | null>(null);
  const gestureRef = useRef(idleGesture());
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef<CompareState>(state);
  stateRef.current = state;

  const { original, reference } = images;
  const ready = Boolean(original && reference);
  const busy = importing || aligningAuto;

  // Track the workspace size (the canvas follows it, including in immersive mode).
  useEffect(() => {
    if (!workspaceEl || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const rect = workspaceEl.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(workspaceEl);
    return () => observer.disconnect();
  }, [workspaceEl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !original || !reference || size.width === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawComparison(ctx, {
      original: original.bitmap,
      reference: reference.bitmap,
      state,
      viewport: size,
      dpr,
      warped,
      handles:
        state.aligning && state.corners
          ? cornersOnScreen(state.corners, state.view, original, size)
          : [],
      activeHandle: state.activeCorner,
    });
  });

  // Warp the reference into the original's grid once corners settle (not while dragging).
  const corners = state.corners;
  useEffect(() => {
    if (!corners || !original || !reference || dragging) return;
    const h = referenceHomography(corners, original, reference);
    const toSource = h && invertHomography(h);
    if (!toSource) {
      setStatus(t("compare.status.perspectiveFolded"));
      return;
    }
    let cancelled = false;
    const result = warpPerspective(
      deps.rgba(reference.bitmap),
      toSource,
      original.width,
      original.height,
    );
    void deps.fromRgba(result).then((bitmap) => {
      if (cancelled) return bitmap.close();
      setWarped((previous) => {
        previous?.close();
        return bitmap;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [corners, original, reference, dragging, deps]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const choosePage = useCallback(
    (count: number) =>
      new Promise<number | null>((resolve) => {
        setPdfPage(1);
        setPdfAsk({ count, resolve });
      }),
    [],
  );

  async function load(slot: Slot, file: File | undefined) {
    if (!file) return;
    if (busy) {
      setStatus(t("compare.status.busy"));
      return;
    }
    const kind = classifyFile(file);
    if (kind === "too-large") return setStatus(t("compare.status.tooLarge"));
    if (kind === "unsupported") return setStatus(t("compare.status.unsupported"));
    setImporting(true);
    setStatus(t("compare.status.loading"));
    try {
      let blob: Blob = file;
      let suffix = "";
      if (kind === "pdf") {
        const rendered = await deps.renderPdf(await file.arrayBuffer(), choosePage);
        if (!rendered) return setStatus(t("compare.status.cancelled"));
        blob = rendered.blob;
        suffix = ` · ${rendered.page}/${rendered.count}`;
      }
      const decoded = await deps.decode(blob);
      abortRef.current?.abort();
      setImages((prev) => {
        prev[slot]?.bitmap.close();
        return { ...prev, [slot]: { ...decoded, name: file.name + suffix, blob: file } };
      });
      dispatch({ type: "image-replaced" });
      setStatus(t("compare.status.loaded"));
    } catch (error) {
      setStatus(
        error instanceof PdfPasswordError
          ? t("compare.status.password")
          : kind === "heic"
            ? t("compare.status.heic")
            : t("compare.status.unsupported"),
      );
    } finally {
      setImporting(false);
    }
  }

  const onPick = (slot: Slot) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    void load(slot, file);
  };

  function feed(event: GestureEvent) {
    if (!original) return;
    const rect = workspaceRef.current?.getBoundingClientRect();
    const width = rect?.width || 1;
    const height = rect?.height || 1;
    const s = stateRef.current;
    const step = gestures(gestureRef.current, event, {
      center: { x: (rect?.left ?? 0) + width / 2, y: (rect?.top ?? 0) + height / 2 },
      scale: Math.min(width / original.width, height / original.height),
      view: s.view,
      layer: s.layer,
      moveLayer: s.aligning && s.alignGestures && !immersive && !s.corners,
      originalWidth: original.width,
    });
    gestureRef.current = step.state;
    for (const out of step.outputs) {
      if (out.type === "tap") dispatch({ type: "toggle-reveal" });
      else if (out.type === "hold") dispatch({ type: "hold", active: out.active });
      else if (out.type === "view") dispatch({ type: "set-view", view: out.view });
      else dispatch({ type: "set-layer", layer: out.layer });
    }
  }

  function local(event: PointerEvent<HTMLDivElement>) {
    const rect = workspaceRef.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!ready || busy || !original) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const s = stateRef.current;
    if (s.aligning && s.corners && !dragging) {
      const corner = hitCorner(s.corners, local(event), s.view, original, size, HANDLE_RADIUS);
      if (corner !== null) {
        dispatch({ type: "select-corner", index: corner });
        setDragging({ pointer: event.pointerId, target: corner });
        return;
      }
    }
    if (
      s.split !== null &&
      !dragging &&
      hitSplit(s.split, local(event), s.view, original, size, HANDLE_RADIUS)
    ) {
      setDragging({ pointer: event.pointerId, target: "split" });
      return;
    }
    feed({ type: "down", id: event.pointerId, x: event.clientX, y: event.clientY, t: deps.now() });
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => feed({ type: "tick", t: deps.now() }), HOLD_MS);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragging?.pointer === event.pointerId && original) {
      const view = stateRef.current.view;
      if (dragging.target === "split") {
        dispatch({ type: "split-set", value: splitFromScreen(local(event), view, original, size) });
      } else {
        const point = screenToOriginal(local(event), view, original, size);
        dispatch({ type: "corner-set", index: dragging.target, point });
      }
      return;
    }
    feed({ type: "move", id: event.pointerId, x: event.clientX, y: event.clientY, t: deps.now() });
  }

  const endPointer = (type: "up" | "cancel") => (event: PointerEvent<HTMLDivElement>) => {
    if (dragging?.pointer === event.pointerId) {
      setDragging(null);
      return;
    }
    clearTimeout(holdTimer.current);
    feed(
      type === "up" ? { type, id: event.pointerId, t: deps.now() } : { type, id: event.pointerId },
    );
  };

  useEffect(() => {
    const onBlur = () => {
      clearTimeout(holdTimer.current);
      gestureRef.current = idleGesture();
      dispatch({ type: "hold", active: false });
    };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  async function runAutoAlign() {
    if (!original || !reference || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setAligningAuto(true);
    const w = 160;
    const h = Math.max(16, Math.round((w * original.height) / original.width));
    const layer = stateRef.current.layer;
    try {
      const result = await autoAlign(
        deps.gray(original.bitmap, w, h),
        deps.gray(reference.bitmap, w, h),
        { x: layer.x * w, y: layer.y * w, scale: layer.scale, rotationDeg: layer.rotationDeg },
        {
          signal: controller.signal,
          onLevel: (level) =>
            setStatus(t("compare.status.aligning", { percent: String((level + 1) * 20) })),
        },
      );
      if (result.accepted) {
        const tr = result.transform;
        dispatch({
          type: "set-layer",
          layer: { x: tr.x / w, y: tr.y / w, scale: tr.scale, rotationDeg: tr.rotationDeg },
        });
        setStatus(t("compare.status.aligned"));
      } else {
        setStatus(t("compare.status.noMatch"));
      }
    } catch {
      if (!controller.signal.aborted) setStatus(t("compare.status.noMatch"));
    } finally {
      setAligningAuto(false);
    }
  }

  async function save(kind: "original" | "reference" | "png" | "jpeg") {
    if (!original || !reference) return;
    try {
      let file: File;
      if (kind === "original" || kind === "reference") {
        const image = kind === "original" ? original : reference;
        file = new File([image.blob], image.name.replace(/ · .*$/, ""), { type: image.blob.type });
      } else {
        const size = exportSize(original.width, original.height);
        const type = kind === "png" ? "image/png" : "image/jpeg";
        const blob = await deps.renderBlob(size, type, (ctx) => {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, size.width, size.height);
          ctx.setTransform(size.scale, 0, 0, size.scale, size.width / 2, size.height / 2);
          drawArtwork(ctx, original.bitmap, reference.bitmap, stateRef.current, warped);
        });
        file = new File([blob], `Vergleich.${kind === "png" ? "png" : "jpg"}`, { type });
      }
      await deps.share(file);
    } catch {
      setStatus(t("compare.status.exportFailed"));
    }
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "+" || event.key === "=") dispatch({ type: "zoom", factor: 1.5 });
    else if (event.key === "-") dispatch({ type: "zoom", factor: 1 / 1.5 });
    else if (event.key === "0") dispatch({ type: "fit" });
    else if (event.key === " ") {
      event.preventDefault();
      dispatch({ type: "toggle-reveal" });
    } else return;
  }

  const opacityPercent = Math.round(state.opacity * 100);
  const param = state.activeParam;
  const opacitySlider = (id: string) => (
    <label className="ns-field" htmlFor={id}>
      {t("compare.opacity")}: {opacityPercent} %
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={opacityPercent}
        onChange={(e) => dispatch({ type: "opacity", percent: Number(e.target.value) })}
      />
    </label>
  );

  const workspace = (
    <div
      ref={(el) => {
        workspaceRef.current = el;
        setWorkspaceEl(el);
      }}
      role="application"
      className="ns-workspace"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the gesture surface takes keyboard shortcuts (+, -, 0, Space; legacy V1)
      tabIndex={0}
      aria-label={t("compare.workspace")}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer("up")}
      onPointerCancel={endPointer("cancel")}
      onLostPointerCapture={endPointer("cancel")}
      onContextMenu={(e) => e.preventDefault()}
      onWheel={(e) => dispatch({ type: "zoom", factor: e.deltaY < 0 ? 1.1 : 1 / 1.1 })}
      onKeyDown={onKeyDown}
    >
      <canvas ref={canvasRef} className="ns-canvas" />
      <span className="ns-badge">{t(badge(state))}</span>
    </div>
  );

  const pickers = (
    <div className="ns-row">
      {(["original", "reference"] as const).map((slot) => (
        <label key={slot} className="ns-file">
          {t(slot === "original" ? "compare.pick.original" : "compare.pick.reference")}
          {images[slot] ? `: ${images[slot]?.name}` : ""}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.pdf"
            onChange={onPick(slot)}
            disabled={busy}
          />
        </label>
      ))}
    </div>
  );

  return (
    <section className="ns-compare">
      {pickers}
      {!ready && <p>{t("compare.empty")}</p>}
      <p className="ns-status" role="status" aria-live="polite">
        {status}
      </p>
      {ready && !immersive && workspace}
      {ready && (
        <>
          {opacitySlider("ns-opacity")}
          <div className="ns-row">
            <button type="button" onClick={() => dispatch({ type: "show-original" })}>
              {t("compare.original")}
            </button>
            <button
              type="button"
              onPointerDown={() => dispatch({ type: "hold", active: true })}
              onPointerUp={() => dispatch({ type: "hold", active: false })}
              onPointerCancel={() => dispatch({ type: "hold", active: false })}
              onKeyDown={(e) =>
                (e.key === " " || e.key === "Enter") && dispatch({ type: "hold", active: true })
              }
              onKeyUp={() => dispatch({ type: "hold", active: false })}
            >
              {t("compare.hold")}
            </button>
            <button type="button" onClick={() => dispatch({ type: "half" })}>
              {t("compare.half")}
            </button>
            <button type="button" onClick={() => dispatch({ type: "reference" })}>
              {t("compare.reference")}
            </button>
            <button
              type="button"
              aria-pressed={state.split !== null}
              onClick={() => dispatch({ type: "split", on: state.split === null })}
            >
              {t("compare.split")}
            </button>
          </div>
          {state.split !== null && (
            <label className="ns-field" htmlFor="ns-split">
              {t("compare.splitPosition")}: {Math.round(state.split * 100)} %
              <input
                id="ns-split"
                type="range"
                min={0}
                max={100}
                value={Math.round(state.split * 100)}
                onChange={(e) =>
                  dispatch({ type: "split-set", value: Number(e.target.value) / 100 })
                }
              />
            </label>
          )}
          <div className="ns-row">
            <button type="button" onClick={() => dispatch({ type: "zoom", factor: 1.5 })}>
              {t("compare.zoomIn")}
            </button>
            <button type="button" onClick={() => dispatch({ type: "zoom", factor: 1 / 1.5 })}>
              {t("compare.zoomOut")}
            </button>
            <button type="button" onClick={() => dispatch({ type: "fit" })}>
              {t("compare.fit")}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "alignment", open: !state.aligning })}
            >
              {t(state.aligning ? "compare.compare" : "compare.align")}
            </button>
            <button type="button" onClick={() => setImmersive(true)}>
              {t("immersive.open")}
            </button>
            <button type="button" onClick={() => setExportOpen(true)}>
              {t("compare.save")}
            </button>
          </div>
          {state.aligning && (
            <fieldset className="ns-align">
              <legend>{t("compare.align")}</legend>
              <div className="ns-row" role="tablist">
                {(Object.keys(PARAMS) as Param[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="tab"
                    aria-selected={p === param}
                    onClick={() => dispatch({ type: "select-param", param: p })}
                  >
                    {t(PARAM_LABEL[p])}
                  </button>
                ))}
              </div>
              <div className="ns-row">
                <button
                  type="button"
                  aria-label={t("compare.less")}
                  onClick={() => dispatch({ type: "nudge", direction: -1 })}
                >
                  −
                </button>
                <input
                  type="range"
                  aria-label={t(PARAM_LABEL[param])}
                  min={PARAMS[param].min}
                  max={PARAMS[param].max}
                  step={PARAMS[param].step}
                  value={paramValue(state)}
                  onChange={(e) => {
                    dispatch({ type: "set-param", value: Number(e.target.value) });
                    setStatus(t("compare.status.adjusted", { label: t(PARAM_LABEL[param]) }));
                  }}
                />
                <button
                  type="button"
                  aria-label={t("compare.more")}
                  onClick={() => dispatch({ type: "nudge", direction: 1 })}
                >
                  +
                </button>
                <output>{formatParam(param, paramValue(state))}</output>
              </div>
              <label className="ns-field">
                <input
                  type="checkbox"
                  checked={state.alignGestures}
                  onChange={(e) => dispatch({ type: "align-gestures", enabled: e.target.checked })}
                />
                {t("compare.alignGestures")}
              </label>
              <div className="ns-row">
                {state.corners ? (
                  <button type="button" onClick={() => dispatch({ type: "corners-clear" })}>
                    {t("compare.perspective.clear")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!original || !reference) return;
                      dispatch({
                        type: "corners-start",
                        corners: cornersFromLayer(state.layer, original, reference),
                      });
                      setStatus(t("compare.perspective.hint"));
                    }}
                  >
                    {t("compare.perspective.start")}
                  </button>
                )}
              </div>
              {state.corners && (
                <div className="ns-row">
                  {([0, 1, 2, 3] as const).map((i) => (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={state.activeCorner === i}
                      onClick={() => dispatch({ type: "select-corner", index: i })}
                    >
                      {t(`compare.corner.${i}`)}
                    </button>
                  ))}
                  {(
                    [
                      ["left", -1, 0, "←"],
                      ["up", 0, -1, "↑"],
                      ["right", 1, 0, "→"],
                      ["down", 0, 1, "↓"],
                    ] as const
                  ).map(([name, dx, dy, arrow]) => (
                    <button
                      key={name}
                      type="button"
                      aria-label={t(`compare.corner.${name}`)}
                      onClick={() => dispatch({ type: "corner-nudge", dx, dy })}
                    >
                      {arrow}
                    </button>
                  ))}
                </div>
              )}
              <div className="ns-row">
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: "reset-layer" });
                    setStatus(t("compare.status.reset"));
                  }}
                >
                  {t("compare.reset")}
                </button>
                <button type="button" onClick={() => void runAutoAlign()} disabled={busy}>
                  {t("compare.auto")}
                </button>
              </div>
            </fieldset>
          )}
        </>
      )}
      {ready && immersive && (
        <Immersive onClose={() => setImmersive(false)}>
          {workspace}
          <div className="ns-immersive-controls">
            {opacitySlider("ns-opacity-immersive")}
            <button type="button" onClick={() => dispatch({ type: "toggle-reveal" })}>
              {t(state.tapReveal ? "compare.compare" : "compare.original")}
            </button>
          </div>
        </Immersive>
      )}
      {pdfAsk && (
        <div
          className="ns-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t("compare.pdf.title")}
        >
          <h2>{t("compare.pdf.title")}</h2>
          <label className="ns-field">
            {t("compare.pdf.page", { count: String(pdfAsk.count) })}
            <input
              type="number"
              min={1}
              max={pdfAsk.count}
              value={pdfPage}
              onChange={(e) => setPdfPage(Number(e.target.value))}
            />
          </label>
          <div className="ns-row">
            <button
              type="button"
              onClick={() => {
                pdfAsk.resolve(Math.min(Math.max(1, Math.round(pdfPage) || 1), pdfAsk.count));
                setPdfAsk(null);
              }}
            >
              {t("compare.pdf.load")}
            </button>
            <button
              type="button"
              onClick={() => {
                pdfAsk.resolve(null);
                setPdfAsk(null);
              }}
            >
              {t("compare.pdf.cancel")}
            </button>
          </div>
        </div>
      )}
      {exportOpen && (
        <div
          className="ns-dialog"
          role="dialog"
          aria-modal="true"
          aria-label={t("compare.export.title")}
        >
          <h2>{t("compare.export.title")}</h2>
          <div className="ns-row">
            <button type="button" onClick={() => void save("original")}>
              {t("compare.export.original")}
            </button>
            <button type="button" onClick={() => void save("reference")}>
              {t("compare.export.reference")}
            </button>
            <button type="button" onClick={() => void save("png")}>
              {t("compare.export.png")}
            </button>
            <button type="button" onClick={() => void save("jpeg")}>
              {t("compare.export.jpeg")}
            </button>
            <button type="button" onClick={() => setExportOpen(false)}>
              {t("compare.export.close")}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
