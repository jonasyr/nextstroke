import type { Page } from "@playwright/test";

/** Synthetic images drawn in the browser, so no artwork is committed (AGENTS rule 9). */
export async function syntheticImage(
  page: Page,
  options: { width: number; height: number; type: "image/png" | "image/jpeg"; seed: number },
): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const bytes: number[] = await page.evaluate(async ({ width, height, type, seed }) => {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    ctx.fillStyle = "#f4f2ec";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#111";
    ctx.lineWidth = Math.max(2, width / 300);
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo((((i * 37 + seed) % 100) * width) / 100, 0.1 * height);
      ctx.lineTo((((i * 53 + seed * 3) % 100) * width) / 100, 0.9 * height);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 5, 0, Math.PI * 2);
    ctx.stroke();
    const blob = await canvas.convertToBlob({ type, quality: 0.9 });
    return [...new Uint8Array(await blob.arrayBuffer())];
  }, options);
  const ext = options.type === "image/png" ? "png" : "jpg";
  return {
    name: `synthetic-${options.seed}.${ext}`,
    mimeType: options.type,
    buffer: Buffer.from(bytes),
  };
}

/** A minimal two-page PDF with one line per page. */
export function twoPagePdf(): { name: string; mimeType: string; buffer: Buffer } {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 4 0 R >>",
    null,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Contents 6 0 R >>",
    null,
  ];
  const streams: Record<number, string> = {
    4: "4 w 20 20 m 280 180 l S",
    6: "4 w 20 180 m 280 20 l S",
  };
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    const n = i + 1;
    offsets.push(body.length);
    const content = obj ?? `<< /Length ${streams[n]?.length} >>\nstream\n${streams[n]}\nendstream`;
    body += `${n} 0 obj\n${content}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return {
    name: "zwei-seiten.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(body, "latin1"),
  };
}
