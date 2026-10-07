import { expect, test } from "@playwright/test";
import { paperPhoto } from "./fixtures.ts";

test("guided flow: photo, pen and paper, goal with a marked spot, ideas, steps, saved project", async ({
  page,
}) => {
  await page.goto("#/");
  await page.getByRole("link", { name: /Mit Coach weiterzeichnen/ }).click();
  const { photo } = await paperPhoto(page);
  await page.getByLabel("Foto der Zeichnung wählen").setInputFiles(photo);
  // opencv.js finds the sheet; the rings sit on its corners.
  await expect(page.getByText(/Die Ringe sitzen auf den Blattecken|Prüf die gelb/)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Weiter" })).toBeEnabled();
  await page.getByRole("button", { name: "Weiter" }).click();

  // Straightened: the goal screen later shows the upright sheet.
  await page.getByRole("radio", { name: "Sakura Pigma Micron" }).check();
  await page.getByRole("radio", { name: "0,3", exact: true }).check();
  await page.getByRole("radio", { name: "Zeichenpapier" }).check();
  await page.getByRole("button", { name: "Weiter" }).click();

  await page.getByRole("radio", { name: /Mehr Tiefe/ }).check();
  const marker = page.getByRole("img", { name: "Stelle markieren" });
  await marker.scrollIntoViewIfNeeded();
  const box = await marker.boundingBox();
  if (!box) throw new Error("no photo");
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.5);
  await expect(page.getByText(/^Markiert\./)).toBeVisible();
  // Drag from the ring to make the circle larger.
  const ring = box.x + box.width * (0.4 + 0.12);
  await page.mouse.move(ring, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(ring + box.width * 0.1, box.y + box.height * 0.5, { steps: 5 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Weitere Optionen" }).click();
  await page.getByRole("button", { name: /Geschützte Stellen \(0\)/ }).click();
  // The page may have scrolled to the buttons: measure the photo again.
  const protect = page.getByRole("img", { name: "Geschützte Stellen markieren" });
  await protect.scrollIntoViewIfNeeded();
  const now = await protect.boundingBox();
  if (!now) throw new Error("no photo");
  await page.mouse.click(now.x + now.width * 0.8, now.y + now.height * 0.2);
  await page.getByRole("button", { name: "Fertig mit geschützten Stellen" }).click();
  await expect(page.getByRole("button", { name: /Geschützte Stellen \(1\)/ })).toBeVisible();
  await page.getByRole("button", { name: "Vorschläge zeigen" }).click();

  await expect(
    page.getByText(/Für mehr Tiefe mit Pigma Micron 0,3 mm auf Zeichenpapier\./),
  ).toBeVisible();
  await expect(page.getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: /Vorsichtig/ }).click();
  await expect(page.getByText("Die geschützten Stellen nicht berühren.")).toBeVisible();
  await expect(page.getByText(/im markierten Bereich/).first()).toBeVisible();
  // The instruction drawn on the straight sheet (D-071): strokes over the photo, a hold shows it
  // without them, and the light's side moves the shadow.
  const preview = page.getByRole("img", { name: "Dein Blatt mit den Strichen der Anleitung" });
  await expect(preview).toBeVisible();
  const pixels = () => preview.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const withPlan = await pixels();
  const hold = page.getByRole("button", { name: "Halten: ohne Striche" });
  await hold.dispatchEvent("pointerdown");
  await expect(hold).toHaveAttribute("aria-pressed", "true");
  expect(await pixels()).not.toBe(withPlan);
  await hold.dispatchEvent("pointerup");
  await expect(hold).toHaveAttribute("aria-pressed", "false");
  expect(await pixels()).toBe(withPlan);
  await page.getByRole("radio", { name: "rechts" }).check();
  await expect.poll(pixels).not.toBe(withPlan);
  await page.getByText("Woher wissen wir das?").click();
  await expect(page.getByText(/Laut Sakura/)).toBeVisible();
  await page.getByRole("button", { name: "Fertig für heute" }).click();
  // The project view, then back to the projects on the start screen.
  await expect(page.getByText("Die dunkelste Stelle schraffieren")).toBeVisible();
  await page.getByRole("button", { name: "Projekte" }).click();

  // Back on the start screen, the project is listed from IndexedDB, with the photo as thumbnail.
  const project = page.getByRole("link", { name: /Projekt vom/ });
  await expect(project).toBeVisible();
  await expect(project.locator("img")).toHaveJSProperty("complete", true);
  expect(
    await project.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByRole("link", { name: /Projekt vom/ })).toBeVisible();
});
