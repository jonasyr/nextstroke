import type { PaperResult } from "@nextstroke/compare";
import {
  autoAlign,
  CORNER_VIEW,
  type CompareAction,
  type CompareState,
  type CornerStep,
  canRedo,
  canUndo,
  compare,
  confirmQuad,
  cornersFromLayer,
  cornersOnScreen,
  type GestureEvent,
  gestures,
  HOLD_MS,
  hitCorner,
  hitSplit,
  IMAGE_CORNERS,
  idleGesture,
  initialState,
  invertHomography,
  quadThroughCorners,
  referenceHomography,
  refineCorners,
  screenToOriginal,
  splitFromScreen,
  workingSize,
} from "@nextstroke/compare";
import { classifyFile, exportSize, type Rgba, warpPerspective } from "@nextstroke/imaging";
import { type MessageKey, t } from "@nextstroke/ui";
import {
  ChevronLeft,
  Ellipsis,
  Hand,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  Share,
  Undo2,
  X,
} from "lucide-react";
import { type PointerEvent, useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { Decoded } from "./decode.ts";
import { type HintStore, hintStore } from "./hints.ts";
import { ICON, IconButton } from "./IconButton.tsx";
import { AlignPanel, ComparePanel, CornersPanel, type Mode, ModeBar } from "./panels.tsx";
import { PdfPasswordError, type renderPdfPage } from "./pdf.ts";
import {
  drawArtwork,
  drawComparison,
  drawSingle,
  type renderToBlob,
  type toGray,
} from "./render.ts";
import { type Slot, StartScreen } from "./StartScreen.tsx";
import {
  type ExportKind,
  ExportSheet,
  GesturesSheet,
  InfoSheet,
  type MoreAction,
  MoreMenu,
  PdfDialog,
} from "./sheets.tsx";
import type { VisionDeps } from "./visionClient.ts";

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
  /** Share sheet, falling back to a download. */
  share(file: File): Promise<unknown>;
  /** Save the file directly ("Bild sichern"). */
  download(file: File): void;
  renderBlob: typeof renderToBlob;
  gray: typeof toGray;
  /** Pixels of a bitmap and back, for the four-point perspective warp. */
  rgba(image: ImageBitmap): Rgba;
  fromRgba(rgba: Rgba): Promise<ImageBitmap>;
  now(): number;
  /** opencv.js paper detection and feature alignment; absent or failing, Quick Compare works without it (D-055). */
  vision?: VisionDeps;
  /** Keep the screen on while drawing; false when the browser cannot. */
  keepAwake?(): Promise<boolean>;
  hints?: HintStore;
}

/** Touch radius of corner rings and the split divider, in CSS pixels (D-056: nearest within 60). */
const RING_RADIUS = 60;
const DIVIDER_RADIUS = 28;
/** How long a status message stays over the image, and the magnifier after a button nudge. */
const TOAST_MS = 4000;
const LOUPE_MS = 1800;

/** A corner (index) or the split divider under a pointer, with the grab offset. */
interface Dragging {
  pointer: number;
  target: number | "split";
  dx: number;
  dy: number;
}

type Sheet = "export" | "more" | "info" | "gestures" | null;

/** The quad the current corner step edits. */
function stepQuad(s: CompareState) {
  if (s.cornerStep === "reference") return s.refCorners;
  if (s.cornerStep === "original") return s.corners;
  return null;
}

const modeOf = (s: CompareState): Mode =>
  s.cornerStep ? "corners" : s.aligning ? "align" : "compare";

/** Below this confidence the corner step says "Ecken prüfen". */
const SURE = 0.95;

