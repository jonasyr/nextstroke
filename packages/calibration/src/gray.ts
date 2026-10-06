/** A single-channel image, 0 (black) to 255 (white), row by row. */
export interface GrayImage {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export const at = (img: GrayImage, x: number, y: number) => img.data[y * img.width + x] ?? 255;

/** The q-quantile (0–1) of the values in a rectangle. */
export function quantile(
  img: GrayImage,
  r: { x: number; y: number; width: number; height: number },
  q: number,
): number {
  const values: number[] = [];
  for (let y = r.y; y < r.y + r.height; y++) {
    for (let x = r.x; x < r.x + r.width; x++) values.push(at(img, x, y));
  }
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.floor(q * values.length))] ?? 255;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}
