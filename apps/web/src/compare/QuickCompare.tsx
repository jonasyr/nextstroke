import {
  autoAlign,
  badge,
  CORNER_VIEW,
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
  referenceHomography,
  screenToOriginal,
  splitFromScreen,
} from "@nextstroke/compare";
import { classifyFile, exportSize, type Rgba, warpPerspective } from "@nextstroke/imaging";
import { t } from "@nextstroke/ui";
import { type PointerEvent, useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Decoded } from "./decode.ts";
import { ExportDialog, type ExportKind, PdfDialog } from "./dialogs.tsx";
import { ImportScreen, type Slot } from "./ImportScreen.tsx";
import { AlignPanel, CornersPanel, ViewPanel } from "./panels.tsx";
import { PdfPasswordError, type renderPdfPage } from "./pdf.ts";
import {
  drawArtwork,
  drawComparison,
  drawSingle,
  type renderToBlob,
  type toGray,
} from "./render.ts";

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

/** Touch radius of corner handles and the split divider, in CSS pixels. */
const HANDLE_RADIUS = 32;
/** How long a status message stays over the image. */
const TOAST_MS = 4000;

/** A corner (index) or the split divider under a pointer, with the grab offset. */
interface Dragging {
  pointer: number;
  target: number | "split";
  dx: number;
  dy: number;
}

/** The quad the current corner step edits. */
function stepQuad(s: CompareState) {
  if (s.cornerStep === "reference") return s.refCorners;
  if (s.cornerStep === "original") return s.corners;
  return null;
}

