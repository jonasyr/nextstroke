import { clamp, type Layer, PARAMS, type View, ZOOM } from "./state.ts";

/**
 * Pointer gesture machine (legacy C4, C5, C7, V1, V2). Pure: the caller feeds pointer events
 * and clock ticks and applies the outputs. At most two pointers count; more are ignored.
 */
export const HOLD_MS = 280;
export const JITTER_PX = 5;

interface Point {
  x: number;
  y: number;
}

interface Press extends Point {
  id: number;
  downAt: number;
  held: boolean;
}

interface Start {
  mid: Point;
  dist: number;
  /** Angle between the two fingers, radians. */
  angle: number;
  view: View;
  layer: Layer;
}

export interface GestureState {
  pointers: ReadonlyMap<number, Point>;
  start: Start | null;
  press: Press | null;
}

export interface GestureContext {
  /** Viewport centre in client pixels. */
  center: Point;
  /** CSS pixels per original pixel at zoom 1 (fit scale). */
  scale: number;
  view: View;
  layer: Layer;
  /** True while aligning: gestures move, scale and twist the Vorlage layer. */
  moveLayer: boolean;
  originalWidth: number;
}

export type GestureEvent =
  | { type: "down"; id: number; x: number; y: number; t: number }
  | { type: "move"; id: number; x: number; y: number; t: number }
  | { type: "up"; id: number; t: number }
  | { type: "cancel"; id: number }
  | { type: "tick"; t: number }
  | { type: "blur" };

export type GestureOutput =
  | { type: "tap" }
  | { type: "hold"; active: boolean }
  | { type: "view"; view: View }
  | { type: "layer"; layer: Layer };

export function idleGesture(): GestureState {
  return { pointers: new Map(), start: null, press: null };
}

function begin(pointers: ReadonlyMap<number, Point>, ctx: GestureContext): Start | null {
  const [a, b] = [...pointers.values()];
  if (!a) return null;
  return {
    mid: b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a,
    dist: b ? Math.hypot(b.x - a.x, b.y - a.y) : 0,
    angle: b ? Math.atan2(b.y - a.y, b.x - a.x) : 0,
    view: ctx.view,
    layer: ctx.layer,
  };
}

function endPress(press: Press | null): GestureOutput[] {
  return press?.held ? [{ type: "hold", active: false }] : [];
}

function moved(start: Start, pointers: ReadonlyMap<number, Point>, ctx: GestureContext) {
  const [a, b] = [...pointers.values()] as [Point, Point | undefined];
  const mid = b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a;
  const dx = mid.x - start.mid.x;
  const dy = mid.y - start.mid.y;
  const ratio = b && start.dist > 0 ? Math.hypot(b.x - a.x, b.y - a.y) / start.dist : 1;
  if (ctx.moveLayer) {
    const perUnit = ctx.scale * start.view.zoom * ctx.originalWidth;
    const { min, max } = PARAMS.scale;
    const layer: Layer = {
      ...start.layer,
      x: start.layer.x + dx / perUnit,
      y: start.layer.y + dy / perUnit,
      scale: clamp(start.layer.scale * ratio, min, max),
      rotationDeg: b
        ? clamp(
            start.layer.rotationDeg +
              ((Math.atan2(b.y - a.y, b.x - a.x) - start.angle) * 180) / Math.PI,
            PARAMS.rotation.min,
            PARAMS.rotation.max,
          )
        : start.layer.rotationDeg,
    };
    return { type: "layer", layer } as const;
  }
  const zoom = clamp(start.view.zoom * ratio, ZOOM.min, ZOOM.max);
  const f = zoom / start.view.zoom;
  const mx = start.mid.x - ctx.center.x;
  const my = start.mid.y - ctx.center.y;
  const view: View = {
    zoom,
    x: mx - (mx - start.view.x) * f + dx,
    y: my - (my - start.view.y) * f + dy,
  };
  return { type: "view", view } as const;
}

export function gestures(
  state: GestureState,
  event: GestureEvent,
  ctx: GestureContext,
): { state: GestureState; outputs: GestureOutput[] } {
  switch (event.type) {
    case "down": {
      if (state.pointers.size >= 2) return { state, outputs: [] };
      const pointers = new Map(state.pointers).set(event.id, { x: event.x, y: event.y });
      const first = pointers.size === 1;
      const press: Press | null = first
        ? { id: event.id, x: event.x, y: event.y, downAt: event.t, held: false }
        : null;
      return {
        state: { pointers, start: begin(pointers, ctx), press },
        outputs: first ? [] : endPress(state.press),
      };
    }
    case "tick": {
      const press = state.press;
      if (!press || press.held || event.t - press.downAt < HOLD_MS) return { state, outputs: [] };
      return {
        state: { ...state, press: { ...press, held: true } },
        outputs: [{ type: "hold", active: true }],
      };
    }
    case "move": {
      if (!state.pointers.has(event.id) || !state.start) return { state, outputs: [] };
      const press = state.press;
      if (press && Math.hypot(event.x - press.x, event.y - press.y) < JITTER_PX) {
        return { state, outputs: [] };
      }
      const pointers = new Map(state.pointers).set(event.id, { x: event.x, y: event.y });
      return {
        state: { ...state, pointers, press: null },
        outputs: [...endPress(press), moved(state.start, pointers, ctx)],
      };
    }
    case "up":
    case "cancel": {
      if (!state.pointers.has(event.id)) return { state, outputs: [] };
      const pointers = new Map(state.pointers);
      pointers.delete(event.id);
      const press = state.press?.id === event.id ? state.press : null;
      const outputs: GestureOutput[] = endPress(press);
      if (press && !press.held && event.type === "up") outputs.push({ type: "tap" });
      return {
        state: { pointers, start: begin(pointers, ctx), press: press ? null : state.press },
        outputs,
      };
    }
    case "blur":
      return { state: idleGesture(), outputs: endPress(state.press) };
  }
}
