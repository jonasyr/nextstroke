import { expect, type Locator, test } from "@playwright/test";
import { paperPhoto } from "./fixtures.ts";

/** The element's box once scrolling has settled: radios scroll the page when checked. */
async function steady(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  let last = "";
  for (let i = 0; i < 20; i++) {
    const box = await locator.boundingBox();
    if (!box) throw new Error("not visible");
    const now = JSON.stringify(box);
    if (now === last) return box;
    last = now;
    await locator.page().waitForTimeout(50);
  }
  throw new Error("still moving");
}

test("form mode: tap or paint the form, round or flat, and the preview follows it (D-073)", async ({
  page,
}) => {
  await page.goto("#/");
  await page.getByRole("link", { name: /Mit Coach weiterzeichnen/ }).click();
  const { photo } = await paperPhoto(page);
  await page.getByLabel("Foto der Zeichnung wählen").setInputFiles(photo);
  await expect(page.getByRole("button", { name: "Weiter" })).toBeEnabled({ timeout: 30_000 });
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();

  await page.getByRole("radio", { name: /Mehr Tiefe/ }).check();
  await page.getByRole("radio", { name: "Form", exact: true }).check();
  const marker = page.getByRole("img", { name: "Form markieren" });
  await marker.scrollIntoViewIfNeeded();
  await expect(page.getByText(/Tippe auf die Form, die Schatten bekommen soll/)).toBeVisible();
  // A tap either finds a form or says why not; both are valid on this drawing.
  let box = await steady(marker);
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(
    page.getByText(/Stimmt die blaue Fläche|Umriss offen|ganze Bild|nur Linie/),
  ).toBeVisible();
  // "Neu" is only there to press when the tap found something.
  const reset = page.getByRole("button", { name: "Neu" });
  if (await reset.isEnabled()) await reset.click();

  // Painting by hand always gives a form.
  await page.getByRole("radio", { name: "Malen" }).check();
  box = await steady(marker);
  const before = await marker.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4);
  await page.mouse.down();
  for (const [x, y] of [
    [0.6, 0.4],
    [0.6, 0.5],
    [0.35, 0.5],
    [0.35, 0.45],
    [0.6, 0.45],
  ]) {
    await page.mouse.move(box.x + box.width * (x as number), box.y + box.height * (y as number), {
      steps: 6,
    });
  }
  await page.mouse.up();
  expect(await marker.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(before);
  await page.getByRole("radio", { name: "flach", exact: true }).check();
  await page.getByRole("radio", { name: "rund", exact: true }).check();
  await page.getByRole("button", { name: "Rückgängig" }).click();
  await expect(page.getByRole("radio", { name: "rund", exact: true })).toHaveCount(0);
  await page.getByRole("radio", { name: "Malen" }).check();
  box = await steady(marker);
  await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 10 });
  await page.mouse.up();
  await expect(page.getByRole("radio", { name: "rund", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Vorschläge zeigen" }).click();
  await page.getByRole("button", { name: /Vorsichtig/ }).click();
  const preview = page.getByRole("img", { name: "Dein Blatt mit den Strichen der Anleitung" });
  await expect(preview).toBeVisible();
  const pixels = () => preview.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const withPlan = await pixels();
  const hold = page.getByRole("button", { name: "Halten: ohne Striche" });
  await hold.dispatchEvent("pointerdown");
  expect(await pixels()).not.toBe(withPlan);
  await hold.dispatchEvent("pointerup");
  await page.getByRole("radio", { name: "rechts" }).check();
  await expect.poll(pixels).not.toBe(withPlan);
});