export function QuickCompare({ deps }: { deps: CompareDeps }) {
  const [state, dispatch] = useReducer(compare, undefined, initialState);
  const [images, setImages] = useState<Partial<Record<Slot, Loaded>>>({});
  const [status, setStatus] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [aligningAuto, setAligningAuto] = useState(false);
  const [editor, setEditor] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pdfAsk, setPdfAsk] = useState<{
    count: number;
    resolve: (n: number | null) => void;
  } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [warped, setWarped] = useState<ImageBitmap | null>(null);
  const [dragging, setDragging] = useState<Dragging | null>(null);
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
  const open = editor && ready;
  /** The image under the workspace: the reference while its corners are placed. */
  const base = state.cornerStep === "reference" ? reference : original;

  // Track the workspace size; the canvas follows it.
  useEffect(() => {
    if (!workspaceEl || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const rect = workspaceEl.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(workspaceEl);
    return () => observer.disconnect();
  }, [workspaceEl]);

  // Messages over the image fade; on the import screen they stay.
  useEffect(() => {
    if (!open || !status) return;
    const timer = setTimeout(() => setStatus(""), TOAST_MS);
    return () => clearTimeout(timer);
  }, [open, status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !original || !reference || !base || size.width === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const quad = stepQuad(state);
    if (quad) {
      drawSingle(ctx, {
        image: base.bitmap,
        view: state.view,
        viewport: size,
        dpr,
        overlay: {
          handles: cornersOnScreen(quad, state.view, base, size),
          active: state.activeCorner,
          loupe: typeof dragging?.target === "number",
        },
      });
      return;
    }
    drawComparison(ctx, {
      original: original.bitmap,
      reference: reference.bitmap,
      state,
      viewport: size,
      dpr,
      warped,
    });
  });

  // Warp the reference into the original's grid once corners settle (not while dragging).
  const { corners, refCorners } = state;
  useEffect(() => {
    if (!corners || !original || !reference || dragging) return;
    const h = referenceHomography(corners, original, reference, refCorners ?? undefined);
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
  }, [corners, refCorners, original, reference, dragging, deps]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const choosePage = useCallback(
    (count: number) =>
      new Promise<number | null>((resolve) => {
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
      const other = slot === "original" ? images.reference : images.original;
      setStatus(t(other ? "compare.status.ready" : "compare.status.loaded"));
      if (other) setEditor(true);
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

  function feed(event: GestureEvent) {
    if (!base) return;
    const rect = workspaceRef.current?.getBoundingClientRect();
    const width = rect?.width || 1;
    const height = rect?.height || 1;
    const s = stateRef.current;
    const step = gestures(gestureRef.current, event, {
      center: { x: (rect?.left ?? 0) + width / 2, y: (rect?.top ?? 0) + height / 2 },
      scale: Math.min(width / base.width, height / base.height),
      view: s.view,
      layer: s.layer,
      moveLayer: s.aligning && s.alignGestures && !s.corners && !s.cornerStep,
      originalWidth: base.width,
    });
    gestureRef.current = step.state;
    for (const out of step.outputs) {
      if (out.type === "view") dispatch({ type: "set-view", view: out.view });
      else if (out.type === "layer") dispatch({ type: "set-layer", layer: out.layer });
      else if (s.cornerStep) continue;
      else if (out.type === "tap") dispatch({ type: "toggle-reveal" });
      else dispatch({ type: "hold", active: out.active });
    }
  }

  function local(event: PointerEvent<HTMLDivElement>) {
    const rect = workspaceRef.current?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!ready || busy || !base || !original) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const s = stateRef.current;
    const p = local(event);
    const quad = stepQuad(s);
    if (quad && !dragging) {
      const corner = hitCorner(quad, p, s.view, base, size, HANDLE_RADIUS);
      const at = corner === null ? null : cornersOnScreen(quad, s.view, base, size)[corner];
      if (corner !== null && at) {
        dispatch({ type: "select-corner", index: corner });
        setDragging({ pointer: event.pointerId, target: corner, dx: at.x - p.x, dy: at.y - p.y });
        return;
      }
    }
    if (
      !s.cornerStep &&
      s.split !== null &&
      !dragging &&
      hitSplit(s.split, p, s.view, original, size, HANDLE_RADIUS)
    ) {
      setDragging({ pointer: event.pointerId, target: "split", dx: 0, dy: 0 });
      return;
    }
    feed({ type: "down", id: event.pointerId, x: event.clientX, y: event.clientY, t: deps.now() });
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => feed({ type: "tick", t: deps.now() }), HOLD_MS);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragging?.pointer === event.pointerId && base) {
      const view = stateRef.current.view;
      const p = local(event);
      if (dragging.target === "split") {
        dispatch({ type: "split-set", value: splitFromScreen(p, view, base, size) });
      } else {
        const point = screenToOriginal(
          { x: p.x + dragging.dx, y: p.y + dragging.dy },
          view,
          base,
          size,
        );
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

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditor(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function nextCornerStep() {
    if (!original || !reference) return;
    const s = stateRef.current;
    dispatch({
      type: "corners-next",
      corners: cornersFromLayer(s.layer, original, reference, s.refCorners ?? undefined),
    });
  }

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

  async function save(kind: ExportKind) {
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
      if (!state.cornerStep) dispatch({ type: "toggle-reveal" });
    }
  }

  const home = state.cornerStep ? CORNER_VIEW : { zoom: 1, x: 0, y: 0 };
  const zoomed =
    state.view.zoom !== home.zoom || state.view.x !== home.x || state.view.y !== home.y;

  const panel = state.cornerStep ? (
    <CornersPanel state={state} dispatch={dispatch} onNext={nextCornerStep} />
  ) : state.aligning ? (
    <AlignPanel
      state={state}
      dispatch={dispatch}
      busy={busy}
      onAuto={() => void runAutoAlign()}
      onStatus={setStatus}
    />
  ) : (
    <ViewPanel
      state={state}
      dispatch={dispatch}
      onCorners={() => {
        setStatus("");
        dispatch({ type: "corners-begin" });
      }}
    />
  );

  return (
    <section className="ns-compare">
      {!open && (
        <ImportScreen
          names={{ original: original?.name, reference: reference?.name }}
          busy={busy}
          status={status}
          onPick={(slot, file) => void load(slot, file)}
          onOpen={() => {
            setStatus("");
            setEditor(true);
          }}
        />
      )}
      {open && (
        <div className="ns-editor" role="dialog" aria-modal="true" aria-label={t("compare.editor")}>
          <div className="ns-editor-top">
            <button type="button" onClick={() => setEditor(false)}>
              {t("compare.back")}
            </button>
            <button type="button" onClick={() => setExportOpen(true)}>
              {t("compare.save")}
            </button>
          </div>
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
            {/* While placing corners the panel title names the step; the badge would hide a ring. */}
            {!state.cornerStep && <span className="ns-badge">{t(badge(state))}</span>}
            {zoomed && (
              <button
                type="button"
                className="ns-fit"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => dispatch({ type: "fit" })}
              >
                {t("compare.fit")}
              </button>
            )}
            <p className="ns-toast" role="status" aria-live="polite">
              {status}
            </p>
          </div>
          <div className="ns-panel">{panel}</div>
        </div>
      )}
      {pdfAsk && (
        <PdfDialog
          count={pdfAsk.count}
          onChoose={(page) => {
            pdfAsk.resolve(page);
            setPdfAsk(null);
          }}
        />
      )}
      {open && exportOpen && (
        <ExportDialog onSave={(kind) => void save(kind)} onClose={() => setExportOpen(false)} />
      )}
    </section>
  );
}
