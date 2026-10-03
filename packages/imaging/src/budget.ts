/**
 * Pixel and file budgets (spec §12; legacy defect D1). Memory is governed by pixels, not by
 * file size: every canvas stays within 4096 × 4096 and the ~16.7 MP iOS canvas area.
 */
export const WORKING_MAX_EDGE = 2048;
export const CANVAS_MAX_EDGE = 4096;
export const CANVAS_MAX_PIXELS = 16_777_216;
export const MAX_FILE_BYTES = 70 * 1024 * 1024;
export const PDF_MAX_EDGE = 2400;
export const PDF_MAX_SCALE = 3;

export interface Size {
  width: number;
  height: number;
  scale: number;
}

function check(width: number, height: number): void {
  if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) {
    throw new Error(`invalid image size ${width}×${height}`);
  }
}

function scaled(width: number, height: number, scale: number): Size {
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/** Bounded working copy: longest edge at most `maxEdge`. */
export function workingSize(width: number, height: number, maxEdge = WORKING_MAX_EDGE): Size {
  check(width, height);
  return scaled(width, height, Math.min(1, maxEdge / Math.max(width, height)));
}

/** Largest export that fits the canvas edge and area limits. */
export function exportSize(width: number, height: number): Size {
  check(width, height);
  const scale = Math.min(
    1,
    CANVAS_MAX_EDGE / Math.max(width, height),
    Math.sqrt(CANVAS_MAX_PIXELS / (width * height)),
  );
  return scaled(width, height, scale);
}

export function pdfRenderScale(width: number, height: number): number {
  return Math.min(PDF_MAX_EDGE / Math.max(width, height), PDF_MAX_SCALE);
}

export type FileKind = "image" | "heic" | "pdf" | "too-large" | "unsupported";

export function classifyFile(file: { type: string; name: string; size: number }): FileKind {
  if (file.size > MAX_FILE_BYTES) return "too-large";
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (type === "image/heic" || type === "image/heif" || /\.hei[cf]$/.test(name)) return "heic";
  if (
    ["image/jpeg", "image/png", "image/webp"].includes(type) ||
    /\.(jpe?g|png|webp)$/.test(name)
  ) {
    return "image";
  }
  return "unsupported";
}
