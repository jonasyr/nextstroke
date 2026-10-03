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

type Pt = { x: number; y: number };
type File4 = { name: string; mimeType: string; buffer: Buffer };

/** H (row-major, h8 = 1) with H·src[i] = dst[i], by Gaussian elimination. */
function homography(src: readonly Pt[], dst: readonly Pt[]): number[] {
  const rows: number[][] = [];
  src.forEach(({ x, y }, i) => {
    const { x: u, y: v } = dst[i] as Pt;
    rows.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    rows.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) {
      if (Math.abs(rows[r]?.[c] as number) > Math.abs(rows[p]?.[c] as number)) p = r;
    }
    [rows[c], rows[p]] = [rows[p] as number[], rows[c] as number[]];
    const pivot = rows[c] as number[];
    for (let r = 0; r < 8; r++) {
      const row = rows[r] as number[];
      if (r === c) continue;
      const f = (row[c] as number) / (pivot[c] as number);
      for (let k = c; k < 9; k++) row[k] = (row[k] as number) - f * (pivot[k] as number);
    }
  }
  return [...rows.map((row, i) => (row[8] as number) / (row[i] as number)), 1];
}

/** Where the sheet's corners (TL, TR, BR, BL) lie in the synthetic photo, normalized. */
export const PHOTO_PAPER: readonly Pt[] = [
  { x: 0.14, y: 0.12 },
  { x: 0.86, y: 0.16 },
  { x: 0.9, y: 0.88 },
  { x: 0.1, y: 0.84 },
];

/**
 * A synthetic drawing on a flat sheet (the reference) and the same sheet "photographed" with a
 * known perspective on a dark textured table (the original). Drawn in the browser from a fixed
 * seed, so no real artwork or photo is committed (AGENTS rule 9).
 */
export async function paperPhoto(page: Page): Promise<{ reference: File4; photo: File4 }> {
  const sheet = { width: 1000, height: 1414 };
  const photo = { width: 1500, height: 2000 };
  // Photo pixels → sheet pixels, for inverse mapping.
  const toSheet = homography(
    PHOTO_PAPER.map((p) => ({ x: p.x * photo.width, y: p.y * photo.height })),
    [
      { x: 0, y: 0 },
      { x: sheet.width, y: 0 },
      { x: sheet.width, y: sheet.height },
      { x: 0, y: sheet.height },
    ],
  );
  const [reference, photographed] = await page.evaluate(
    async ({ sheet, photo, toSheet }) => {
      let seed = 1234567;
      const rand = () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
      const paper = new OffscreenCanvas(sheet.width, sheet.height);
      const pc = paper.getContext("2d") as OffscreenCanvasRenderingContext2D;
      pc.fillStyle = "#f6f4ee";
      pc.fillRect(0, 0, sheet.width, sheet.height);
      pc.strokeStyle = "#141414";
      pc.fillStyle = "#141414";
      pc.lineCap = "round";
      const m = 70;
      const rx = () => m + rand() * (sheet.width - 2 * m);
      const ry = () => m + rand() * (sheet.height - 2 * m);
      for (let i = 0; i < 140; i++) {
        pc.lineWidth = 2 + rand() * 3;
        pc.beginPath();
        const kind = i % 4;
        if (kind === 0) {
          pc.moveTo(rx(), ry());
          for (let k = 0; k < 4; k++) pc.lineTo(rx(), ry());
        } else if (kind === 1) {
          pc.arc(rx(), ry(), 10 + rand() * 60, 0, Math.PI * (0.5 + rand() * 1.5));
        } else if (kind === 2) {
          pc.rect(rx(), ry(), 20 + rand() * 120, 20 + rand() * 120);
        } else {
          const x = rx();
          const y = ry();
          for (let k = 0; k < 8; k++) {
            pc.moveTo(x + k * 7, y);
            pc.lineTo(x + k * 7 + 30, y + 40);
          }
        }
        pc.stroke();
      }
      for (let i = 0; i < 30; i++) {
        pc.font = `${20 + Math.floor(rand() * 30)}px sans-serif`;
        pc.fillText(String.fromCharCode(65 + Math.floor(rand() * 26)).repeat(3), rx(), ry());
      }
      const ref = pc.getImageData(0, 0, sheet.width, sheet.height).data;

      const table = new OffscreenCanvas(photo.width, photo.height);
      const tc = table.getContext("2d") as OffscreenCanvasRenderingContext2D;
      tc.fillStyle = "#3a2f28";
      tc.fillRect(0, 0, photo.width, photo.height);
      for (let i = 0; i < 2500; i++) {
        const shade = 30 + Math.floor(rand() * 50);
        tc.strokeStyle = `rgba(${shade + 20},${shade + 8},${shade},0.5)`;
        tc.lineWidth = 1 + rand() * 3;
        const x = rand() * photo.width;
        const y = rand() * photo.height;
        tc.beginPath();
        tc.moveTo(x, y);
        tc.lineTo(x + 40 + rand() * 160, y + (rand() - 0.5) * 12);
        tc.stroke();
      }
      const out = tc.getImageData(0, 0, photo.width, photo.height);
      const d = out.data;
      const [a, b, c, e, f, g, h, i, j] = toSheet as [
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
      for (let y = 0; y < photo.height; y++) {
        for (let x = 0; x < photo.width; x++) {
          const o = 4 * (y * photo.width + x);
          const w = h * x + i * y + j;
          const sx = (a * x + b * y + c) / w;
          const sy = (e * x + f * y + g) / w;
          const noise = (rand() - 0.5) * 12;
          if (sx >= 0 && sy >= 0 && sx < sheet.width - 1 && sy < sheet.height - 1) {
            const ix = Math.floor(sx);
            const iy = Math.floor(sy);
            const fx = sx - ix;
            const fy = sy - iy;
            // Soft light from the top left.
            const light = 0.82 + 0.18 * (1 - (x / photo.width + y / photo.height) / 2);
            for (let ch = 0; ch < 3; ch++) {
              const p = 4 * (iy * sheet.width + ix) + ch;
              const v =
                (ref[p] as number) * (1 - fx) * (1 - fy) +
                (ref[p + 4] as number) * fx * (1 - fy) +
                (ref[p + 4 * sheet.width] as number) * (1 - fx) * fy +
                (ref[p + 4 * sheet.width + 4] as number) * fx * fy;
              d[o + ch] = v * light + noise;
            }
          } else {
            for (let ch = 0; ch < 3; ch++) d[o + ch] = (d[o + ch] as number) + noise;
          }
        }
      }
      tc.putImageData(out, 0, 0);
      const bytes = async (canvas: OffscreenCanvas, type: string) => [
        ...new Uint8Array(await (await canvas.convertToBlob({ type, quality: 0.9 })).arrayBuffer()),
      ];
      return [await bytes(paper, "image/png"), await bytes(table, "image/jpeg")];
    },
    { sheet, photo, toSheet },
  );
  return {
    reference: { name: "blatt.png", mimeType: "image/png", buffer: Buffer.from(reference) },
    photo: { name: "foto.jpg", mimeType: "image/jpeg", buffer: Buffer.from(photographed) },
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
