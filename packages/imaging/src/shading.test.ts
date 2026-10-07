import { describe, expect, it } from "vitest";
import {
  distanceInside,
  formTones,
  type Gray,
  grayFrom,
  inkMask,
  paint,
  regionFrom,
  shadeBands,
  shadeObject,
  traceMask,
} from "./shading.ts";

const W = 200;
const H = 200;

/** White paper with dark lines where `ink(x, y)` holds. */
function paper(ink: (x: number, y: number) => boolean, width = W, height = H): Gray {
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data[y * width + x] = ink(x, y) ? 30 : 235;
  }
  return { width, height, data };
}

const ring =
  (cx: number, cy: number, r: number, gapFrom = 0, gapTo = 0) =>
  (x: number, y: number) => {
    const d = Math.hypot(x - cx, y - cy);
    const a = (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
    return Math.abs(d - r) <= 1.5 && !(a >= gapFrom && a < gapTo);
  };

const count = (mask: Uint8Array) => mask.reduce((n, v) => n + (v ? 1 : 0), 0);

function centroid(values: Uint8Array, width: number, band: number) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  values.forEach((v, i) => {
    if (v !== band) return;
    sx += i % width;
    sy += Math.floor(i / width);
    n++;
  });
  return { x: sx / n, y: sy / n, n };
}

describe("ink on paper", () => {
  it("finds lines against the local paper, not large dark areas", () => {
    const shaded = (x: number, y: number) => x > 120 || ring(60, 60, 30)(x, y);
    const gray = paper(shaded);
    const ink = inkMask(gray);
    expect(ink[60 * W + 90]).toBe(1);
    expect(ink[60 * W + 60]).toBe(0);
    // Deep inside a large dark area there is no line to find.
    expect(ink[100 * W + 170]).toBe(0);
  });
});

describe("the tapped area", () => {
  const circle = paper(ring(100, 100, 60));

  it("fills the inside of a closed outline", () => {
    const result = regionFrom(inkMask(circle), W, H, [[100, 100]]);
    if (!("mask" in result)) throw new Error(result.refused);
    const area = count(result.mask);
    expect(area).toBeGreaterThan(Math.PI * 57 ** 2 * 0.95);
    expect(area).toBeLessThan(Math.PI * 61 ** 2);
    expect(result.mask[100 * W + 5]).toBe(0);
  });

  it("refuses an open outline and the background instead of leaking", () => {
    const open = paper(ring(100, 100, 60, -20, 20));
    expect(regionFrom(inkMask(open), W, H, [[100, 100]])).toEqual({ refused: "leak" });
    expect(regionFrom(inkMask(circle), W, H, [[5, 5]])).toEqual({ refused: "leak" });
  });

  it("closes a small gap in a hand-drawn line", () => {
    const gappy = paper(ring(100, 100, 60, 0, 3));
    expect("mask" in regionFrom(inkMask(gappy), W, H, [[100, 100]])).toBe(true);
  });

  it("joins parts split by inner lines and fills small holes", () => {
    const split = paper(
      (x, y) =>
        ring(100, 100, 60)(x, y) ||
        (Math.abs(x - 100) <= 1 && Math.abs(y - 100) < 60) ||
        ring(70, 100, 6)(x, y),
    );
    const one = regionFrom(inkMask(split), W, H, [[70, 70]]);
    const both = regionFrom(inkMask(split), W, H, [
      [70, 70],
      [130, 100],
    ]);
    if (!("mask" in one) || !("mask" in both)) throw new Error("refused");
    expect(count(both.mask)).toBeGreaterThan(count(one.mask) * 1.9);
    // The inner line and the small window belong to the form.
    expect(both.mask[100 * W + 100]).toBe(1);
    expect(both.mask[100 * W + 70]).toBe(1);
  });

  it("moves a tap that lands on a line into the nearest area, and refuses tiny areas", () => {
    const ink = inkMask(circle);
    expect("mask" in regionFrom(ink, W, H, [[100, 41]])).toBe(true);
    const dot = paper(ring(100, 100, 3));
    // Too small to hold a tap: the nearest free paper is outside, so it is refused, never filled.
    expect("refused" in regionFrom(inkMask(dot), W, H, [[100, 100]])).toBe(true);
  });

  it("refuses an area that is most of the image", () => {
    const frame = paper(
      (x, y) => x < 3 || y < 3 || x > W - 4 || y > H - 4 || ring(100, 100, 20)(x, y),
    );
    expect(regionFrom(inkMask(frame), W, H, [[30, 30]])).toEqual({ refused: "tooBig" });
  });
});

