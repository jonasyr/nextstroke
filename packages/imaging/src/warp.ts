/**
 * Perspective warp by inverse mapping with bilinear sampling. `toSource` maps destination
 * pixel coordinates to source pixel coordinates; pixels outside the source stay transparent.
 */
export interface Rgba {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function warpPerspective(
  src: Rgba,
  toSource: readonly number[],
  width: number,
  height: number,
): Rgba {
  const [a, b, c, d, e, f, g, h, i] = toSource as [
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
  const out = new Uint8ClampedArray(width * height * 4);
  const { data, width: sw, height: sh } = src;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const w = g * x + h * y + i;
      const sx = (a * x + b * y + c) / w;
      const sy = (d * x + e * y + f) / w;
      if (!(sx >= 0 && sy >= 0 && sx <= sw - 1 && sy <= sh - 1)) continue;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, sw - 1);
      const y1 = Math.min(y0 + 1, sh - 1);
      const fx = sx - x0;
      const fy = sy - y0;
      const o = (y * width + x) * 4;
      for (let ch = 0; ch < 4; ch++) {
        const p00 = data[(y0 * sw + x0) * 4 + ch] as number;
        const p10 = data[(y0 * sw + x1) * 4 + ch] as number;
        const p01 = data[(y1 * sw + x0) * 4 + ch] as number;
        const p11 = data[(y1 * sw + x1) * 4 + ch] as number;
        out[o + ch] =
          p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy;
      }
    }
  }
  return { data: out, width, height };
}
