/**
 * Projective transform from four point pairs (Phase 2 Task 4: manual four-point alignment,
 * legacy defect D4). H is row-major [h0..h8] with h8 = 1.
 */
export interface Point {
  x: number;
  y: number;
}
export type Quad = readonly [Point, Point, Point, Point];
export type Homography = number[];

function solve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i] as number]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (
        Math.abs((m[r] as number[])[col] as number) >
        Math.abs((m[pivot] as number[])[col] as number)
      )
        pivot = r;
    }
    if (Math.abs((m[pivot] as number[])[col] as number) < 1e-12) return null;
    [m[col], m[pivot]] = [m[pivot] as number[], m[col] as number[]];
    const p = m[col] as number[];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const row = m[r] as number[];
      const f = (row[col] as number) / (p[col] as number);
      for (let c = col; c <= n; c++) row[c] = (row[c] as number) - f * (p[c] as number);
    }
  }
  return m.map((row, i) => (row[n] as number) / (row[i] as number));
}

/** True when the quad is convex with a consistent winding (no fold, no collinear corners). */
export function isConvex(q: Quad): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i] as Point;
    const b = q[(i + 1) % 4] as Point;
    const c = q[(i + 2) % 4] as Point;
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-9) return false;
    const s = Math.sign(cross);
    if (sign !== 0 && s !== sign) return false;
    sign = s;
  }
  return true;
}

/** H with H·src[i] ≈ dst[i]; null for degenerate or folded quads. */
export function homographyFromPoints(src: Quad, dst: Quad): Homography | null {
  if (!isConvex(src) || !isConvex(dst)) return null;
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i] as Point;
    const { x: u, y: v } = dst[i] as Point;
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(a, b);
  return h ? [...h, 1] : null;
}

export function applyHomography(h: Homography, p: Point): Point {
  const [a, b, c, d, e, f, g, i, j] = h as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const w = g * p.x + i * p.y + j;
  return { x: (a * p.x + b * p.y + c) / w, y: (d * p.x + e * p.y + f) / w };
}

export function invertHomography(h: Homography): Homography | null {
  const [a, b, c, d, e, f, g, i, j] = h as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const det = a * (e * j - f * i) - b * (d * j - f * g) + c * (d * i - e * g);
  if (Math.abs(det) < 1e-12) return null;
  const inv = [
    e * j - f * i,
    c * i - b * j,
    b * f - c * e,
    f * g - d * j,
    a * j - c * g,
    c * d - a * f,
    d * i - e * g,
    b * g - a * i,
    a * e - b * d,
  ].map((v) => v / det);
  const scale = inv[8] as number;
  return Math.abs(scale) > 1e-12 ? inv.map((v) => v / scale) : inv;
}