describe("shadow from the form", () => {
  const disc = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) disc[y * W + x] = Math.hypot(x - 100, y - 100) < 60 ? 1 : 0;
  }

  it("measures the distance to the outline inside the area only", () => {
    const d = distanceInside(disc, W, H);
    expect(d[100 * W + 100]).toBeCloseTo(60, 0);
    expect(d[100 * W + 159]).toBeLessThanOrEqual(1.5);
    expect(d[5 * W + 5]).toBe(0);
  });

  it("puts the core shadow away from the light, light near it, and nothing outside", () => {
    const left = shadeBands(disc, W, H, "left");
    const core = centroid(left, W, 3);
    const light = centroid(left, W, 1);
    expect(core.x).toBeGreaterThan(125);
    expect(light.x).toBeLessThan(100);
    expect(Math.abs(core.y - 100)).toBeLessThan(3);
    // About a third of the disc is core shadow.
    expect(core.n / count(disc)).toBeGreaterThan(0.2);
    expect(core.n / count(disc)).toBeLessThan(0.45);
    left.forEach((band, i) => {
      if (!disc[i]) expect(band).toBe(0);
    });
    expect(centroid(shadeBands(disc, W, H, "right"), W, 3).x).toBeLessThan(75);
    expect(centroid(shadeBands(disc, W, H, "top"), W, 3).y).toBeGreaterThan(125);
  });

  it("shades a long form along its length", () => {
    const bar = new Uint8Array(W * H);
    for (let y = 20; y < 180; y++) for (let x = 80; x < 120; x++) bar[y * W + x] = 1;
    const bands = shadeBands(bar, W, H, "left");
    // Each row of the bar has the same split, so the core shadow runs down its right side.
    const row = (y: number) => Array.from(bands.slice(y * W + 80, y * W + 120));
    expect(row(60)).toEqual(row(140));
    expect(row(100).at(-1)).toBe(3);
    expect(row(100)[0]).toBe(1);
  });

  it("runs the whole way from a photo and taps", () => {
    const result = shadeObject(paper(ring(100, 100, 60)), [[0.5, 0.5]], "left");
    if (!("bands" in result)) throw new Error(result.refused);
    expect(centroid(result.bands, W, 3).x).toBeGreaterThan(125);
    expect(shadeObject(paper(ring(100, 100, 60)), [[0.02, 0.02]], "left")).toEqual({
      refused: "leak",
    });
  });
});

describe("form mode helpers (D-073)", () => {
  const disc = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) disc[y * W + x] = Math.hypot(x - 100, y - 100) < 60 ? 1 : 0;
  }

  it("turns RGBA into gray at a bounded size", () => {
    const data = new Uint8ClampedArray([
      255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255, 255,
      255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    ]);
    const gray = grayFrom({ width: 4, height: 2, data }, 2);
    expect([gray.width, gray.height]).toEqual([2, 1]);
    expect(Array.from(gray.data)).toEqual([255, 0]);
    expect(grayFrom({ width: 4, height: 2, data }, 10).width).toBe(4);
  });

  it("shades a flat form as one even layer on the far half, without pillow edges", () => {
    const bands = shadeBands(disc, W, H, "left", "flat");
    expect(bands.includes(3)).toBe(false);
    expect(bands[100 * W + 60]).toBe(1);
    expect(bands[100 * W + 140]).toBe(2);
    // The top edge on the light side stays light: no shading along every edge.
    expect(bands[45 * W + 90]).toBe(1);
    expect(shadeBands(disc, W, H, "top", "flat")[140 * W + 100]).toBe(2);
  });

  it("paints and erases with a round brush, along a stroke", () => {
    const empty = new Uint8Array(W * H);
    const painted = paint(empty, W, H, [20, 20], [80, 20], 5, 1);
    expect(painted[20 * W + 50]).toBe(1);
    expect(painted[24 * W + 50]).toBe(1);
    expect(painted[27 * W + 50]).toBe(0);
    expect(empty[20 * W + 50]).toBe(0);
    const erased = paint(disc, W, H, [100, 100], [100, 100], 10, 0);
    expect(erased[100 * W + 100]).toBe(0);
    expect(erased[100 * W + 115]).toBe(1);
  });

  it("traces outlines as simple polygons, largest first, small specks left out", () => {
    const mask = new Uint8Array(W * H);
    for (let y = 20; y < 60; y++) for (let x = 20; x < 80; x++) mask[y * W + x] = 1;
    for (let y = 100; y < 110; y++) for (let x = 100; x < 110; x++) mask[y * W + x] = 1;
    mask[180 * W + 180] = 1;
    const polygons = traceMask(mask, W, H, 64);
    expect(polygons).toHaveLength(2);
    expect(polygons[0]?.length).toBeLessThanOrEqual(8);
    const xs = polygons[0]?.map((p) => p[0]) ?? [];
    expect(Math.min(...xs)).toBeCloseTo(20, 0);
    expect(Math.max(...xs)).toBe(79);
    const round = traceMask(disc, W, H, 24);
    expect(round).toHaveLength(1);
    expect(round[0]?.length).toBeLessThanOrEqual(24);
    expect(round[0]?.length).toBeGreaterThan(8);
  });

  it("gives tone areas as normalized polygons inside the form", () => {
    const tones = formTones(shadeBands(disc, W, H, "left"), W, H);
    const all = [...tones.lit, ...tones.shadow, ...tones.core].flat();
    expect(all.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1)).toBe(true);
    const meanX = (polygons: [number, number][][]) => {
      const points = polygons.flat();
      return points.reduce((s, p) => s + p[0], 0) / points.length;
    };
    expect(meanX(tones.shadow)).toBeGreaterThan(0.5);
    expect(meanX(tones.core)).toBeGreaterThan(meanX(tones.shadow));
    expect(meanX(tones.lit)).toBeLessThan(0.5);
    // Every point lies inside the disc (radius 0.3 of the width), with a little room for the outline.
    expect(all.every(([x, y]) => Math.hypot(x - 0.5, y - 0.5) <= 0.305)).toBe(true);
  });
});
