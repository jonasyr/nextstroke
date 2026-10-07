/** Binary mask operations shared by form finding and shading; pure, row by row. */

/** Grows a mask by `r` pixels (square), separably. */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask.slice();
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let last = -Infinity;
    // Distance to the last set pixel on the left, then on the right.
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) last = x;
      if (x - last <= r) tmp[y * w + x] = 1;
    }
    last = Infinity;
    for (let x = w - 1; x >= 0; x--) {
      if (mask[y * w + x]) last = x;
      if (last - x <= r) tmp[y * w + x] = 1;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let last = -Infinity;
    for (let y = 0; y < h; y++) {
      if (tmp[y * w + x]) last = y;
      if (y - last <= r) out[y * w + x] = 1;
    }
    last = Infinity;
    for (let y = h - 1; y >= 0; y--) {
      if (tmp[y * w + x]) last = y;
      if (last - y <= r) out[y * w + x] = 1;
    }
  }
  return out;
}

export const invert = (mask: Uint8Array) => mask.map((v) => (v ? 0 : 1));
export const erode = (mask: Uint8Array, w: number, h: number, r: number) =>
  invert(dilate(invert(mask), w, h, r));

/** Pixels of `free` 4-connected to `start`; `touches` tells whether it reached the border. */
export function flood(free: Uint8Array, w: number, h: number, start: number) {
  const seen = new Uint8Array(w * h);
  const stack = [start];
  seen[start] = 1;
  let touches = false;
  let size = 0;
  while (stack.length) {
    const i = stack.pop() as number;
    size++;
    const x = i % w;
    const y = (i - x) / w;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
    const next = [
      x > 0 ? i - 1 : -1,
      x < w - 1 ? i + 1 : -1,
      y > 0 ? i - w : -1,
      y < h - 1 ? i + w : -1,
    ];
    for (const j of next) {
      if (j >= 0 && free[j] && !seen[j]) {
        seen[j] = 1;
        stack.push(j);
      }
    }
  }
  return { seen, touches, size };
}

/** The nearest pixel of `free` within `reach` of (x, y), or -1. */
export function nearestFree(
  free: Uint8Array,
  w: number,
  h: number,
  x: number,
  y: number,
  reach: number,
) {
  let best = -1;
  let bestD = Infinity;
  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const px = x + dx;
      const py = y + dy;
      const d = dx * dx + dy * dy;
      if (px < 0 || py < 0 || px >= w || py >= h || d > reach * reach || d >= bestD) continue;
      if (free[py * w + px]) {
        best = py * w + px;
        bestD = d;
      }
    }
  }
  return best;
}

/** A mask with its holes filled: whatever the outside cannot reach belongs to it. */
export function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const outside = invert(mask);
  const reach = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (i: number) => {
    if (outside[i] && !reach[i]) {
      reach[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x);
    seed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    seed(y * w);
    seed(y * w + w - 1);
  }
  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % w;
    for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
      if (j >= 0 && j < w * h && outside[j] && !reach[j]) {
        reach[j] = 1;
        stack.push(j);
      }
    }
  }
  return reach.map((v) => (v ? 0 : 1));
}
