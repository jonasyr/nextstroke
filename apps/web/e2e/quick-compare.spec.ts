import { expect, test } from "@playwright/test";
import { syntheticImage, twoPagePdf } from "./fixtures.ts";

async function canvasHasInk(page: import("@playwright/test").Page): Promise<boolean> {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) if ((data[i] as number) < 80) dark++;
    return dark > 50;
  });
}

test("compares two photos, aligns, and exports a bounded comparison", async ({ page }) => {
  await page.goto("#/compare");
  const original = await syntheticImage(page, {
    width: 6000,
    height: 4000,
    type: "image/jpeg",
    seed: 1,
  });
  const reference = await syntheticImage(page, {
    width: 1200,
    height: 800,
    type: "image/png",
    seed: 1,
  });
  await page.getByLabel("Zeichnung wählen").setInputFiles(original);
  await expect(page.getByText("Bild geladen. Jetzt das zweite Bild wählen.")).toBeVisible();
  await page.getByLabel("Vorlage wählen").setInputFiles(reference);
  await expect(page.getByRole("dialog", { name: "Vergleich" })).toBeVisible();
  await expect.poll(() => canvasHasInk(page)).toBe(true);

  await page.getByRole("tab", { name: /Ausrichten/ }).click();
  await page.getByRole("button", { name: "Automatisch ausrichten" }).click();
  await expect(
    page.getByText(
      /[Aa]usgerichtet|Keine sichere Ausrichtung|vermuteten|nachjustiert|Feinabgleich/,
    ),
  ).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Fertig" }).click();

  await page.getByRole("button", { name: "Exportieren" }).click();
  const download = page.waitForEvent("download");
  // Headless Chromium has no share sheet, so "Teilen" falls back to a download.
  await page
    .getByRole("dialog", { name: "Exportieren" })
    .getByRole("button", { name: "Teilen" })
    .click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("Vergleich.jpg");
  const path = await file.path();
  const size = await page.evaluate(
    async (bytes) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)]));
      return { width: bitmap.width, height: bitmap.height };
    },
    [...(await import("node:fs")).readFileSync(path)],
  );
  // The 6000 × 4000 original is decoded to the 2048 px working size before export.
  expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(2048);
});

