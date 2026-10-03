/**
 * Cheap automatic alignment (legacy V6): grayscale correlation over translation, scale
 * 0.65–1.4 and rotation ±15°, coarse to fine from two starts. A cost above the threshold is
 * reported as not accepted, so the caller keeps the user's layer. Perspective needs manual
 * four-point alignment or the later opencv.js homography (Phase 2 Task 4).
 */
export interface Gray {
  data: Float32Array;
  width: number;
  height: number;
}

/** Transform in gray-grid pixels relative to the image centre. */
export interface AlignTransform {
  x: number;
  y: number;
  scale: number;
  rotationDeg: number;
}

export const ACCEPT_COST = 0.3;
const UNUSABLE = 10;
const LEVELS: readonly [number, number, number][] = [
  [10, 0.04, 2],
  [5, 0.02, 1],
  [2, 0.01, 0.4],
  [1, 0.004, 0.15],
  [0.4, 0.001, 0.05],
];

function sample(g: Gray, x: number, y: number): number | null {
  if (x < 0 || y < 0 || x >= g.width - 1 || y >= g.height - 1) return null;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const i = iy * g.width + ix;
  const d = g.data;
  return (
    (d[i] as number) * (1 - fx) * (1 - fy) +
    (d[i + 1] as number) * fx * (1 - fy) +
    (d[i + g.width] as number) * (1 - fx) * fy +
    (d[i + g.width + 1] as number) * fx * fy
  );
}

/** 1 − Pearson correlation plus a penalty for missing overlap; 10 when unusable. */
export function correlationCost(a: Gray, b: Gray, t: AlignTransform): number {
  const { width: w, height: h } = a;
  const cos = Math.cos((t.rotationDeg * Math.PI) / 180);
  const sin = Math.sin((t.rotationDeg * Math.PI) / 180);
  let sa = 0;
  let sb = 0;
  let saa = 0;
  let sbb = 0;
  let sab = 0;
  let n = 0;
  let total = 0;
  for (let y = 8; y < h - 8; y += 2) {
    for (let x = 8; x < w - 8; x += 2) {
      total++;
      const dx = x - w / 2 - t.x;
      const dy = y - h / 2 - t.y;
      const bv = sample(
        b,
        (cos * dx + sin * dy) / t.scale + w / 2,
        (-sin * dx + cos * dy) / t.scale + h / 2,
      );
      if (bv === null) continue;
      const av = a.data[y * w + x] as number;
      sa += av;
      sb += bv;
      saa += av * av;
      sbb += bv * bv;
      sab += av * bv;
      n++;
    }
  }
  if (n < total * 0.8) return UNUSABLE;
  const den = Math.sqrt(Math.max(0, (saa - (sa * sa) / n) * (sbb - (sb * sb) / n)));
  if (den <= 1e-10) return UNUSABLE;
  return 1 - (sab - (sa * sb) / n) / den + ((total - n) / total) * 0.25;
}

function inBounds(t: AlignTransform): boolean {
  return t.scale >= 0.65 && t.scale <= 1.4 && Math.abs(t.rotationDeg) <= 15;
}

const pause = () => new Promise((resolve) => setTimeout(resolve, 0));

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("auto-align aborted", "AbortError");
}

async function optimize(
  cost: (t: AlignTransform) => number,
  start: AlignTransform,
  options: AlignOptions,
): Promise<{ t: AlignTransform; cost: number }> {
  let t = start;
  let best = cost(t);
  for (const [level, [d, s, r]] of LEVELS.entries()) {
    checkAbort(options.signal);
    for (let repeat = 0; repeat < 8; repeat++) {
      let changed = false;
      for (const [key, step] of [
        ["x", d],
        ["y", d],
        ["scale", s],
        ["rotationDeg", r],
      ] as const) {
        let selected = t;
        for (const sign of [-1, 1]) {
          const candidate = { ...t, [key]: t[key] + step * sign };
          if (!inBounds(candidate)) continue;
          const c = cost(candidate);
          if (c < best - 1e-8) {
            best = c;
            selected = candidate;
            changed = true;
          }
        }
        t = selected;
      }
      if (!changed) break;
    }
    options.onLevel?.(level);
    await pause();
  }
  return { t, cost: best };
}

export interface AlignOptions {
  signal?: AbortSignal;
  onLevel?: (level: number) => void;
}

export async function autoAlign(
  a: Gray,
  b: Gray,
  start: AlignTransform,
  options: AlignOptions = {},
): Promise<{ transform: AlignTransform; cost: number; accepted: boolean }> {
  const cost = (t: AlignTransform) => correlationCost(a, b, t);
  const first = await optimize(cost, start, options);
  const second = await optimize(
    cost,
    { x: 0, y: 0, scale: 1, rotationDeg: 0 },
    {
      ...(options.signal ? { signal: options.signal } : {}),
    },
  );
  const best = first.cost <= second.cost ? first : second;
  return { transform: best.t, cost: best.cost, accepted: best.cost <= ACCEPT_COST };
}