export function QuickCompare({ deps }: { deps: CompareDeps }) {
  const [state, dispatch] = useReducer(compare, undefined, initialState);
  const apply = useCallback((action: CompareAction, record = false) => {
    if (record) dispatch({ type: "checkpoint" });
    dispatch(action);
  }, []);
  const [images, setImages] = useState<Partial<Record<Slot, Loaded>>>({});
  const [status, setStatus] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [aligningAuto, setAligningAuto] = useState(false);
  const [editor, setEditor] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [chrome, setChrome] = useState(true);
  const [fine, setFine] = useState(true);
  const [loupe, setLoupe] = useState(false);
  /** Rings of an automatic guess still to be checked, per corner step (D-061). */
  const [unsure, setUnsure] = useState<Record<CornerStep, number[]>>({
    reference: [],
    original: [],
  });
  const [pdfAsk, setPdfAsk] = useState<{
    count: number;
    resolve: (n: number | null) => void;
  } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [warped, setWarped] = useState<ImageBitmap | null>(null);
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [, setHintsSeen] = useState(0);
  const hints = useRef(deps.hints ?? hintStore(null)).current;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const [workspaceEl, setWorkspaceEl] = useState<HTMLDivElement | null>(null);
  const gestureRef = useRef(idleGesture());
  /** The current gesture already saved an undo checkpoint for moving the Vorlage. */
  const layerRecorded = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loupeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const stateRef = useRef<CompareState>(state);
  stateRef.current = state;
  const visionReady = useRef(false);
  /** Bumped on every image load; automatic alignment runs once per pair. */
  const pairRef = useRef(0);
  const autoForPair = useRef(-1);

  const { original, reference } = images;
  const ready = Boolean(original && reference);
  const busy = importing || aligningAuto;
  const open = editor && ready;
  const mode = modeOf(state);
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

  // Messages over the image fade; on the start screen they stay.
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
          loupe: loupe || typeof dragging?.target === "number",
          unsure: state.cornerStep ? unsure[state.cornerStep] : [],
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
      splitLabels: { left: t("split.left"), right: t("split.right") },
    });
  });

  // Warp the reference into the original's grid once corners settle (not while dragging).
  const { corners, refCorners } = state;
  useEffect(() => {
    if (!corners || !original || !reference || dragging) return;
    const h = referenceHomography(corners, original, reference, refCorners ?? undefined);
    const toSource = h && invertHomography(h);
    if (!toSource) {
      setStatus(t("status.folded"));
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

  /** Resolves to the vision deps once opencv.js is ready, telling the user while it loads. */
  const visionLoaded = useCallback(async (): Promise<VisionDeps | null> => {
    const vision = deps.vision;
    if (!vision) return null;
    if (!visionReady.current) setStatus(t("status.visionLoading"));
    const { ok } = await vision.load();
    visionReady.current = true;
    return ok ? vision : null;
  }, [deps]);

  // On opening a new pair: align by the drawing's content, else at sure paper corners, else
  // explain (D-056, D-057). A paper guess is never applied without the user seeing it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: alignByVision reads these same images; the effect runs once per new pair
  useEffect(() => {
    if (!open || !original || !reference || autoForPair.current === pairRef.current) return;
    autoForPair.current = pairRef.current;
    let cancelled = false;
    // Stop as soon as the user aligns or places corners themselves; their work wins.
    const stale = () =>
      cancelled || Boolean(stateRef.current.cornerStep || stateRef.current.aligning);
    void (async () => {
      const vision = await visionLoaded();
      if (stale()) return;
      const outcome = vision ? await alignByVision(vision, stale) : null;
      if (outcome === "stale") return;
      if (outcome === "content") return setStatus(t("status.aligned"));
      if (outcome === "paper") return setStatus(t("status.autoPaper"));
      setStatus(t("status.autoHint"));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, original, reference, visionLoaded]);

  /** Per-corner check of a paper guess: found corners snap, the rest are flagged (D-061). */
  async function confirmGuess(image: Loaded, guess: PaperResult) {
    const sure = guess.confidence >= SURE;
    const found =
      sure || !deps.vision
        ? null
        : await deps.vision.corners(image.bitmap, guess.corners, [0, 1, 2, 3]);
    return confirmQuad(guess.corners, found, sure);
  }

  /** Applies paper corners on both images; false when the user took over meanwhile. */
  async function applyPaper(
    photo: PaperResult,
    template: PaperResult | null,
    stale: () => boolean = () => false,
  ): Promise<boolean> {
    if (!original || !reference) return false;
    const drawing = await confirmGuess(original, photo);
    const vorlage = template
      ? await confirmGuess(reference, template)
      : { quad: IMAGE_CORNERS, unsure: [] };
    if (stale()) return false;
    dispatch({ type: "checkpoint" });
    dispatch({ type: "corners-auto", refCorners: vorlage.quad, corners: drawing.quad });
    setUnsure({ reference: vorlage.unsure, original: drawing.unsure });
    return true;
  }

  /** A ring was touched: it is the user's now, no longer flagged. */
  function touchCorner(index: number) {
    const step = stateRef.current.cornerStep;
    if (step) setUnsure((u) => ({ ...u, [step]: u[step].filter((i) => i !== index) }));
  }

  /** After a ring is dropped: onto the paper corner nearby, if one is clear (D-061). */
  async function snapRing(index: number) {
    const s = stateRef.current;
    const step = s.cornerStep;
    const quad = stepQuad(s);
    const ring = quad?.[index];
    const image = step === "reference" ? reference : original;
    if (!step || !ring || !image) return;
    const vision = await visionLoaded();
    const [found] = (vision && quad && (await vision.corners(image.bitmap, quad, [index]))) || [];
    const now = stateRef.current;
    if (!found || now.cornerStep !== step || stepQuad(now)?.[index] !== ring) return;
    dispatch({ type: "checkpoint" });
    dispatch({ type: "corner-set", index, point: found });
    setStatus(t("status.snapped"));
  }

  /**
   * Content alignment, else sure paper corners (D-057); applies what it finds. An unsure paper
   * guess is returned, not applied, so the caller decides whether to show it.
   */
  async function alignByVision(
    vision: VisionDeps,
    stale: () => boolean,
  ): Promise<
    "stale" | "content" | "paper" | { photo: PaperResult; template: PaperResult | null } | null
  > {
    if (!original || !reference) return null;
    const verdict = await vision.align(original.bitmap, reference.bitmap);
    if (stale()) return "stale";
    if (verdict?.accepted) {
      dispatch({ type: "checkpoint" });
      dispatch({ type: "corners-set", corners: verdict.corners });
      return "content";
    }
    const photo = await vision.detectPaper(original.bitmap);
    if (stale()) return "stale";
    if (!photo) return null;
    const template = await vision.detectPaper(reference.bitmap);
    if (stale()) return "stale";
    if (photo.confidence < SURE) return { photo, template };
    return (await applyPaper(photo, template, stale)) ? "paper" : "stale";
  }

  /**
   * Keep the placed corners and correct the rest by content (D-060): warp the Vorlage by the
   * corners, match it against the drawing, and take the match only as a small correction.
   */
  async function refineByContent(vision: VisionDeps): Promise<"refined" | "kept" | "stale"> {
    const s = stateRef.current;
    if (!original || !reference || !s.corners) return "kept";
    const grid = workingSize(original.width, original.height);
    const h = referenceHomography(s.corners, grid, reference, s.refCorners ?? undefined);
    const toSource = h && invertHomography(h);
    if (!toSource) return "kept";
    const pixels = warpPerspective(deps.rgba(reference.bitmap), toSource, grid.width, grid.height);
    const prewarped = await deps.fromRgba(pixels);
    const verdict = await vision.refine(original.bitmap, prewarped, s.corners);
    prewarped.close();
    if (stateRef.current.corners !== s.corners || stateRef.current.cornerStep) return "stale";
    const refined = verdict?.accepted ? refineCorners(s.corners, verdict.corners) : null;
    if (!refined) return "kept";
    dispatch({ type: "checkpoint" });
    dispatch({ type: "corners-refine", corners: refined });
    return "refined";
  }

  /** After placing corners, or on "Automatisch" with corners: the content correction on top. */
  async function runRefine() {
    if (busy) return;
    setAligningAuto(true);
    try {
      const vision = await visionLoaded();
      const outcome = vision ? await refineByContent(vision) : "kept";
      if (outcome !== "stale")
        setStatus(t(outcome === "refined" ? "status.refined" : "status.refineKept"));
    } catch {
      setStatus(t("status.refineKept"));
    } finally {
      setAligningAuto(false);
    }
  }

  /**
   * Place the rings of a corner step automatically. On the drawing, the content alignment
   * carries the Vorlage's rings over, so both quads match; the paper outline is the fallback.
   */
  async function detectStep(step: CornerStep, force: boolean) {
    const image = step === "reference" ? reference : original;
    if (!image || !original || !reference) return;
    const vision = await visionLoaded();
    if (vision && step === "original") {
      const verdict = await vision.align(original.bitmap, reference.bitmap);
      const carried =
        verdict?.accepted &&
        quadThroughCorners(stateRef.current.refCorners ?? IMAGE_CORNERS, verdict.corners);
      if (carried) {
        if (force) dispatch({ type: "checkpoint" });
        dispatch({ type: "corners-suggest", step, corners: carried, force });
        setUnsure((u) => ({ ...u, original: [] }));
        return setStatus(t("status.cornersByContent"));
      }
    }
    const paper = vision && (await vision.detectPaper(image.bitmap));
    if (!paper) return setStatus(force ? t("status.paperMissing") : "");
    const { quad, unsure: flagged } = await confirmGuess(image, paper);
    // The user moved on, or took the rings over, while the corners were being checked.
    const now = stateRef.current;
    if (now.cornerStep !== step || (!force && now.cornerEdited)) return;
    if (force) dispatch({ type: "checkpoint" });
    dispatch({ type: "corners-suggest", step, corners: quad, force });
    setUnsure((u) => ({ ...u, [step]: flagged }));
    setStatus(t("status.paperFound"));
  }

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
      setStatus(t("status.busy"));
      return;
    }
    const kind = classifyFile(file);
    if (kind === "too-large") return setStatus(t("status.tooLarge"));
    if (kind === "unsupported") return setStatus(t("status.unsupported"));
    setImporting(true);
    setStatus(t("status.loading"));
    try {
      let blob: Blob = file;
      let suffix = "";
      if (kind === "pdf") {
        const rendered = await deps.renderPdf(await file.arrayBuffer(), choosePage);
        if (!rendered) return setStatus(t("status.cancelled"));
        blob = rendered.blob;
        suffix = ` · ${rendered.page}/${rendered.count}`;
      }
      const decoded = await deps.decode(blob);
      abortRef.current?.abort();
      pairRef.current += 1;
      setImages((prev) => {
        prev[slot]?.bitmap.close();
        return { ...prev, [slot]: { ...decoded, name: file.name + suffix, blob: file } };
      });
      dispatch({ type: "image-replaced" });
      const other = slot === "original" ? images.reference : images.original;
      setStatus(other ? "" : t("status.loaded"));
      if (other) setEditor(true);
    } catch (error) {
      setStatus(
        error instanceof PdfPasswordError
          ? t("status.password")
          : kind === "heic"
            ? t("status.heic")
            : t("status.unsupported"),
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
      moveLayer: s.aligning && !s.cornerStep,
      originalWidth: base.width,
    });
    gestureRef.current = step.state;
    for (const out of step.outputs) {
      if (out.type === "view") dispatch({ type: "set-view", view: out.view });
      else if (out.type === "layer") {
        // Record lazily: a two-finger zoom of the view leaves nothing to undo (D-059).
        if (!layerRecorded.current) apply({ type: "checkpoint" });
        layerRecorded.current = true;
        dispatch({ type: "set-layer", layer: out.layer });
      } else if (s.cornerStep) continue;
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
      const corner = hitCorner(quad, p, s.view, base, size, RING_RADIUS);
      const at = corner === null ? null : cornersOnScreen(quad, s.view, base, size)[corner];
      if (corner !== null && at) {
        touchCorner(corner);
        apply({ type: "select-corner", index: corner }, true);
        setDragging({ pointer: event.pointerId, target: corner, dx: at.x - p.x, dy: at.y - p.y });
        return;
      }
    }
    if (
      !s.cornerStep &&
      s.split !== null &&
      !dragging &&
      hitSplit(s.split, p, s.view, original, size, DIVIDER_RADIUS)
    ) {
      apply({ type: "checkpoint" });
      setDragging({ pointer: event.pointerId, target: "split", dx: 0, dy: 0 });
      return;
    }
    if (gestureRef.current.pointers.size === 0) layerRecorded.current = false;
    feed({ type: "down", id: event.pointerId, x: event.clientX, y: event.clientY, t: deps.now() });
    clearTimeout(holdTimer.current);
    // A small margin: a timer may fire a fraction early by the gesture clock, and the hold would
    // then never start.
    holdTimer.current = setTimeout(() => feed({ type: "tick", t: deps.now() }), HOLD_MS + 20);
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
      if (typeof dragging.target === "number" && type === "up") void snapRing(dragging.target);
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
      if (event.key !== "Escape") return;
      if (sheet) setSheet(null);
      else setEditor(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sheet]);

  useEffect(() => () => clearTimeout(loupeTimer.current), []);

  function showLoupe() {
    setLoupe(true);
    clearTimeout(loupeTimer.current);
    loupeTimer.current = setTimeout(() => setLoupe(false), LOUPE_MS);
  }

  function onMode(next: Mode) {
    setStatus("");
    if (next === "align") apply({ type: "alignment", open: true });
  }

  function beginCorners() {
    setStatus("");
    const fresh = stateRef.current.refCorners === null;
    apply({ type: "corners-begin" });
    if (fresh) void detectStep("reference", false);
  }

  function nextCornerStep() {
    if (!original || !reference) return;
    const s = stateRef.current;
    dispatch({
      type: "corners-next",
      corners: cornersFromLayer(s.layer, original, reference, s.refCorners ?? undefined),
    });
    if (s.corners === null) void detectStep("original", false);
  }

  async function runAutoAlign() {
    if (!original || !reference || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setAligningAuto(true);
    const w = 160;
    const h = Math.max(16, Math.round((w * original.height) / original.width));
    // The correlation search is affine: it starts from the layer, or from scratch under corners.
    const layer = stateRef.current.corners ? initialState().layer : stateRef.current.layer;
    try {
      // Content first, then sure paper corners, then the correlation search, and only then an
      // unsure paper guess, flagged for checking (D-057, D-058).
      const vision = await visionLoaded();
      const outcome = vision ? await alignByVision(vision, () => controller.signal.aborted) : null;
      if (outcome === "stale") return;
      if (outcome === "content") return setStatus(t("status.aligned"));
      if (outcome === "paper") return setStatus(t("status.autoPaper"));
      const result = await autoAlign(
        deps.gray(original.bitmap, w, h),
        deps.gray(reference.bitmap, w, h),
        { x: layer.x * w, y: layer.y * w, scale: layer.scale, rotationDeg: layer.rotationDeg },
        {
          signal: controller.signal,
          onLevel: (level) =>
            setStatus(t("status.aligning", { percent: String((level + 1) * 20) })),
        },
      );
      if (result.accepted) {
        const tr = result.transform;
        apply({ type: "corners-clear" }, true);
        apply({
          type: "set-layer",
          layer: { x: tr.x / w, y: tr.y / w, scale: tr.scale, rotationDeg: tr.rotationDeg },
        });
        setStatus(t("status.aligned"));
      } else if (outcome) {
        await applyPaper(outcome.photo, outcome.template);
        setStatus(t("status.paperGuess"));
      } else {
        setStatus(t("status.noMatch"));
      }
    } catch {
      if (!controller.signal.aborted) setStatus(t("status.noMatch"));
    } finally {
      setAligningAuto(false);
    }
  }

  async function exportFile(kind: ExportKind): Promise<File | null> {
    if (!original || !reference) return null;
    if (kind !== "current") {
      const image = kind === "drawing" ? original : reference;
      return new File([image.blob], image.name.replace(/ · .*$/, ""), { type: image.blob.type });
    }
    const out = exportSize(original.width, original.height);
    const blob = await deps.renderBlob(out, "image/jpeg", (ctx) => {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.setTransform(out.scale, 0, 0, out.scale, out.width / 2, out.height / 2);
      drawArtwork(ctx, original.bitmap, reference.bitmap, stateRef.current, warped);
    });
    return new File([blob], "Vergleich.jpg", { type: "image/jpeg" });
  }

  async function deliver(kind: ExportKind, how: "share" | "save") {
    try {
      const file = await exportFile(kind);
      if (!file) return;
      if (how === "share") await deps.share(file);
      else deps.download(file);
    } catch {
      setStatus(t("status.exportFailed"));
    }
  }

  async function onMore(action: MoreAction) {
    setSheet(action === "gestures" ? "gestures" : null);
    if (action === "hide") setChrome(false);
    if (action === "reset") apply({ type: "reset-all" }, true);
    if (action === "swap" && original && reference) {
      pairRef.current += 1;
      setImages({ original: reference, reference: original });
      dispatch({ type: "image-replaced" });
    }
    if (action === "wake") {
      const on = (await deps.keepAwake?.()) ?? false;
      setStatus(t(on ? "status.wakeOn" : "status.wakeOff"));
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

  const revealed = mode === "compare" && (state.tapReveal || state.holdReveal);
  const home = state.cornerStep ? CORNER_VIEW : { zoom: 1, x: 0, y: 0 };
  const zoomed =
    state.view.zoom !== home.zoom || state.view.x !== home.x || state.view.y !== home.y;
  const hintKey = `hint.${mode}` as MessageKey;

  const history = (
    <>
      <IconButton
        label={t("editor.undo")}
        disabled={!canUndo(state)}
        onClick={() => dispatch({ type: "undo" })}
      >
        <Undo2 {...ICON} />
      </IconButton>
      <IconButton
        label={t("editor.redo")}
        disabled={!canRedo(state)}
        onClick={() => dispatch({ type: "redo" })}
      >
        <Redo2 {...ICON} />
      </IconButton>
    </>
  );

  /** Compare: navigation and output. Align and corners: a modal edit with Cancel and Done (D-059). */
  function topBar() {
    if (mode === "align") {
      return (
        <ModeBar
          leading={{
            label: t("common.cancel"),
            onClick: () => apply({ type: "alignment-cancel" }),
          }}
          trailing={{
            label: t("common.done"),
            onClick: () => apply({ type: "alignment", open: false }),
          }}
        >
          {history}
        </ModeBar>
      );
    }
    if (mode === "corners") {
      const first = state.cornerStep === "reference";
      return (
        <ModeBar
          leading={
            first
              ? { label: t("common.cancel"), onClick: () => apply({ type: "corners-cancel" }) }
              : { label: t("corners.back"), onClick: () => apply({ type: "corners-back" }) }
          }
          trailing={
            first
              ? { label: t("corners.next"), onClick: nextCornerStep }
              : {
                  label: t("common.done"),
                  onClick: () => {
                    apply({ type: "corners-done" }, true);
                    void runRefine();
                  },
                }
          }
        >
          {history}
        </ModeBar>
      );
    }
    return (
      <div className="ns-topbar">
        <IconButton label={t("editor.back")} onClick={() => setEditor(false)}>
          <ChevronLeft {...ICON} />
        </IconButton>
        <div className="ns-group">{history}</div>
        <div className="ns-group">
          <IconButton label={t("editor.export")} onClick={() => setSheet("export")}>
            <Share {...ICON} />
          </IconButton>
          <IconButton label={t("editor.more")} onClick={() => setSheet("more")}>
            <Ellipsis {...ICON} />
          </IconButton>
        </div>
      </div>
    );
  }

  let panel = null;
  if (original && reference) {
    const both = { original: original.bitmap, reference: reference.bitmap };
    const stepImage = state.cornerStep === "reference" ? reference : original;
    panel =
      mode === "corners" && state.cornerStep ? (
        <CornersPanel
          state={state}
          apply={apply}
          size={stepImage}
          fine={fine}
          onFine={setFine}
          unsure={unsure[state.cornerStep]}
          onAuto={() => state.cornerStep && void detectStep(state.cornerStep, true)}
          onTouchCorner={(index) => {
            showLoupe();
            touchCorner(index);
          }}
        />
      ) : mode === "align" ? (
        <AlignPanel
          state={state}
          apply={apply}
          images={both}
          fine={fine}
          onFine={setFine}
          busy={busy}
          onAuto={() => void (state.corners ? runRefine() : runAutoAlign())}
          onCorners={beginCorners}
        />
      ) : (
        <ComparePanel state={state} apply={apply} images={both} onMode={onMode} />
      );
  }

  return (
    <section className="ns-compare">
      {!open && (
        <StartScreen
          images={images}
          busy={busy}
          status={status}
          onPick={(slot, file) => void load(slot, file)}
          onOpen={() => {
            setStatus("");
            setEditor(true);
          }}
          onMore={() => setSheet("info")}
        />
      )}
      {open && (
        <div className="ns-editor" role="dialog" aria-modal="true" aria-label={t("editor.label")}>
          {chrome && topBar()}
          <div
            ref={(el) => {
              workspaceRef.current = el;
              setWorkspaceEl(el);
            }}
            role="application"
            className="ns-stage"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the gesture surface takes keyboard shortcuts (+, -, 0, Space; legacy V1)
            tabIndex={0}
            aria-label={t("editor.canvas")}
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
            {revealed && <span className="ns-pill">{t("editor.onlyDrawing")}</span>}
            <p className="ns-toast" role="status" aria-live="polite">
              {status}
            </p>
            {mode !== "corners" && (
              <div className="ns-zoom" onPointerDown={(e) => e.stopPropagation()}>
                <IconButton
                  label={t("zoom.out")}
                  onClick={() => dispatch({ type: "zoom", factor: 1 / 1.5 })}
                >
                  <Minus {...ICON} />
                </IconButton>
                <button
                  type="button"
                  className="ns-pct"
                  aria-label={t("zoom.fit")}
                  disabled={!zoomed}
                  onClick={() => dispatch({ type: "fit" })}
                >
                  {Math.round(state.view.zoom * 100)} %
                </button>
                <IconButton
                  label={t("zoom.in")}
                  onClick={() => dispatch({ type: "zoom", factor: 1.5 })}
                >
                  <Plus {...ICON} />
                </IconButton>
              </div>
            )}
            {!chrome && (
              <IconButton
                className="ns-restore"
                label={t("editor.restore")}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setChrome(true)}
              >
                <Maximize2 {...ICON} />
              </IconButton>
            )}
          </div>
          {chrome && !hints.seen(mode) && (
            <div className="ns-hint">
              <Hand {...ICON} />
              <span>{t(hintKey)}</span>
              <IconButton
                label={t("hint.close")}
                onClick={() => {
                  hints.dismiss(mode);
                  setHintsSeen((n) => n + 1);
                }}
              >
                <X {...ICON} />
              </IconButton>
            </div>
          )}
          {chrome && <div className="ns-panel">{panel}</div>}
        </div>
      )}
      {sheet === "info" && (
        <InfoSheet onClose={() => setSheet(null)} onGestures={() => setSheet("gestures")} />
      )}
      {sheet === "gestures" && <GesturesSheet onClose={() => setSheet(null)} />}
      {open && sheet === "more" && (
        <MoreMenu onAction={(a) => void onMore(a)} onClose={() => setSheet(null)} />
      )}
      {open && sheet === "export" && (
        <ExportSheet
          onShare={(kind) => void deliver(kind, "share")}
          onSave={(kind) => void deliver(kind, "save")}
          onClose={() => setSheet(null)}
        />
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
    </section>
  );
}