test("loads a chosen page of a multi-page PDF", async ({ page }) => {
  await page.goto("#/compare");
  await page.getByLabel("Vorlage wählen").setInputFiles(twoPagePdf());
  const dialog = page.getByRole("dialog", { name: "Welche Seite?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("spinbutton").fill("2");
  await dialog.getByRole("button", { name: "Seite laden" }).click();
  await expect(page.getByText(/zwei-seiten\.pdf · 2\/2/)).toBeVisible({ timeout: 20_000 });
});

test("works offline after the first visit", async ({ page, context }) => {
  await page.goto("./");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await context.setOffline(true);
  await page.goto("#/compare");
  await page.reload();
  const original = await syntheticImage(page, {
    width: 1200,
    height: 800,
    type: "image/png",
    seed: 2,
  });
  await page.getByLabel("Zeichnung wählen").setInputFiles(original);
  await expect(page.getByText("Bild geladen. Jetzt das zweite Bild wählen.")).toBeVisible();
  await page.getByLabel("Vorlage wählen").setInputFiles({ ...original, name: "b.png" });
  await expect(page.getByRole("dialog", { name: "Vergleich" })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Offline" })).toBeVisible();
  // opencv.js comes from the precache too: paper detection answers (D-055).
  await page.getByRole("tab", { name: /Ausrichten/ }).click();
  await page.getByRole("button", { name: "Ecken setzen" }).click();
  await page.getByRole("button", { name: "Automatisch", exact: true }).click();
  await expect(page.getByText(/Blatt nicht erkannt|Blattecken erkannt/)).toBeVisible({
    timeout: 30_000,
  });
});

test("places paper corners on both images and warps the reference", async ({ page }) => {
  await page.goto("#/compare");
  const original = await syntheticImage(page, {
    width: 1200,
    height: 800,
    type: "image/png",
    seed: 3,
  });
  const reference = await syntheticImage(page, {
    width: 1200,
    height: 800,
    type: "image/png",
    seed: 4,
  });
  await page.getByLabel("Zeichnung wählen").setInputFiles(original);
  await expect(page.getByText("Bild geladen. Jetzt das zweite Bild wählen.")).toBeVisible();
  await page.getByLabel("Vorlage wählen").setInputFiles(reference);
  await expect(page.getByRole("dialog", { name: "Vergleich" })).toBeVisible();

  const snapshot = () =>
    page.evaluate(() => {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      let sum = 0;
      for (let i = 0; i < data.length; i += 16) sum += data[i] as number;
      return sum;
    });
  // Whatever the automatic alignment on opening did, start the manual corners from scratch.
  await expect(
    page.getByText(
      /Nicht automatisch ausgerichtet|Automatisch an den Blattecken|Am Bildinhalt ausgerichtet/,
    ),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Mehr" }).click();
  await page.getByRole("menuitem", { name: "Alles zurücksetzen" }).click();
  await page.waitForTimeout(300);
  const plain = await snapshot();

  const box = (await page.locator(".ns-stage").boundingBox()) as {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  // Both images are 1200 × 800 and shown at 0.85× while placing corners, so their rings sit
  // at the same screen positions.
  const fit = Math.min(box.width / 1200, box.height / 800) * 0.85;
  const left = box.x + (box.width - 1200 * fit) / 2;
  const top = box.y + (box.height - 800 * fit) / 2;
  const at = (fx: number, fy: number) => [left + 1200 * fit * fx, top + 800 * fit * fy] as const;
  async function drag(from: readonly [number, number], to: readonly [number, number]) {
    await page.mouse.move(...from);
    await page.mouse.down();
    await page.mouse.move(...to, { steps: 5 });
    await page.mouse.up();
  }

  await page.getByRole("tab", { name: /Ausrichten/ }).click();
  await page.getByRole("button", { name: "Ecken setzen" }).click();
  await expect(page.getByText("Ecken 1/2")).toBeVisible();
  await drag([at(0, 0)[0] + 2, at(0, 0)[1] + 2], at(0.1, 0.1));
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByText("Ecken 2/2")).toBeVisible();
  // A keystone the affine layer cannot express: pull the top-right corner inwards.
  await drag([at(1, 0)[0] - 2, at(1, 0)[1] + 2], at(0.8, 0.15));
  await page.getByRole("button", { name: "Fertig" }).click();
  await expect(page.getByRole("heading", { name: "Feinjustieren" })).toBeVisible();
  await page.getByRole("button", { name: "Fertig" }).click();
  await expect(page.getByRole("tab", { name: /Ausrichten/ }).locator(".ns-dot")).toBeVisible();
  await expect.poll(snapshot, { timeout: 5_000 }).not.toBe(plain);
});

test("splits drawing and Vorlage and drags the divider", async ({ page }) => {
  await page.goto("#/compare");
  const original = await syntheticImage(page, {
    width: 1200,
    height: 800,
    type: "image/png",
    seed: 5,
  });
  const reference = await syntheticImage(page, {
    width: 1200,
    height: 800,
    type: "image/png",
    seed: 6,
  });
  await page.getByLabel("Zeichnung wählen").setInputFiles(original);
  await expect(page.getByText("Bild geladen. Jetzt das zweite Bild wählen.")).toBeVisible();
  await page.getByLabel("Vorlage wählen").setInputFiles(reference);
  await expect(page.getByRole("dialog", { name: "Vergleich" })).toBeVisible();
  await page.getByRole("button", { name: "Teilen" }).click();
  const slider = page.getByRole("slider", { name: "Trennlinie" });
  await expect(slider).toHaveValue("50");

  const box = (await page.locator(".ns-stage").boundingBox()) as {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  const midY = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width / 2, midY);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, midY, { steps: 5 });
  await page.mouse.move(box.x + box.width * 0.3, midY, { steps: 5 });
  await page.mouse.up();
  const value = Number(await slider.inputValue());
  expect(value).toBeLessThan(45);
  expect(value).toBeGreaterThan(0);
});
