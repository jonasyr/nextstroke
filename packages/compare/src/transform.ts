import type { Layer, View } from "./state.ts";

/** 2-D affine matrix in canvas order: x' = a·x + c·y + e, y' = b·x + d·y + f. */
export interface Matrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

interface Dimensions {
  width: number;
  height: number;
}

export const translate = (x: number, y: number): Matrix => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });
export const scale = (s: number): Matrix => ({ a: s, b: 0, c: 0, d: s, e: 0, f: 0 });
export function rotate(deg: number): Matrix {
  const r = (deg * Math.PI) / 180;
  return { a: Math.cos(r), b: Math.sin(r), c: -Math.sin(r), d: Math.cos(r), e: 0, f: 0 };
}

/** `m` after `n`, like calling ctx.transform(m) and then ctx.transform(n). */
export function multiply(m: Matrix, n: Matrix): Matrix {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

export function apply(m: Matrix, p: { x: number; y: number }) {
  return { x: m.a * p.x + m.c * p.y + m.e, y: m.b * p.x + m.d * p.y + m.f };
}

export function fitScale(viewport: Dimensions, original: Dimensions): number {
  return Math.min(viewport.width / original.width, viewport.height / original.height);
}

/** Original-centred coordinates to viewport CSS pixels. */
export function viewMatrix(view: View, fit: number, viewport: Dimensions): Matrix {
  return multiply(
    translate(viewport.width / 2 + view.x, viewport.height / 2 + view.y),
    scale(fit * view.zoom),
  );
}

/**
 * Reference pixels to original-centred coordinates: the reference is drawn at the original's
 * width (legacy behavior), then moved by a fraction of that width, rotated and scaled.
 */
export function layerMatrix(layer: Layer, original: Dimensions, reference: Dimensions): Matrix {
  const k = original.width / reference.width;
  const height = reference.height * k;
  return [
    translate(layer.x * original.width, layer.y * original.width),
    rotate(layer.rotationDeg),
    scale(layer.scale),
    translate(-original.width / 2, -height / 2),
    scale(k),
  ].reduce(multiply);
}
