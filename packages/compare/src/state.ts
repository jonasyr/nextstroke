/**
 * Quick Compare state (legacy behavior in docs/research/legacy-behavior.md; editor D-056).
 * Layer position is a fraction of the original's width; view offsets are CSS pixels.
 */
export interface View {
  zoom: number;
  x: number;
  y: number;
}

export interface Layer {
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
}

interface Point {
  x: number;
  y: number;
}
/** Reference corners on the original (TL, TR, BR, BL), normalized; see corners.ts. */
export type Corners = readonly [Point, Point, Point, Point];

/** The corners of a whole image, normalized. */
export const IMAGE_CORNERS: Corners = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

/** Which image the paper corners are being placed on. */
export type CornerStep = "reference" | "original";

export interface CompareState {
  opacity: number;
  tapReveal: boolean;
  holdReveal: boolean;
  view: View;
  layer: Layer;
  aligning: boolean;
  /** Layer from before alignment opened, restored on cancel. */
  alignBefore: Layer | null;
  /**
   * Paper corners on the original; when set, a perspective warp that maps `refCorners` onto
   * them replaces the affine layer for drawing.
   */
  corners: Corners | null;
  /** Paper corners on the reference, normalized to the reference; null means its image corners. */
  refCorners: Corners | null;
  /** The corner step in progress, if any. */
  cornerStep: CornerStep | null;
  /** Corners from before the current corner steps, restored on cancel. */
  cornersBefore: { corners: Corners | null; refCorners: Corners | null } | null;
  /** The quad the current corner step started from, restored by "Zurücksetzen". */
  stepStart: Corners | null;
  activeCorner: number;
  /**
   * True once the quad of the current corner step holds the user's own placement (moved, or
   * kept from earlier); detected paper corners then no longer replace it (D-055).
   */
  cornerEdited: boolean;
  /** Split view divider as a fraction of the original's width; null for overlay mode. */
  split: number | null;
  /** Undo and redo stacks of what the user adjusted (D-056). */
  past: readonly Doc[];
  future: readonly Doc[];
}

/** The part of the state that undo and redo restore; the view is not part of it. */
export interface Doc {
  opacity: number;
  split: number | null;
  layer: Layer;
  corners: Corners | null;
  refCorners: Corners | null;
}

export const PARAMS = {
  scale: { min: 0.4, max: 2 },
  rotation: { min: -30, max: 30 },
} as const;

export const ZOOM = { min: 0.8, max: 8 } as const;
const DEFAULT_OPACITY = 0.5;
const HISTORY = 50;

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const IDENTITY: Layer = { x: 0, y: 0, scale: 1, rotationDeg: 0 };
const FIT: View = { zoom: 1, x: 0, y: 0 };
/** Slightly zoomed out while placing corners, so rings at the image edge stay visible. */
export const CORNER_VIEW: View = { zoom: 0.85, x: 0, y: 0 };

export function initialState(): CompareState {
  return {
    opacity: DEFAULT_OPACITY,
    tapReveal: false,
    holdReveal: false,
    view: FIT,
    layer: IDENTITY,
    aligning: false,
    alignBefore: null,
    corners: null,
    refCorners: null,
    cornerStep: null,
    cornersBefore: null,
    stepStart: null,
    activeCorner: 0,
    cornerEdited: false,
    split: null,
    past: [],
    future: [],
  };
}

export type CompareAction =
  | { type: "opacity"; percent: number }
  | { type: "toggle-reveal" }
  | { type: "hold"; active: boolean }
  | { type: "alignment"; open: boolean }
  | { type: "alignment-cancel" }
  | { type: "set-layer"; layer: Layer }
  /** Moves the layer by fractions of the original's width. */
  | { type: "layer-nudge"; dx: number; dy: number }
  | { type: "layer-scale"; delta: number }
  | { type: "layer-rotate"; delta: number }
  | { type: "reset-layer" }
  | { type: "reset-all" }
  | { type: "zoom"; factor: number }
  | { type: "set-view"; view: View }
  | { type: "fit" }
  | { type: "image-replaced" }
  | { type: "corners-begin" }
  | { type: "corners-next"; corners: Corners }
  | { type: "corners-back" }
  | { type: "corners-done" }
  | { type: "corners-cancel" }
  | { type: "corners-suggest"; step: CornerStep; corners: Corners; force?: boolean }
  | { type: "corners-set"; corners: Corners }
  | { type: "corners-auto"; refCorners: Corners; corners: Corners }
  | { type: "corners-whole" }
  | { type: "corners-reset" }
  | { type: "select-corner"; index: number }
  | { type: "corner-set"; index: number; point: Point }
  /** Moves the selected corner by fractions of its image's width and height. */
  | { type: "corner-nudge"; dx: number; dy: number }
  | { type: "corners-clear" }
  | { type: "split"; on: boolean }
  | { type: "split-set"; value: number }
  | { type: "checkpoint" }
  | { type: "undo" }
  | { type: "redo" };

