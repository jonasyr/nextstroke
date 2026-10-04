import { expect, type Page, test } from "@playwright/test";
import { PHOTO_PAPER, paperPhoto } from "./fixtures.ts";

type Pt = { x: number; y: number };

/** Largest distance between two normalized quads, per axis. */
const maxError = (a: readonly Pt[], b: readonly Pt[]) =>
  Math.max(
    ...a.map((p, i) => Math.max(Math.abs(p.x - (b[i] as Pt).x), Math.abs(p.y - (b[i] as Pt).y))),
  );

async function loadPair(page: Page) {
  await page.goto("#/compare");
  const { reference, photo } = await paperPhoto(page);
  await page.getByLabel("Zeichnung wählen").setInputFiles(photo);
  await expect(page.getByText("Bild geladen. Jetzt das zweite Bild wählen.")).toBeVisible();
  await page.getByLabel("Vorlage wählen").setInputFiles(reference);
  await expect(page.getByRole("dialog", { name: "Vergleich" })).toBeVisible();
  return { reference, photo };
}

const canvasSum = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 16) sum += data[i] as number;
    return sum;
  });

test("the opencv.js worker finds the photographed sheet and the feature homography", async ({
  page,
}) => {
  await page.goto("#/compare");
  const { reference, photo } = await paperPhoto(page);
  const result = await page.evaluate(
    async ({ ref, pho }) => {
      // The built worker, found through the service worker's precache list.
      const sw = await (await fetch("sw.js")).text();
      const name = /"(assets\/vision\.worker-[^"]+\.js)"/.exec(sw)?.[1] as string;
      const worker = new Worker(name);
      const ask = (message: unknown, transfer: Transferable[] = []) =>
        new Promise<Record<string, unknown>>((resolve) => {
          worker.onmessage = (event) => resolve(event.data);
          worker.postMessage(message, transfer);
        });
      const bitmap = (bytes: number[]) => createImageBitmap(new Blob([new Uint8Array(bytes)]));
      const started = performance.now();
      const load = await ask({ id: 1, type: "load" });
      const loadWallMs = performance.now() - started;
      const p = await bitmap(pho);
      let t = performance.now();
      const paper = await ask({ id: 2, type: "paper", image: p }, [p]);
      const paperMs = performance.now() - t;
      const r = await bitmap(ref);
      const flat = await ask({ id: 3, type: "paper", image: r }, [r]);
      const o = await bitmap(pho);
      const r2 = await bitmap(ref);
      t = performance.now();
      const align = await ask({ id: 4, type: "align", original: o, reference: r2 }, [o, r2]);
      const alignMs = performance.now() - t;
      worker.terminate();
      return { load, loadWallMs, paper, paperMs, flat, align, alignMs };
    },
    { ref: [...reference.buffer], pho: [...photo.buffer] },
  );
  expect(result.load.type).toBe("load");
  const paper = result.paper.paper as { corners: Pt[]; confidence: number };
  const align = result.align.verdict as { accepted: boolean; corners: Pt[]; confidence: number };
  const paperError = maxError(paper.corners, PHOTO_PAPER);
  const alignError = maxError(align.corners, PHOTO_PAPER);
  console.log(
    JSON.stringify({
      opencvLoadMs: result.load.ms,
      loadWallMs: Math.round(result.loadWallMs),
      paperMs: Math.round(result.paperMs),
      paperError: +paperError.toFixed(4),
      paperConfidence: +paper.confidence.toFixed(3),
      alignMs: Math.round(result.alignMs),
      alignError: +alignError.toFixed(4),
      alignConfidence: +align.confidence.toFixed(3),
    }),
  );
  expect(paperError).toBeLessThan(0.02);
  // A flat scan has no sheet edge to find: the manual corners stay at the image corners.
  expect(result.flat.paper).toBeNull();
  expect(align.accepted).toBe(true);
  expect(alignError).toBeLessThan(0.02);
});

test("aligns a new pair at the photographed sheet on opening, and the corner steps show it", async ({
  page,
}) => {
  await page.goto("#/compare");
  const { reference, photo } = await paperPhoto(page);
  await page.getByLabel("Zeichnung wählen").setInputFiles(photo);
  await expect(page.getByText("Bild geladen. Jetzt das zweite Bild wählen.")).toBeVisible();
  await page.getByLabel("Vorlage wählen").setInputFiles(reference);
  await expect(page.getByText("Automatisch an den Blattecken ausgerichtet")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("tab", { name: /Ecken/ }).locator(".ns-dot")).toBeVisible();
  await page.getByRole("tab", { name: /Ecken/ }).click();
  await expect(page.getByText("Ecken 1/2")).toBeVisible();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByText("Ecken 2/2")).toBeVisible();
  const before = await canvasSum(page);
  await page.getByRole("button", { name: "Fertig" }).click();
  await expect.poll(() => canvasSum(page), { timeout: 10_000 }).not.toBe(before);
});

test("aligns on request with the feature homography", async ({ page }) => {
  await loadPair(page);
  await expect(page.getByText("Automatisch an den Blattecken ausgerichtet")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("tab", { name: /Ausrichten/ }).click();
  await page.getByRole("button", { name: "Automatisch" }).click();
  await expect(page.getByText("Ausgerichtet. Prüfe die Kanten bei 50 %.")).toBeVisible({
    timeout: 30_000,
  });
});
