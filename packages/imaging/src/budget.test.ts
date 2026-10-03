import { describe, expect, it } from "vitest";
import {
  CANVAS_MAX_EDGE,
  CANVAS_MAX_PIXELS,
  classifyFile,
  exportSize,
  MAX_FILE_BYTES,
  pdfRenderScale,
  workingSize,
} from "./budget.ts";

describe("working pixel budget (spec §12, legacy defect D1)", () => {
  it("keeps small images and scales large ones to the 2048 px working edge", () => {
    expect(workingSize(1200, 800)).toEqual({ width: 1200, height: 800, scale: 1 });
    expect(workingSize(8064, 6048)).toEqual({ width: 2048, height: 1536, scale: 2048 / 8064 });
    expect(workingSize(6048, 8064).height).toBe(2048);
  });

  it("caps exports below the canvas edge and the iOS canvas area", () => {
    const big = exportSize(8064, 6048);
    expect(Math.max(big.width, big.height)).toBeLessThanOrEqual(CANVAS_MAX_EDGE);
    expect(big.width * big.height).toBeLessThanOrEqual(CANVAS_MAX_PIXELS);
    const wide = exportSize(12000, 1000);
    expect(wide.width).toBe(CANVAS_MAX_EDGE);
    expect(exportSize(1000, 800)).toEqual({ width: 1000, height: 800, scale: 1 });
  });

  it("rejects degenerate sizes", () => {
    expect(() => workingSize(0, 10)).toThrow(/size/);
    expect(() => exportSize(10, Number.NaN)).toThrow(/size/);
  });

  it("renders PDF pages with the longest edge at most 2400 px and scale at most 3", () => {
    expect(pdfRenderScale(595, 842)).toBeCloseTo(2400 / 842);
    expect(pdfRenderScale(200, 300)).toBe(3);
  });
});

describe("file classification (legacy I1, I2)", () => {
  it("accepts JPEG, PNG, WebP, HEIC and PDF by type or extension", () => {
    expect(classifyFile({ type: "image/jpeg", name: "a.jpg", size: 10 })).toBe("image");
    expect(classifyFile({ type: "", name: "IMG_1.HEIC", size: 10 })).toBe("heic");
    expect(classifyFile({ type: "image/heif", name: "x", size: 10 })).toBe("heic");
    expect(classifyFile({ type: "application/pdf", name: "x", size: 10 })).toBe("pdf");
    expect(classifyFile({ type: "", name: "Scan.PDF", size: 10 })).toBe("pdf");
    expect(classifyFile({ type: "text/plain", name: "a.txt", size: 10 })).toBe("unsupported");
  });

  it("refuses files over 70 MB", () => {
    expect(classifyFile({ type: "image/png", name: "a.png", size: MAX_FILE_BYTES + 1 })).toBe(
      "too-large",
    );
  });
});