const NO_CORNERS = {
  corners: null,
  refCorners: null,
  cornerStep: null,
  cornersBefore: null,
  stepStart: null,
};

const stepKey = (state: CompareState) =>
  state.cornerStep === "reference" ? ("refCorners" as const) : ("corners" as const);

/** Move one corner of the quad the current corner step edits. */
function withCorner(
  state: CompareState,
  index: number,
  move: (corner: Point) => Point,
): CompareState {
  const key = stepKey(state);
  const quad = state.cornerStep ? state[key] : null;
  const corner = quad?.[index];
  if (!quad || !corner) return state;
  const next = quad.map((c, i) => (i === index ? move(corner) : c)) as unknown as Corners;
  return { ...state, [key]: next, cornerEdited: true };
}

/** Replace the quad of the current corner step. */
function withStepQuad(state: CompareState, quad: Corners | null): CompareState {
  if (!state.cornerStep || !quad) return state;
  return { ...state, [stepKey(state)]: quad, cornerEdited: true };
}

function setOpacity(state: CompareState, fraction: number): CompareState {
  return { ...state, opacity: clamp(fraction, 0, 1), tapReveal: false, split: null };
}

const docOf = (s: CompareState): Doc => ({
  opacity: s.opacity,
  split: s.split,
  layer: s.layer,
  corners: s.corners,
  refCorners: s.refCorners,
});
const sameDoc = (a: Doc, b: Doc) => JSON.stringify(a) === JSON.stringify(b);

/** Pop entries until one differs from the present; null when none does. */
function popDifferent(stack: readonly Doc[], now: Doc): { doc: Doc; rest: Doc[] } | null {
  const rest = [...stack];
  for (let doc = rest.pop(); doc; doc = rest.pop()) if (!sameDoc(doc, now)) return { doc, rest };
  return null;
}

export const canUndo = (s: CompareState) => s.past.some((d) => !sameDoc(d, docOf(s)));
export const canRedo = (s: CompareState) => s.future.some((d) => !sameDoc(d, docOf(s)));

