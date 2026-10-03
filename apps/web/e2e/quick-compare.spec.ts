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
  await page.getByLabel(/^Original wählen/).setInputFiles(original);
  await expect(page.getByText("Bild geladen. Automatisch oder manuell ausrichten.")).toBeVisible();
  await page.getByLabel(/^Referenz wählen/).setInputFiles(reference);
  await expect(page.getByText("ÜBERLAGERUNG")).toBeVisible();
  await expect.poll(() => canvasHasInk(page)).toBe(true);

  await page.getByRole("button", { name: "Ausrichten" }).click();
  await page.getByRole("button", { name: "Automatisch ausrichten" }).click();
  await expect(page.getByText(/Abgeglichen|Kein sicherer Abgleich/)).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: "Speichern" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Vergleich als JPEG" }).click();
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
  await page.getByLabel(/^Original wählen/).setInputFiles(twoPagePdf());
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
  await page.getByLabel(/^Original wählen/).setInputFiles(original);
  await expect(page.getByText("Bild geladen. Automatisch oder manuell ausrichten.")).toBeVisible();
  await page.getByLabel(/^Referenz wählen/).setInputFiles({ ...original, name: "b.png" });
  await expect(page.getByText("ÜBERLAGERUNG")).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Offline" })).toBeVisible();
});
