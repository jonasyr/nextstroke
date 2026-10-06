import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { paperPhoto } from "./fixtures.ts";

test("checkpoint, before and now, project view, export, draw on, and import", async ({ page }) => {
  await page.goto("#/guided");
  const { photo } = await paperPhoto(page);
  await page.getByLabel("Foto der Zeichnung wählen").setInputFiles(photo);
  await expect(page.getByText(/Die Ringe sitzen auf den Blattecken|Prüf die gelb/)).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Vorschläge zeigen" }).click();
  await page.getByRole("button", { name: /Vorsichtig/ }).click();

  // A checkpoint photo: corners found, straightened into the start's frame, stored.
  await page
    .getByLabel("Foto des Zwischenstands wählen")
    .setInputFiles({ ...photo, name: "jetzt.png" });
  await expect(page.getByRole("heading", { name: "Zwischenstand" })).toBeVisible();
  await expect(page.getByText(/Die Ringe sitzen auf den Blattecken|Prüf die gelb/)).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Vergleichen" }).click();
  await expect(page.getByRole("heading", { name: "Vorher und jetzt" })).toBeVisible();
  await expect(page.getByText("Der Zwischenstand ist gespeichert.")).toBeVisible();
  await page.getByRole("slider", { name: "Trenner verschieben" }).fill("20");
  await page.getByRole("button", { name: "Fertig für heute" }).click();

  // The project: start and one checkpoint, the chosen idea, saved as a file.
  await expect(page.getByText("Zwischenstand 1")).toBeVisible();
  await expect(page.getByText("Die dunkelste Stelle schraffieren")).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Als Datei sichern" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^Projekt-vom-.*\.nextstroke\.zip$/);
  const zip = await readFile(await download.path());

  // Draw on: straight to the goal, the straight sheet ready to mark.
  await page.getByRole("link", { name: "Weiterzeichnen" }).click();
  await expect(page.getByRole("heading", { name: /Dein Ziel/ })).toBeVisible();
  await expect(page.getByRole("img", { name: "Stelle markieren" })).toBeVisible();

  // The file opens as a copy on the start screen.
  await page.goto("#/");
  await page.getByLabel("Projektdatei wählen").setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "application/zip",
    buffer: zip,
  });
  await expect(page.getByText("Zwischenstand 1")).toBeVisible();
  await page.getByRole("button", { name: "Projekte" }).click();
  await expect(page.getByRole("link", { name: /Projekt vom/ })).toHaveCount(2);
});