export function compare(state: CompareState, action: CompareAction): CompareState {
  switch (action.type) {
    case "opacity":
      return setOpacity(state, action.percent / 100);
    case "toggle-reveal":
      return { ...state, tapReveal: !state.tapReveal };
    case "hold":
      return { ...state, holdReveal: action.active };
    case "alignment": {
      if (!action.open) return { ...state, aligning: false, alignBefore: null };
      // Aligning needs both images visible at once.
      const visible = state.opacity > 0 && state.opacity < 1 ? state.opacity : 0.5;
      return { ...setOpacity(state, visible), aligning: true, alignBefore: state.layer };
    }
    case "alignment-cancel":
      return {
        ...state,
        aligning: false,
        layer: state.alignBefore ?? state.layer,
        alignBefore: null,
      };
    case "set-layer":
      return { ...state, layer: action.layer };
    case "layer-nudge":
      return {
        ...state,
        layer: { ...state.layer, x: state.layer.x + action.dx, y: state.layer.y + action.dy },
      };
    case "layer-scale":
      return {
        ...state,
        layer: {
          ...state.layer,
          scale: clamp(state.layer.scale + action.delta, PARAMS.scale.min, PARAMS.scale.max),
        },
      };
    case "layer-rotate":
      return {
        ...state,
        layer: {
          ...state.layer,
          rotationDeg: clamp(
            state.layer.rotationDeg + action.delta,
            PARAMS.rotation.min,
            PARAMS.rotation.max,
          ),
        },
      };
    case "reset-layer":
      return { ...state, layer: IDENTITY };
    case "reset-all":
      return {
        ...state,
        ...NO_CORNERS,
        layer: IDENTITY,
        opacity: DEFAULT_OPACITY,
        split: null,
        tapReveal: false,
        view: FIT,
      };
    case "zoom": {
      const zoom = clamp(state.view.zoom * action.factor, ZOOM.min, ZOOM.max);
      const f = zoom / state.view.zoom;
      return { ...state, view: { zoom, x: state.view.x * f, y: state.view.y * f } };
    }
    case "set-view":
      return { ...state, view: action.view };
    case "fit":
      return { ...state, view: state.cornerStep ? CORNER_VIEW : FIT };
    case "image-replaced":
      return {
        ...state,
        view: FIT,
        layer: IDENTITY,
        tapReveal: false,
        holdReveal: false,
        aligning: false,
        ...NO_CORNERS,
        past: [],
        future: [],
      };
    case "corners-begin": {
      const refCorners = state.refCorners ?? IMAGE_CORNERS;
      return {
        ...state,
        cornersBefore: { corners: state.corners, refCorners: state.refCorners },
        refCorners,
        stepStart: refCorners,
        cornerStep: "reference",
        activeCorner: 0,
        cornerEdited: state.refCorners !== null,
        view: CORNER_VIEW,
        aligning: false,
        split: null,
        tapReveal: false,
        holdReveal: false,
      };
    }
    case "corners-next": {
      if (state.cornerStep !== "reference") return state;
      const corners = state.corners ?? action.corners;
      return {
        ...state,
        corners,
        stepStart: corners,
        cornerStep: "original",
        activeCorner: 0,
        cornerEdited: state.corners !== null,
        view: CORNER_VIEW,
      };
    }
    case "corners-back":
      return {
        ...state,
        cornerStep: "reference",
        stepStart: state.refCorners,
        activeCorner: 0,
        cornerEdited: true,
        view: CORNER_VIEW,
      };
    case "corners-done":
      return {
        ...setOpacity(state, 0.5),
        cornerStep: null,
        cornersBefore: null,
        stepStart: null,
        view: FIT,
      };
    case "corners-cancel":
      return {
        ...state,
        corners: state.cornersBefore?.corners ?? null,
        refCorners: state.cornersBefore?.refCorners ?? null,
        cornerStep: null,
        cornersBefore: null,
        stepStart: null,
        view: FIT,
      };
    case "corners-suggest":
      if (state.cornerStep !== action.step || (state.cornerEdited && !action.force)) return state;
      return {
        ...state,
        [stepKey(state)]: action.corners,
        stepStart: action.corners,
        cornerEdited: Boolean(action.force),
      };
    case "corners-set":
      return { ...state, ...NO_CORNERS, corners: action.corners, layer: IDENTITY };
    case "corners-auto":
      return {
        ...state,
        ...NO_CORNERS,
        corners: action.corners,
        refCorners: action.refCorners,
        layer: IDENTITY,
      };
    case "corners-whole":
      return withStepQuad(state, IMAGE_CORNERS);
    case "corners-reset":
      return withStepQuad(state, state.stepStart);
    case "select-corner":
      return { ...state, activeCorner: action.index };
    case "corner-set":
      return withCorner(state, action.index, () => action.point);
    case "corner-nudge":
      return withCorner(state, state.activeCorner, (c) => ({
        x: c.x + action.dx,
        y: c.y + action.dy,
      }));
    case "corners-clear":
      return { ...state, ...NO_CORNERS };
    case "split":
      return action.on
        ? { ...state, split: state.split ?? 0.5, tapReveal: false, aligning: false }
        : { ...state, split: null };
    case "split-set":
      return state.split === null ? state : { ...state, split: clamp(action.value, 0, 1) };
    case "checkpoint": {
      const now = docOf(state);
      const last = state.past[state.past.length - 1];
      if (last && sameDoc(last, now)) return state;
      return { ...state, past: [...state.past.slice(1 - HISTORY), now], future: [] };
    }
    case "undo": {
      const step = popDifferent(state.past, docOf(state));
      if (!step) return state;
      return { ...state, ...step.doc, past: step.rest, future: [...state.future, docOf(state)] };
    }
    case "redo": {
      const step = popDifferent(state.future, docOf(state));
      if (!step) return state;
      return { ...state, ...step.doc, future: step.rest, past: [...state.past, docOf(state)] };
    }
  }
}

export function effectiveOpacity(state: CompareState): number {
  if (state.tapReveal || state.holdReveal) return 0;
  return state.split === null ? state.opacity : 1;
}
