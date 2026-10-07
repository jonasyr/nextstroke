import {
  type Idea,
  type LightSide,
  SHEET_MM,
  type SheetFormat,
  type StrokePlan,
} from "@nextstroke/contracts";
import { FALLBACKS, TEMPLATES, type Template } from "./templates.ts";

/**
 * The rule-based stroke plan (D-071): what an idea asks for, drawn as fills on the user's sheet.
 * No model: the area, the light and the coach's spacing decide every line. Only where the rules
 * know the geometry is there a plan; contours and forms the rules cannot see get a reason
 * instead (a legitimate outcome, AGENTS rule 10).
 */

type Point = [number, number];

/** A circle on the photo: x and r as shares of its width, y of its height. */
export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface PlanInput {
  template: Template;
  spacingMm: number;
  /** The tip in mm; null draws a common 0.3 mm line. */
  tipMm: number | null;
  sheet: SheetFormat;
  /** The photo's width over its height. */
  aspect: number;
  area: Circle | null;
  light: LightSide;
  protectedSpots: Circle[];
  /** A tapped form's tone areas (D-073), normalized; the plan follows them instead of the circle. */
  form?: FormTones | null;
}

/** Tone areas of a form: light, shadow (half and core) and core shadow, as polygons. */
export interface FormTones {
  lit: Point[][];
  shadow: Point[][];
  core: Point[][];
}

/** Why there is no preview: line work, edges or directions only the drawing shows, or no area. */
export type NoPlanReason = "lines" | "form" | "direction" | "protect" | "noArea" | "circle";

export type PlanResult =
  | {
      plan: StrokePlan;
      /** Polygons that stay as on the photo: protected details, with a halo where asked. */
      keepFree: Point[][];
      /** Whether the light's side changes the plan, so offering a choice makes sense. */
      usesLight: boolean;
    }
  | { reason: NoPlanReason };

const DARKNESS = 0.9;
const CIRCLE_POINTS = 48;
/** The free margin around a form for "Lichthof", in mm. */
const HALO_MM = 3;

/** Sutherland–Hodgman: the part of a polygon where `dot(p, normal) >= offset`. */
export function clipPolygon(polygon: Point[], normal: Point, offset: number): Point[] {
  const side = (p: Point) => p[0] * normal[0] + p[1] * normal[1] - offset;
  const out: Point[] = [];
  polygon.forEach((current, i) => {
    const previous = polygon[(i + polygon.length - 1) % polygon.length] as Point;
    const a = side(previous);
    const b = side(current);
    if (b >= 0) {
      if (a < 0) out.push(cross(previous, current, a, b));
      out.push(current);
    } else if (a >= 0) {
      out.push(cross(previous, current, a, b));
    }
  });
  return out;
}

function cross(p: Point, q: Point, a: number, b: number): Point {
  const t = a / (a - b);
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
}

/**
 * Geometry runs in width units (x, y / aspect), so circles stay round and directions true;
 * results return to the photo's normalized coordinates, clipped to the photo.
 */
function geometry(aspect: number) {
  const height = 1 / aspect;
  const circle = (c: Circle, grow = 0): Point[] =>
    Array.from({ length: CIRCLE_POINTS }, (_, i) => {
      const a = (i / CIRCLE_POINTS) * Math.PI * 2;
      return [c.x + (c.r + grow) * Math.cos(a), c.y * height + (c.r + grow) * Math.sin(a)];
    });
  const onPhoto = (polygon: Point[]): Point[] | null => {
    let p = clipPolygon(polygon, [1, 0], 0);
    p = clipPolygon(p, [-1, 0], -1);
    p = clipPolygon(p, [0, 1], 0);
    p = clipPolygon(p, [0, -1], -height);
    if (p.length < 3) return null;
    const unit = (v: number) => Math.min(1, Math.max(0, v));
    return p.map(([x, y]) => [unit(x), unit(y * aspect)]);
  };
  return { height, circle, onPhoto };
}

/** Shadow direction (away from the light) and the hatching angle that runs with the form. */
const LIGHT: Record<LightSide, { shadow: Point; angle: number }> = {
  left: { shadow: [1, 0], angle: 45 },
  right: { shadow: [-1, 0], angle: 135 },
  top: { shadow: [0, 1], angle: 45 },
};

interface Layer {
  /** Share of the radius from the centre towards the shadow where the layer starts; null: all. */
  from: number | null;
  /** Up to where (towards the light); used to split light and shadow halves. */
  until?: number;
  turn: number;
  cross?: boolean;
  dots?: boolean;
  /** Spacing as a multiple of the coach's spacing. */
  space?: number;
}

/** Layers per template; a reason where the rules cannot know where the strokes go. */
const LAYERS: Record<string, Layer[] | NoPlanReason> = {
  "depth-careful": [{ from: 1 / 3, turn: 0 }],
  "depth-balanced": [
    { from: 0, turn: 0 },
    { from: 1 / 3, turn: 45 },
  ],
  "depth-bold": [
    { from: 0, turn: 0, cross: true },
    { from: 1 / 3, turn: 45, cross: true },
  ],
  "contrast-balanced": "form",
  "contrast-bold": [{ from: null, turn: 0, cross: true }],
  "texture-careful": [
    { from: null, until: 0, turn: 0, dots: true, space: 2 },
    { from: 0, turn: 0, dots: true },
  ],
  "texture-balanced": "direction",
  "texture-bold": "direction",
  "background-balanced": [{ from: null, turn: 0 }],
  "background-bold": [
    { from: null, turn: 0, cross: true },
    { from: 1 / 3, turn: 45 },
  ],
  "detail-balanced": [
    { from: null, until: 0, turn: 0, dots: true, space: 2 },
    { from: 0, turn: 0, dots: true },
  ],
  "detail-bold": "form",
};

