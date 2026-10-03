/**
 * Quick Compare state (legacy behavior C1–C6, V3–V5 in docs/research/legacy-behavior.md).
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

export type Param = "x" | "y" | "scale" | "rotation";

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

/** One button step for a corner: 0.2 % of the image's width or height. */
export const CORNER_STEP = 0.002;

export interface CompareState {
  opacity: number;
  tapReveal: boolean;
  holdReveal: boolean;
  view: View;
  layer: Layer;
  aligning: boolean;
  alignGestures: boolean;
  activeParam: Param;
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
  activeCorner: number;
  /**
   * True once the quad of the current corner step holds the user's own placement (moved, or
   * kept from earlier); detected paper corners then no longer replace it (D-055).
   */
  cornerEdited: boolean;
  /** Split view divider as a fraction of the original's width; null for overlay mode. */
  split: number | null;
}

export const PARAMS: Record<Param, { min: number; max: number; step: number }> = {
  x: { min: -0.5, max: 0.5, step: 0.0005 },
  y: { min: -0.5, max: 0.5, step: 0.0005 },
  scale: { min: 0.4, max: 2, step: 0.001 },
  rotation: { min: -30, max: 30, step: 0.05 },
};

export const ZOOM = { min: 0.8, max: 8 } as const;
const DEFAULT_OPACITY = 0.65;

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
    alignGestures: true,
    activeParam: "x",
    corners: null,
    refCorners: null,
    cornerStep: null,
    cornersBefore: null,
    activeCorner: 0,
    cornerEdited: false,
    split: null,
  };
}

export type CompareAction =
  | { type: "opacity"; percent: number }
  | { type: "half" }
  | { type: "reference" }
  | { type: "show-original" }
  | { type: "toggle-reveal" }
  | { type: "hold"; active: boolean }
  | { type: "alignment"; open: boolean }
  | { type: "align-gestures"; enabled: boolean }
  | { type: "select-param"; param: Param }
  | { type: "nudge"; direction: 1 | -1 }
  | { type: "set-param"; value: number }
  | { type: "set-layer"; layer: Layer }
  | { type: "reset-layer" }
  | { type: "zoom"; factor: number }
  | { type: "set-view"; view: View }
  | { type: "fit" }
  | { type: "image-replaced" }
  | { type: "corners-begin" }
  | { type: "corners-next"; corners: Corners }
  | { type: "corners-back" }
  | { type: "corners-done" }
  | { type: "corners-cancel" }
  | { type: "corners-suggest"; step: CornerStep; corners: Corners }
  | { type: "corners-set"; corners: Corners }
  | { type: "select-corner"; index: number }
  | { type: "corner-set"; index: number; point: Point }
  | { type: "corner-nudge"; dx: number; dy: number }
  | { type: "corners-clear" }
  | { type: "split"; on: boolean }
  | { type: "split-set"; value: number };

const NO_CORNERS = { corners: null, refCorners: null, cornerStep: null, cornersBefore: null };

/** Move one corner of the quad the current corner step edits. */
function withCorner(
  state: CompareState,
  index: number,
  move: (corner: Point) => Point,
): CompareState {
  const key = state.cornerStep === "reference" ? "refCorners" : "corners";
  const quad = state.cornerStep ? state[key] : null;
  const corner = quad?.[index];
  if (!quad || !corner) return state;
  const next = quad.map((c, i) => (i === index ? move(corner) : c)) as unknown as Corners;
  return { ...state, [key]: next, cornerEdited: true };
}

const LAYER_KEY: Record<Param, keyof Layer> = {
  x: "x",
  y: "y",
  scale: "scale",
  rotation: "rotationDeg",
};

export function paramValue(state: CompareState, param: Param = state.activeParam): number {
  return state.layer[LAYER_KEY[param]];
}

function withParam(state: CompareState, value: number): CompareState {
  const { min, max } = PARAMS[state.activeParam];
  return {
    ...state,
    layer: { ...state.layer, [LAYER_KEY[state.activeParam]]: clamp(value, min, max) },
  };
}

function setOpacity(state: CompareState, fraction: number): CompareState {
  return { ...state, opacity: clamp(fraction, 0, 1), tapReveal: false, split: null };
}

