import { initialState } from "@nextstroke/compare";
import { describe, expect, it } from "vitest";
import { drawComparison, renderToBlob, toGray, toRgba } from "./render.ts";

function recorder() {
  const calls: string[] = [];
  const ctx = new Proxy(
    { globalAlpha: 1, fillStyle: "" },
    {
      get(target, prop) {
        if (prop in target) return target[prop as keyof typeof target];
        return (...args: unknown[]) => {
          calls.push(
            `${String(prop)}(${args.map((a) => (typeof a === "number" ? +a.toFixed(3) : typeof a === "object" ? "img" : a)).join(",")})`,
          );
          if (prop === "getImageData") return { data: new Uint8ClampedArray(4 * 4 * 3).fill(255) };
          return undefined;
        };
      },
      set(target, prop, value) {
        calls.push(`${String(prop)}=${value}`);
        (target as Record<string, unknown>)[prop as string] = value;
        return true;
      },
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, calls };
}

const original = { width: 1000, height: 500 } as ImageBitmap;
const reference = { width: 2000, height: 1000 } as ImageBitmap;

describe("drawComparison (legacy C1, C3, C4)", () => {
  it("draws the original, then the reference at the effective opacity", () => {
    const { ctx, calls } = recorder();
    drawComparison(ctx, {
      original,
      reference,
      state: initialState(),
      viewport: { width: 400, height: 200 },
      dpr: 2,
    });
    expect(calls[0]).toBe("setTransform(2,0,0,2,0,0)");
    expect(calls).toContain("clearRect(0,0,400,200)");
    const draws = calls.filter((c) => c.startsWith("drawImage"));
    expect(draws).toHaveLength(2);
    expect(calls).toContain("globalAlpha=0.65");
  });

  it("hides the reference while the original is revealed", () => {
    const { ctx, calls } = recorder();
    const state = { ...initialState(), holdReveal: true };
    drawComparison(ctx, {
      original,
      reference,
      state,
      viewport: { width: 400, height: 200 },
      dpr: 1,
    });
    expect(calls.filter((c) => c.startsWith("drawImage"))).toHaveLength(1);
  });
});

describe("toGray (auto-align input)", () => {
  it("draws on white at the requested width and converts to luminance", () => {
    const { ctx, calls } = recorder();
    const gray = toGray(
      reference,
      4,
      3,
      () => ({ getContext: () => ctx }) as unknown as HTMLCanvasElement,
    );
    expect(gray.width).toBe(4);
    expect(gray.height).toBe(3);
    expect(gray.data[0]).toBeCloseTo(1);
    expect(calls).toContain("fillStyle=#fff");
  });

  it("fails clearly without a 2-D context", () => {
    expect(() =>
      toGray(reference, 4, 3, () => ({ getContext: () => null }) as unknown as HTMLCanvasElement),
    ).toThrow(/2d/);
  });
});

describe("renderToBlob (legacy D1: a null blob is an error)", () => {
  it("returns the encoded blob", async () => {
    const { ctx } = recorder();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
      toBlob: (done: (b: Blob | null) => void) => done(new Blob(["x"])),
    };
    const blob = await renderToBlob(
      { width: 10, height: 5 },
      "image/jpeg",
      () => {},
      () => canvas as unknown as HTMLCanvasElement,
    );
    expect(blob.size).toBe(1);
    expect(canvas.width).toBe(10);
  });

  it("throws when the browser cannot encode", async () => {
    const { ctx } = recorder();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ctx,
      toBlob: (done: (b: Blob | null) => void) => done(null),
    };
    await expect(
      renderToBlob(
        { width: 10, height: 5 },
        "image/png",
        () => {},
        () => canvas as unknown as HTMLCanvasElement,
      ),
    ).rejects.toThrow(/encode/);
    const noCtx = { ...canvas, getContext: () => null };
    await expect(
      renderToBlob(
        { width: 10, height: 5 },
        "image/png",
        () => {},
        () => noCtx as unknown as HTMLCanvasElement,
      ),
    ).rejects.toThrow(/2d/);
  });
});

describe("perspective drawing", () => {
  const corners = [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 0, y: 1 },
  ] as const;

  it("draws the warped reference instead of the affine layer and the corner handles", () => {
    const { ctx, calls } = recorder();
    const state = { ...initialState(), corners };
    const warped = { width: 1000, height: 500 } as ImageBitmap;
    drawComparison(ctx, {
      original,
      reference,
      state,
      viewport: { width: 400, height: 200 },
      dpr: 1,
      warped,
      handles: [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
      activeHandle: 1,
    });
    expect(calls).toContain("drawImage(img,-500,-250,1000,500)");
    expect(calls.filter((c) => c.startsWith("arc("))).toEqual([
      "arc(1,2,11,0,6.283)",
      "arc(3,4,14,0,6.283)",
    ]);
  });

  it("falls back to the affine layer until the warp is ready", () => {
    const { ctx, calls } = recorder();
    drawComparison(ctx, {
      original,
      reference,
      state: { ...initialState(), corners },
      viewport: { width: 400, height: 200 },
      dpr: 1,
    });
    expect(calls).toContain("drawImage(img,0,0)");
  });

  it("reads image pixels", () => {
    const { ctx } = recorder();
    const rgba = toRgba(
      { width: 4, height: 3 } as ImageBitmap,
      () => ({ getContext: () => ctx }) as unknown as HTMLCanvasElement,
    );
    expect(rgba.width).toBe(4);
    expect(rgba.data.length).toBe(48);
  });
});

describe("drawComparison split view", () => {
  it("clips the reference to the right of the divider and draws the divider", () => {
    const { ctx, calls } = recorder();
    drawComparison(ctx, {
      original,
      reference,
      state: { ...initialState(), split: 0.25 },
      viewport: { width: 400, height: 200 },
      dpr: 1,
    });
    // original-centred: x from 0.25·1000 − 500 = −250 rightwards
    expect(calls.some((c) => c.startsWith("rect(-250,"))).toBe(true);
    expect(calls).toContain("clip()");
    expect(calls).toContain("globalAlpha=1");
    expect(calls).toContain("moveTo(100,0)");
    expect(calls).toContain("lineTo(100,200)");
  });
});
