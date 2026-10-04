import { useEffect, useRef } from "react";

/** A small cover-cropped preview of a decoded image, drawn on a canvas (no object URLs). */
export function Thumb({
  image,
  width,
  height,
  className,
}: {
  image: ImageBitmap;
  width: number;
  height: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const s = Math.max(canvas.width / image.width, canvas.height / image.height);
    ctx.drawImage(
      image,
      (canvas.width - image.width * s) / 2,
      (canvas.height - image.height * s) / 2,
      image.width * s,
      image.height * s,
    );
  }, [image, width, height]);
  return (
    <span className={className} style={{ width, height }} aria-hidden="true">
      <canvas ref={ref} style={{ width, height, display: "block" }} />
    </span>
  );
}