export function compare(state: CompareState, action: CompareAction): CompareState {
  switch (action.type) {
    case "opacity":
      return setOpacity(state, action.percent / 100);
    case "half":
      return setOpacity(state, 0.5);
    case "reference":
      return setOpacity(state, 1);
    case "show-original":
      return { ...state, tapReveal: true };
    case "toggle-reveal":
      return { ...state, tapReveal: !state.tapReveal };
    case "hold":
      return { ...state, holdReveal: action.active };
    case "alignment":
      return action.open
        ? { ...setOpacity(state, 0.5), aligning: true }
        : { ...state, aligning: false };
    case "align-gestures":
      return { ...state, alignGestures: action.enabled };
    case "select-param":
      return { ...state, activeParam: action.param };
    case "nudge":
      return withParam(
        state,
        paramValue(state) + action.direction * PARAMS[state.activeParam].step,
      );
    case "set-param":
      return withParam(state, action.value);
    case "set-layer":
      return { ...state, layer: action.layer };
    case "reset-layer":
      return { ...state, layer: IDENTITY, ...NO_CORNERS };
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
        ...NO_CORNERS,
      };
    case "corners-begin":
      return {
        ...state,
        cornersBefore: { corners: state.corners, refCorners: state.refCorners },
        refCorners: state.refCorners ?? IMAGE_CORNERS,
        cornerStep: "reference",
        activeCorner: 0,
        cornerEdited: state.refCorners !== null,
        view: CORNER_VIEW,
        aligning: false,
        split: null,
        tapReveal: false,
        holdReveal: false,
      };
    case "corners-next":
      return state.cornerStep === "reference"
        ? {
            ...state,
            corners: state.corners ?? action.corners,
            cornerStep: "original",
            activeCorner: 0,
            cornerEdited: state.corners !== null,
            view: CORNER_VIEW,
          }
        : state;
    case "corners-back":
      return {
        ...state,
        cornerStep: "reference",
        activeCorner: 0,
        cornerEdited: true,
        view: CORNER_VIEW,
      };
    case "corners-done":
      return { ...setOpacity(state, 0.5), cornerStep: null, cornersBefore: null, view: FIT };
    case "corners-cancel":
      return {
        ...state,
        corners: state.cornersBefore?.corners ?? null,
        refCorners: state.cornersBefore?.refCorners ?? null,
        cornerStep: null,
        cornersBefore: null,
        view: FIT,
      };
    case "corners-suggest":
      if (state.cornerStep !== action.step || state.cornerEdited) return state;
      return action.step === "reference"
        ? { ...state, refCorners: action.corners }
        : { ...state, corners: action.corners };
    case "corners-set":
      return { ...state, ...NO_CORNERS, corners: action.corners };
    case "select-corner":
      return { ...state, activeCorner: action.index };
    case "corner-set":
      return withCorner(state, action.index, () => action.point);
    case "corner-nudge":
      return withCorner(state, state.activeCorner, (c) => ({
        x: c.x + action.dx * CORNER_STEP,
        y: c.y + action.dy * CORNER_STEP,
      }));
    case "corners-clear":
      return { ...state, ...NO_CORNERS };
    case "split":
      return action.on
        ? { ...state, split: 0.5, tapReveal: false, aligning: false }
        : { ...state, split: null };
    case "split-set":
      return state.split === null ? state : { ...state, split: clamp(action.value, 0, 1) };
  }
}

export function effectiveOpacity(state: CompareState): number {
  if (state.tapReveal || state.holdReveal) return 0;
  return state.split === null ? state.opacity : 1;
}

export type BadgeKey =
  | "compare.badge.reveal"
  | "compare.badge.align"
  | "compare.badge.original"
  | "compare.badge.reference"
  | "compare.badge.overlay"
  | "compare.badge.split"
  | "compare.badge.cornersReference"
  | "compare.badge.cornersOriginal";

export function badge(state: CompareState): BadgeKey {
  if (state.cornerStep === "reference") return "compare.badge.cornersReference";
  if (state.cornerStep === "original") return "compare.badge.cornersOriginal";
  if (state.tapReveal || state.holdReveal) return "compare.badge.reveal";
  if (state.aligning) return "compare.badge.align";
  if (state.split !== null) return "compare.badge.split";
  if (state.opacity === 0) return "compare.badge.original";
  if (state.opacity === 1) return "compare.badge.reference";
  return "compare.badge.overlay";
}
