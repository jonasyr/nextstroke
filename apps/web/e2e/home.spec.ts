import { expect, test } from "@playwright/test";

test("start offers the coach and quick compare, and real storage for projects", async ({
  page,
}) => {
  await page.goto("#/");
  await expect(page.getByRole("heading", { name: "Was willst du heute machen?" })).toBeVisible();
  // IndexedDB opens in the real browser: the empty list, not "cannot be stored".
  await expect(page.getByText(/Noch keine Projekte/)).toBeVisible();
  await expect(page.getByText(/Exportiere wichtige Projekte/)).toBeVisible();
  await page.getByRole("link", { name: /Schnell vergleichen/ }).click();
  await expect(
    page.getByRole("heading", { name: "Vergleiche deine Zeichnung mit der Vorlage." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zurück" }).click();
  await expect(page.getByRole("heading", { name: "Was willst du heute machen?" })).toBeVisible();
});
