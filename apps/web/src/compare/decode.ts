import { workingSize } from "@nextstroke/imaging";

export interface Decoded {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
}

export type BitmapFactory = (
  source: ImageBitmapSource,
  options?: ImageBitmapOptions,
) => Promise<ImageBitmap>;

/**
 * Decode with EXIF orientation, then downsample to the bounded working size and release the
 * full-resolution bitmap (legacy defect D1). The caller keeps the original blob separately.
 */
export async function decodeToWorking(blob: Blob, make: BitmapFactory): Promise<Decoded> {
  const full = await make(blob, { imageOrientation: "from-image" });
  const sourceWidth = full.width;
  const sourceHeight = full.height;
  const size = workingSize(sourceWidth, sourceHeight);
  if (size.scale === 1)
    return { bitmap: full, width: sourceWidth, height: sourceHeight, sourceWidth, sourceHeight };
  try {
    const bitmap = await make(full, {
      resizeWidth: size.width,
      resizeHeight: size.height,
      resizeQuality: "high",
    });
    return { bitmap, width: size.width, height: size.height, sourceWidth, sourceHeight };
  } finally {
    full.close();
  }
}
