import type { GrayImage } from "./gray.ts";
import { CARD_MM, COLUMNS, ROWS } from "./layout.ts";

/**
 * Synthetic test cards for the unit tests: known line width, spacings, blur and light, so the
 * measurement can be checked without committing photos (AGENTS rule 9).
 */
export interface CardSpec {
  pxPerMm?: number;
  lineWidthMm?: number;
  paper?: number;
  ink?: number;
  /** Ink transparency per pass: 1 is opaque; a second pass darkens a translucent ink. */
  opacity?: number;
  /** Box blur radius in pixels. */
  blur?: number;
  /** Light falling off from left to right: 0.3 leaves the right edge at 70 %. */
  lightFalloff?: number;
  spacingsMm?: [number, number, number];
  /** Leave these fields empty (indices into CELLS). */
  empty?: number[];
  /** Slope of the hatching lines, in mm per mm. */
  slope?: number;
  /** Paper grain: ± grey levels of deterministic noise. */
  grain?: number;
}

export function testCard(spec: CardSpec = {}): GrayImage {
  const s = {
    pxPerMm: 10,
    lineWidthMm: 0.35,
    paper: 235,
    ink: 25,
    opacity: 0.85,
    blur: 0,
    lightFalloff: 0,
    spacingsMm: [2, 1, 0.6] as [number, number, number],
    empty: [] as number[],
    slope: 0,
    grain: 0,
    ...spec,
  };
  const width = Math.round(CARD_MM.width * s.pxPerMm);
  const height = Math.round(CARD_MM.height * s.pxPerMm);
  // Ink transmission per pixel, multiplied per pass; 1 is clean paper.
  const t = new Float32Array(width * height).fill(1);
  const darkenBy = s.opacity * (1 - s.ink / s.paper);
  const half = (s.lineWidthMm * s.pxPerMm) / 2;
  const cw = width / COLUMNS;
  const ch = height / ROWS;

  /** A straight line through (x0, y0)–(x1, y1) in pixels, anti-aliased by distance. */
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const minX = Math.max(0, Math.floor(Math.min(x0, x1) - half - 1));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1) + half + 1));
    const minY = Math.max(0, Math.floor(Math.min(y0, y1) - half - 1));
    const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1) + half + 1));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const u = ((x + 0.5 - x0) * dx + (y + 0.5 - y0) * dy) / (len * len);
        if (u < 0 || u > 1) continue;
        const d = Math.abs((x + 0.5 - x0) * dy - (y + 0.5 - y0) * dx) / len;
        const cover = Math.min(1, Math.max(0, half + 0.5 - d));
        if (cover > 0) t[y * width + x] = (t[y * width + x] as number) * (1 - darkenBy * cover);
      }
    }
  };
  /** A round dot of the line's width. */
  const dot = (cx: number, cy: number) => {
    for (let y = Math.floor(cy - half - 1); y <= Math.ceil(cy + half + 1); y++) {
      for (let x = Math.floor(cx - half - 1); x <= Math.ceil(cx + half + 1); x++) {
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const cover = Math.min(1, Math.max(0, half + 0.5 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy)));
        if (cover > 0) t[y * width + x] = (t[y * width + x] as number) * (1 - darkenBy * cover);
      }
    }
  };
  const cell = (i: number) => ({ x: (i % COLUMNS) * cw, y: Math.floor(i / COLUMNS) * ch });
  const hatch = (i: number, spacingMm: number, from = 0, to = 1, vertical = false) => {
    if (s.empty.includes(i)) return;
    const c = cell(i);
    const step = spacingMm * s.pxPerMm;
    const x0 = c.x + cw * (0.08 + from * 0.84);
    const x1 = c.x + cw * (0.08 + to * 0.84);
    if (vertical) {
      for (let x = c.x + cw * 0.08; x < c.x + cw * 0.92; x += step) {
        line(x, c.y + ch * 0.08, x, c.y + ch * 0.92);
      }
      return;
    }
    for (let y = c.y + ch * 0.08; y < c.y + ch * 0.92; y += step) {
      line(x0, y, x1, y + (x1 - x0) * s.slope);
    }
  };

  // Frame and grid, as the user draws them.
  for (let col = 0; col <= COLUMNS; col++) line(col * cw, 0, col * cw, height);
  for (let row = 0; row <= ROWS; row++) line(0, row * ch, width, row * ch);
  if (!s.empty.includes(0)) {
    const c = cell(0);
    line(c.x + cw * 0.1, c.y + ch * 0.45, c.x + cw * 0.9, c.y + ch * 0.45);
    line(c.x + cw * 0.6, c.y + ch * 0.1, c.x + cw * 0.6, c.y + ch * 0.9);
  }
  hatch(1, s.spacingsMm[0]);
  hatch(2, s.spacingsMm[1]);
  hatch(3, s.spacingsMm[2]);
  hatch(4, 1);
  hatch(4, 1, 0, 1, true);
  if (!s.empty.includes(5)) {
    const c = cell(5);
    for (let k = 0; k < 1500; k++) {
      const x = c.x + cw * (0.1 + (0.8 * ((k * 37) % 1009)) / 1009);
      const y = c.y + ch * (0.1 + (0.8 * ((k * 61) % 1013)) / 1013);
      dot(x, y);
    }
  }
  hatch(6, 1);
  hatch(6, 1, 0.5, 1);

  const out = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const light = 1 - s.lightFalloff * (x / width);
      // Deterministic grain: a hash of the position, so tests repeat exactly.
      const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const grain = (h - Math.floor(h) - 0.5) * 2 * s.grain;
      out[y * width + x] = (s.paper + grain) * light * (t[y * width + x] as number);
    }
  }
  return s.blur ? boxBlur({ width, height, data: out }, s.blur) : { width, height, data: out };
}

function boxBlur(img: GrayImage, r: number): GrayImage {
  const { width, height } = img;
  const pass = (src: ArrayLike<number>, horizontal: boolean) => {
    const dst = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const xx = horizontal ? x + k : x;
          const yy = horizontal ? y : y + k;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          sum += src[yy * width + xx] as number;
          n++;
        }
        dst[y * width + x] = sum / n;
      }
    }
    return dst;
  };
  return { width, height, data: pass(pass(img.data, true), false) };
}
