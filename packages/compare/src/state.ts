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

export interface CompareState {
  opacity: number;
  tapReveal: boolean;
  holdReveal: boolean;
  view: View;
  layer: Layer;
  aligning: boolean;
  alignGestures: boolean;
  activeParam: Param;
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
  | { type: "image-replaced" };

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
  return { ...state, opacity: clamp(fraction, 0, 1), tapReveal: false };
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
      return { ...state, layer: IDENTITY };
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
      return { ...state, view: FIT, layer: IDENTITY, tapReveal: false, holdReveal: false };
  }
}

export function effectiveOpacity(state: CompareState): number {
  return state.tapReveal || state.holdReveal ? 0 : state.opacity;
}

export type BadgeKey =
  | "compare.badge.reveal"
  | "compare.badge.align"
  | "compare.badge.original"
  | "compare.badge.reference"
  | "compare.badge.overlay";

export function badge(state: CompareState): BadgeKey {
  if (state.tapReveal || state.holdReveal) return "compare.badge.reveal";
  if (state.aligning) return "compare.badge.align";
  if (state.opacity === 0) return "compare.badge.original";
  if (state.opacity === 1) return "compare.badge.reference";
  return "compare.badge.overlay";
}
