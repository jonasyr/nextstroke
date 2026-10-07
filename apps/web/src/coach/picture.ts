import { classifyFile } from "@nextstroke/imaging";
import type { MessageKey } from "@nextstroke/ui";
import type { Decoded } from "../compare/decode.ts";
import { PdfPasswordError } from "../compare/pdf.ts";
import type { CoachDeps } from "./deps.ts";

/** A picked image ready to show and to store as an immutable asset. */
export interface Picture {
  decoded: Decoded;
  asset: {
    bytes: Uint8Array;
    origin: "user-upload";
    mimeType: string;
    width: number;
    height: number;
  };
}

/** Why a file cannot be used; the message key tells the user what to do instead. */
export class PictureError extends Error {
  constructor(readonly key: MessageKey) {
    super(key);
  }
}

/**
 * Opens a photo, image file or PDF page as a template (D-070), with the same rules as Quick
 * Compare: size limit, HEIC hint, password-protected PDFs, a page choice for longer PDFs.
 * A PDF page is stored as the rendered PNG. Returns null when the user cancels the page choice.
 */
export async function loadPicture(
  deps: Pick<CoachDeps, "decode" | "renderPdf">,
  file: File,
  choosePage: (count: number) => Promise<number | null>,
): Promise<Picture | null> {
  const kind = classifyFile(file);
  if (kind === "too-large") throw new PictureError("status.tooLarge");
  if (kind === "unsupported") throw new PictureError("status.unsupported");
  let blob: Blob = file;
  try {
    if (kind === "pdf") {
      const rendered = await deps.renderPdf(await file.arrayBuffer(), choosePage);
      if (!rendered) return null;
      blob = rendered.blob;
    }
    const decoded = await deps.decode(blob);
    return {
      decoded,
      asset: {
        bytes: new Uint8Array(await blob.arrayBuffer()),
        origin: "user-upload",
        mimeType: blob.type || file.type || "application/octet-stream",
        width: decoded.sourceWidth,
        height: decoded.sourceHeight,
      },
    };
  } catch (error) {
    if (error instanceof PdfPasswordError) {
      throw new PictureError("status.password");
    }
    throw new PictureError(kind === "heic" ? "status.heic" : "status.unsupported");
  }
}
