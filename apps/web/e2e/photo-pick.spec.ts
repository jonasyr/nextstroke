import { expect, test } from "@playwright/test";

/** A 4032 × 3024 JPEG like an iPhone photo, drawn in the browser. */
async function phonePhoto(page: import("@playwright/test").Page) {
  const bytes: number[] = await page.evaluate(async () => {
    const c = new OffscreenCanvas(4032, 3024);
    const g = c.getContext("2d") as OffscreenCanvasRenderingContext2D;
    g.fillStyle = "#3a2f28";
    g.fillRect(0, 0, 4032, 3024);
    g.fillStyle = "#f4f2ec";
    g.fillRect(600, 300, 2800, 2400);
    g.strokeStyle = "#111";
    g.lineWidth = 8;
    for (let i = 0; i < 300; i++) {
      g.beginPath();
      g.moveTo(700 + Math.random() * 2600, 400 + Math.random() * 2200);
      g.lineTo(700 + Math.random() * 2600, 400 + Math.random() * 2200);
      g.stroke();
    }
    const b = await c.convertToBlob({ type: "image/jpeg", quality: 0.9 });
    return [...new Uint8Array(await b.arrayBuffer())];
  });
  return { name: "IMG_0001.jpg", mimeType: "image/jpeg", buffer: Buffer.from(bytes) };
}

/** An iPhone-sized photo must never reload the page (owner report 2026-10-07). */
for (const where of ["coach", "compare"] as const) {
  test(`no reload when picking a photo: ${where}`, async ({ page }) => {
    const navigations: string[] = [];
    const errors: string[] = [];
    page.on("framenavigated", (f) => {
      if (f === page.mainFrame()) navigations.push(f.url());
    });
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("#/");
    const photo = await phonePhoto(page);
    if (where === "coach") {
      await page.getByRole("link", { name: /Mit Coach weiterzeichnen/ }).click();
      await page.getByLabel("Foto der Zeichnung wählen").setInputFiles(photo);
      await expect(page.getByRole("button", { name: "Weiter" })).toBeEnabled({ timeout: 30_000 });
    } else {
      await page.getByRole("link", { name: /Schnell vergleichen/ }).click();
      await page.locator('input[type="file"]').first().setInputFiles(photo);
    }
    // Corner search and saving run for a few seconds after the pick.
    await page.waitForTimeout(4000);
    expect(navigations).toEqual([
      expect.stringMatching(/#\/$/),
      expect.stringMatching(where === "coach" ? /#\/guided$/ : /#\/compare$/),
    ]);
    expect(errors).toEqual([]);
  });
}
