import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { paperPhoto } from "./fixtures.ts";

test("a template in a coach project: add, compare, open in Quick Compare, export and import (D-070)", async ({
  page,
}) => {
  await page.goto("#/guided");
  const { photo, reference } = await paperPhoto(page);
  await page.getByLabel("Foto der Zeichnung wählen").setInputFiles(photo);
  await expect(page.getByText(/Die Ringe sitzen auf den Blattecken|Prüf die gelb/)).toBeVisible({
    timeout: 30_000,
  });

  // The template: a digital image, so the whole picture is the sheet.
  await expect(page.getByText("Vorlage (optional)")).toBeVisible();
  await page.getByLabel("Vorlage wählen").setInputFiles(reference);
  await expect(page.getByRole("heading", { name: "Vorlage" })).toBeVisible();
  await page.getByRole("button", { name: "Übernehmen" }).click();
  await expect(page.getByText("Wird zum Vergleichen genutzt.")).toBeVisible();

  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await page.getByRole("button", { name: "Vorschläge zeigen" }).click();
  await page.getByRole("button", { name: /Vorsichtig/ }).click();
  await page
    .getByLabel("Foto des Zwischenstands wählen")
    .setInputFiles({ ...photo, name: "jetzt.png" });
  await expect(page.getByText(/Die Ringe sitzen auf den Blattecken|Prüf die gelb/)).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole("button", { name: "Vergleichen" }).click();
  await page.getByRole("radio", { name: "Vorlage" }).check();
  await expect(page.locator(".ns-g-tag[data-side=left]")).toHaveText("Vorlage");
  await page.getByRole("button", { name: "Fertig für heute" }).click();

  // Project view: open the pair in Quick Compare, already aligned at the saved corners.
  await page.getByRole("link", { name: "Im Schnellvergleich öffnen" }).click();
  await expect(page.getByRole("dialog", { name: "Vergleich" })).toBeVisible();
  await expect(page.getByText("An den gespeicherten Blattecken ausgerichtet")).toBeVisible();
  await page.getByRole("button", { name: "Zurück zu den Bildern" }).click();
  await expect(page.getByText("Vorlage", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Zurück" }).click();
  await expect(page.getByText("Wird zum Vergleichen genutzt.")).toBeVisible();

  // The file carries the template.
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Als Datei sichern" }).click();
  const download = await downloading;
  const zip = await readFile(await download.path());
  await page.goto("#/");
  await page.getByLabel("Projektdatei wählen").setInputFiles({
    name: download.suggestedFilename(),
    mimeType: "application/zip",
    buffer: zip,
  });
  await expect(page.getByText("Wird zum Vergleichen genutzt.")).toBeVisible();
});
