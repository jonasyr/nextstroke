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

/** One button step for a corner: 0.2 % of the original's width or height. */
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
  /** Four-point perspective; when set it replaces the affine layer for drawing. */
  corners: Corners | null;
  activeCorner: number;
  /** Split view divider as a fraction of the original's width; null for overlay mode. */
  split: number | null;
}

export const PARAMS: Record<Param, { min: number; max: number; step: number }> = {
  x: { min: -0.5, max: 0.5, step: 0.0005 },
  y: { min: -0.5, max: 0.5, step: 0.0005 },
  scale: { min: 0.4, max: 2, step: 0.001 },
  rotation: { min: -30, max: 30, step: 0.05 },
};

export const ZOOM = { min: 1, max: 8 } as const;
const DEFAULT_OPACITY = 0.65;

export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const IDENTITY: Layer = { x: 0, y: 0, scale: 1, rotationDeg: 0 };
const FIT: View = { zoom: 1, x: 0, y: 0 };

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
    activeCorner: 0,
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
  | { type: "corners-start"; corners: Corners }
  | { type: "select-corner"; index: number }
  | { type: "corner-set"; index: number; point: Point }
  | { type: "corner-nudge"; dx: number; dy: number }
  | { type: "corners-clear" }
  | { type: "split"; on: boolean }
  | { type: "split-set"; value: number };

function replaceCorner(corners: Corners, index: number, point: Point): Corners {
  return corners.map((c, i) => (i === index ? point : c)) as unknown as Corners;
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
      return { ...state, layer: IDENTITY, corners: null };
    case "zoom": {
      const zoom = clamp(state.view.zoom * action.factor, ZOOM.min, ZOOM.max);
      const f = zoom / state.view.zoom;
      return { ...state, view: { zoom, x: state.view.x * f, y: state.view.y * f } };
    }
    case "set-view":
      return { ...state, view: action.view };
    case "fit":
      return { ...state, view: FIT };
    case "image-replaced":
      return {
        ...state,
        view: FIT,
        layer: IDENTITY,
        tapReveal: false,
        holdReveal: false,
        corners: null,
      };
    case "corners-start":
      return { ...state, corners: action.corners, activeCorner: 0 };
    case "select-corner":
      return { ...state, activeCorner: action.index };
    case "corner-set":
      return state.corners
        ? { ...state, corners: replaceCorner(state.corners, action.index, action.point) }
        : state;
    case "corner-nudge": {
      const c = state.corners?.[state.activeCorner];
      if (!state.corners || !c) return state;
      const point = { x: c.x + action.dx * CORNER_STEP, y: c.y + action.dy * CORNER_STEP };
      return { ...state, corners: replaceCorner(state.corners, state.activeCorner, point) };
    }
    case "corners-clear":
      return { ...state, corners: null };
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
  | "compare.badge.split";

export function badge(state: CompareState): BadgeKey {
  if (state.tapReveal || state.holdReveal) return "compare.badge.reveal";
  if (state.aligning) return "compare.badge.align";
  if (state.split !== null) return "compare.badge.split";
  if (state.opacity === 0) return "compare.badge.original";
  if (state.opacity === 1) return "compare.badge.reference";
  return "compare.badge.overlay";
}