/** Templates that darken around a form: the form must be marked as protected. */
const AROUND_FORM = new Set(["contrast-bold", "background-balanced", "background-bold"]);

/** The plan for one idea; never throws, returns a reason when there is none. */
export function planFor(input: PlanInput): PlanResult {
  const { template } = input;
  if (template.technique === "contour" || template.technique === "lineWeight") {
    return { reason: "lines" };
  }
  const layers = LAYERS[template.id];
  if (layers === undefined) return { reason: "lines" };
  if (typeof layers === "string") return { reason: layers };
  if (input.form) return formPlan(input, layers);
  if (!input.area) return { reason: "noArea" };
  if (AROUND_FORM.has(template.id) && input.protectedSpots.length === 0) {
    return { reason: "protect" };
  }

  const g = geometry(input.aspect);
  const { sheetWidth, fill } = strokes(input);
  const { shadow } = LIGHT[input.light];
  const area = input.area;
  const centre = area.x * shadow[0] + area.y * g.height * shadow[1];
  const disc = g.circle(area);

  const fills: StrokePlan["fills"] = [];
  for (const layer of layers) {
    let polygon = disc;
    if (layer.from !== null) polygon = clipPolygon(polygon, shadow, centre + layer.from * area.r);
    if (layer.until !== undefined) {
      polygon = clipPolygon(polygon, [-shadow[0], -shadow[1]], -(centre + layer.until * area.r));
    }
    const onPhoto = g.onPhoto(polygon);
    if (!onPhoto) continue;
    fills.push(fill(fills.length + 1, onPhoto, layer));
  }
  if (fills.length === 0) return { reason: "noArea" };

  const halo = template.id === "background-balanced" ? HALO_MM / sheetWidth : 0;
  return {
    plan: { schemaVersion: "2", strokes: [], fills },
    keepFree: keepFree(input, halo),
    usesLight: layers.some(usesLightLayer),
  };
}

const usesLightLayer = (l: Layer) => l.from !== null || l.until !== undefined;

function keepFree(input: PlanInput, halo: number): Point[][] {
  const g = geometry(input.aspect);
  return input.protectedSpots.flatMap((spot) => {
    const polygon = g.onPhoto(g.circle(spot, halo));
    return polygon ? [polygon] : [];
  });
}

/** Line width and the fill for a layer, from the tip and the coach's spacing on the sheet. */
function strokes(input: PlanInput) {
  const [short, long] = SHEET_MM[input.sheet];
  const sheetWidth = input.aspect >= 1 ? long : short;
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const width = clamp((input.tipMm ?? 0.3) / sheetWidth, 0.0001, 0.01);
  const { angle } = LIGHT[input.light];
  const fill = (order: number, polygon: Point[], layer: Layer): StrokePlan["fills"][number] => ({
    order,
    polygon,
    angleDeg: (angle + layer.turn) % 180,
    spacing: clamp((input.spacingMm * (layer.space ?? 1)) / sheetWidth, 0.0005, 0.05),
    width,
    darkness: DARKNESS,
    cross: layer.cross ?? false,
    ...(layer.dots ? { pattern: "dots" as const } : {}),
  });
  return { sheetWidth, width, fill };
}

/**
 * A plan on a tapped form (D-073): each layer takes the tone area it stands for. Ideas that
 * darken a whole area around a form need the circle. A flat form has no core shadow, so a
 * layer meant for the darkest part uses its shadow side.
 */
function formPlan(input: PlanInput, layers: Layer[]): PlanResult {
  const form = input.form as FormTones;
  if (layers.some((l) => !usesLightLayer(l))) return { reason: "circle" };
  const usesShadow = layers.some((l) => l.from === 0);
  const tones = (layer: Layer) => {
    if (layer.until !== undefined) return form.lit;
    if (layer.from === 0) return form.shadow;
    return form.core.length || usesShadow ? form.core : form.shadow;
  };
  const { fill } = strokes(input);
  const fills: StrokePlan["fills"] = [];
  for (const layer of layers) {
    for (const polygon of tones(layer)) {
      if (polygon.length >= 3) fills.push(fill(fills.length + 1, polygon, layer));
    }
  }
  if (fills.length === 0) return { reason: "noArea" };
  return {
    plan: { schemaVersion: "2", strokes: [], fills },
    keepFree: keepFree(input, 0),
    usesLight: true,
  };
}

/** The template behind a saved idea, by its title and level; null for one no longer known. */
export function templateOf(idea: Pick<Idea, "title" | "risk">): Template | null {
  return (
    [...TEMPLATES, ...Object.values(FALLBACKS)].find(
      (t) => t.title === idea.title && t.level === idea.risk,
    ) ?? null
  );
}
