/**
 * The bundled demo pair ("Beispiel ansehen", D-056): a fineliner lighthouse drawn by code, so
 * no artwork is shipped (AGENTS rule 9). The Vorlage is the clean drawing; the "hand" version
 * has wobbly strokes, a slightly slimmer tower, a missing hatch band and an extra bird, so the
 * comparison has something to show. Pure geometry here; browser.ts paints and photographs it.
 */

export interface Stroke {
  /** Points in the unit square (x right, y down). */
  points: { x: number; y: number }[];
  /** Line width as a fraction of the drawing's width. */
  width: number;
}

/** Deterministic pseudo-random numbers in [-1, 1) (a linear congruential generator). */
function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 2 ** 32) * 2 - 1;
  };
}

const LINE = 0.004;
const HATCH = 0.0022;

function line(points: [number, number][], width = LINE): Stroke {
  return { points: points.map(([x, y]) => ({ x, y })), width };
}

/** Points along a straight segment, so hand jitter can bend it. */
function segment(a: [number, number], b: [number, number], steps = 8): [number, number][] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  });
}

export function demoDrawing(hand: boolean): Stroke[] {
  const strokes: Stroke[] = [];
  const slim = hand ? 0.96 : 1;
  const cx = 0.5;
  // The tower: a trapezoid from y 0.3 to 0.78.
  const top = 0.3;
  const base = 0.78;
  const halfTop = 0.07 * slim;
  const halfBase = 0.12 * slim;
  const xAt = (y: number, side: -1 | 1) =>
    cx + side * (halfTop + ((halfBase - halfTop) * (y - top)) / (base - top));
  strokes.push(line(segment([xAt(top, -1), top], [xAt(base, -1), base], 16)));
  strokes.push(line(segment([xAt(top, 1), top], [xAt(base, 1), base], 16)));
  // Four bands, every other one hatched; the hand version forgets the lowest hatching.
  const bands = [0.3, 0.42, 0.54, 0.66, 0.78];
  for (let i = 1; i < bands.length - 1; i++) {
    const y = bands[i] as number;
    strokes.push(line(segment([xAt(y, -1), y], [xAt(y, 1), y])));
  }
  for (let i = 0; i < bands.length - 1; i += 2) {
    if (hand && i === 2) continue;
    const y0 = bands[i] as number;
    const y1 = bands[i + 1] as number;
    for (let y = y0 + 0.012; y < y1; y += 0.012) {
      strokes.push(
        line(segment([xAt(y, -1) + 0.004, y], [xAt(y, 1) - 0.004, y + 0.006], 4), HATCH),
      );
    }
  }
  // Windows.
  for (const y of [0.47, 0.6]) {
    strokes.push(
      line([
        [cx - 0.015, y],
        [cx + 0.015, y],
        [cx + 0.015, y + 0.04],
        [cx - 0.015, y + 0.04],
        [cx - 0.015, y],
      ]),
    );
  }
  // Gallery, lantern and roof.
  strokes.push(line(segment([cx - 0.1, top], [cx + 0.1, top])));
  for (let x = -0.1; x <= 0.1001; x += 0.025)
    strokes.push(
      line([
        [cx + x, top],
        [cx + x, top - 0.025],
      ]),
    );
  strokes.push(line(segment([cx - 0.1, top - 0.025], [cx + 0.1, top - 0.025])));
  strokes.push(
    line([
      [cx - 0.05, top - 0.025],
      [cx - 0.05, top - 0.09],
      [cx + 0.05, top - 0.09],
      [cx + 0.05, top - 0.025],
    ]),
  );
  strokes.push(
    line([
      [cx - 0.065, top - 0.09],
      [cx, top - 0.15],
      [cx + 0.065, top - 0.09],
    ]),
  );
  // Rocks: closed bumpy outlines along the base.
  const rocks: [number, number, number][] = [
    [0.33, 0.8, 0.07],
    [0.45, 0.82, 0.08],
    [0.58, 0.81, 0.075],
    [0.69, 0.83, 0.06],
  ];
  for (const [x, y, r] of rocks) {
    const points: [number, number][] = [];
    for (let k = 0; k <= 16; k++) {
      const a = Math.PI + (Math.PI * k) / 16;
      const bump = 1 + 0.12 * Math.sin(k * 2.3);
      points.push([x + r * bump * Math.cos(a), y + 0.6 * r * bump * Math.sin(a)]);
    }
    points.push(points[0] as [number, number]);
    strokes.push(line(points));
  }
  strokes.push(line(segment([0.08, 0.84], [0.92, 0.84], 24)));
  // Waves and birds.
  for (const [x, y] of [
    [0.15, 0.9],
    [0.42, 0.93],
    [0.7, 0.9],
  ] as const) {
    strokes.push(
      line(
        segment([x, y], [x + 0.06, y - 0.012], 4).concat(
          segment([x + 0.06, y - 0.012], [x + 0.12, y], 4),
        ),
      ),
    );
  }
  const birds: [number, number][] = [
    [0.22, 0.18],
    [0.3, 0.13],
    [0.74, 0.2],
  ];
  if (hand) birds.push([0.8, 0.12]);
  for (const [x, y] of birds) {
    strokes.push(
      line(
        [
          [x - 0.025, y - 0.01],
          [x, y],
          [x + 0.025, y - 0.01],
        ],
        0.003,
      ),
    );
  }
  if (!hand) return strokes;
  // A hand never draws a perfect line: every point wobbles a little, the same way every time.
  const wobble = random(7);
  return strokes.map((s) => ({
    width: s.width,
    points: s.points.map((p) => ({ x: p.x + 0.002 * wobble(), y: p.y + 0.002 * wobble() })),
  }));
}
