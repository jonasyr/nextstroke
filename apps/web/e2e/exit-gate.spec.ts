import { expect, type Page, test } from "@playwright/test";
import { paperPhoto, syntheticImage } from "./fixtures.ts";

/**
 * Phase 2 exit-gate items that a browser can check (D-063), in Chromium and WebKit. The real
 * iPhone keeps only what a desktop engine cannot show: Home Screen offline, camera photos,
 * real backgrounding and iOS memory limits (docs/handoffs/2026-10-05-iphone-checklist.md).
 */

const editor = (page: Page) => page.getByRole("dialog", { name: "Vergleich" });
const outcome = /[Aa]usgerichtet|Keine sichere Ausrichtung|vermuteten|nachjustiert|Feinabgleich/;

/** Fails the test on any uncaught error, and lets it check that the page never reloaded. */
async function watch(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("#/compare");
  await page.evaluate(() => {
    (window as unknown as { __session: number }).__session = 1;
  });
  return {
    errors,
    reloaded: () =>
      page.evaluate(() => (window as unknown as { __session?: number }).__session !== 1),
  };
}

type File4 = { name: string; mimeType: string; buffer: Buffer };

/** Picks the drawing, waits until it is in, then the Vorlage; the editor opens on its own. */
async function loadPair(page: Page, drawing: File4, vorlage: File4) {
  await page.getByLabel("Zeichnung wählen").setInputFiles(drawing);
  await expect(page.getByText("Bild geladen. Jetzt das zweite Bild wählen.")).toBeVisible({
    timeout: 60_000,
  });
  await page.getByLabel("Vorlage wählen").setInputFiles(vorlage);
  await expect(editor(page)).toBeVisible({ timeout: 60_000 });
}

async function hasInk(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let dark = 0;
    for (let i = 0; i < data.length; i += 16) if ((data[i] as number) < 80) dark++;
    return dark > 20;
  });
}

test("ten sessions in a row neither crash nor reload the page", async ({ page }) => {
  test.setTimeout(600_000);
  const session = await watch(page);
  const { reference, photo } = await paperPhoto(page);
  for (let round = 0; round < 10; round++) {
    // Then each round replaces one image, which opens the editor on the new pair directly.
    if (round === 0) await loadPair(page, photo, reference);
    else {
      const slot = round % 2 ? "Vorlage wählen" : "Zeichnung wählen";
      await page.getByLabel(slot).setInputFiles(round % 2 ? reference : photo);
      await expect(editor(page)).toBeVisible({ timeout: 60_000 });
    }
    await expect.poll(() => hasInk(page)).toBe(true);
    await page.getByRole("tab", { name: /Ausrichten/ }).click();
    await page.getByRole("button", { name: "Automatisch ausrichten" }).click();
    await expect(page.getByText(outcome).first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Fertig" }).click();
    await page.getByRole("button", { name: "Zurück zu den Bildern" }).click();
    await expect(page.getByRole("button", { name: "Vergleichen" })).toBeVisible();
  }
  expect(await session.reloaded()).toBe(false);
  expect(session.errors).toEqual([]);
});

test("a 48 MP photo loads within the image budget", async ({ page }) => {
  test.setTimeout(180_000);
  const session = await watch(page);
  const big = await syntheticImage(page, {
    width: 8000,
    height: 6000,
    type: "image/jpeg",
    seed: 3,
  });
  const small = await syntheticImage(page, {
    width: 1200,
    height: 900,
    type: "image/png",
    seed: 3,
  });
  await page.getByLabel("Zeichnung wählen").setInputFiles(big);
  await expect(page.getByText("Bild geladen. Jetzt das zweite Bild wählen.")).toBeVisible({
    timeout: 60_000,
  });
  await page.getByLabel("Vorlage wählen").setInputFiles(small);
  await expect(editor(page)).toBeVisible({ timeout: 60_000 });
  await expect.poll(() => hasInk(page)).toBe(true);
  expect(await session.reloaded()).toBe(false);
  expect(session.errors).toEqual([]);
});

test("the app keeps working after being hidden during automatic alignment", async ({
  page,
  browserName,
}) => {
  test.setTimeout(180_000);
  const session = await watch(page);
  const { reference, photo } = await paperPhoto(page);
  await loadPair(page, photo, reference);
  await page.getByRole("tab", { name: /Ausrichten/ }).click();
  await page.getByRole("button", { name: "Automatisch ausrichten" }).click();
  // Chromium can really freeze the page, as iOS does in the background; WebKit gets the events.
  const cdp = browserName === "chromium" ? await page.context().newCDPSession(page) : null;
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("blur"));
  });
  await cdp?.send("Page.setWebLifecycleState", { state: "frozen" });
  await page.waitForTimeout(3000);
  await cdp?.send("Page.setWebLifecycleState", { state: "active" });
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect(page.getByText(outcome).first()).toBeVisible({ timeout: 60_000 });
  // Still usable: a step moves the Vorlage and can be undone.
  await page.getByRole("button", { name: "Nach rechts", exact: true }).click();
  await expect(page.getByRole("button", { name: "Rückgängig" })).toBeEnabled();
  await page.getByRole("button", { name: "Fertig" }).click();
  expect(await session.reloaded()).toBe(false);
  expect(session.errors).toEqual([]);
});

test("manual alignment recovers when automatic alignment finds nothing", async ({ page }) => {
  test.setTimeout(180_000);
  const session = await watch(page);
  // Two unrelated pictures: nothing to match, no paper to find.
  const drawing = await syntheticImage(page, {
    width: 1200,
    height: 900,
    type: "image/png",
    seed: 1,
  });
  const other = await syntheticImage(page, {
    width: 900,
    height: 1200,
    type: "image/png",
    seed: 7,
  });
  await loadPair(page, drawing, other);
  await page.getByRole("tab", { name: /Ausrichten/ }).click();
  await page.getByRole("button", { name: "Automatisch ausrichten" }).click();
  await expect(page.getByText(outcome).first()).toBeVisible({ timeout: 60_000 });
  // By hand: steps, size and rotation, then the corner flow.
  await page.getByRole("button", { name: "Nach rechts", exact: true }).click();
  await page.getByRole("button", { name: "Vorlage vergrößern" }).click();
  await page.getByRole("button", { name: "Nach rechts drehen" }).click();
  await page.getByRole("button", { name: /Ecken (setzen|ändern)/ }).click();
  await expect(page.getByText("Ecken 1/2")).toBeVisible();
  await page.getByRole("button", { name: "Ecke nach rechts" }).click();
  await page.getByRole("button", { name: "Weiter" }).click();
  await expect(page.getByText("Ecken 2/2")).toBeVisible();
  await page.getByRole("button", { name: "Ecke nach unten" }).click();
  await page.getByRole("button", { name: "Fertig" }).click();
  await expect(page.getByRole("button", { name: "Ecken ändern" })).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Fertig" }).click();
  await expect(page.getByRole("tab", { name: /Ausrichten/ }).locator(".ns-dot")).toBeVisible();
  expect(await session.reloaded()).toBe(false);
  expect(session.errors).toEqual([]);
});

test("tap and hold show the drawing alone without hiding the controls", async ({ page }) => {
  const session = await watch(page);
  const drawing = await syntheticImage(page, {
    width: 1200,
    height: 900,
    type: "image/png",
    seed: 2,
  });
  const vorlage = await syntheticImage(page, {
    width: 1200,
    height: 900,
    type: "image/png",
    seed: 5,
  });
  await loadPair(page, drawing, vorlage);
  const stage = page.getByRole("application");
  const pill = page.getByText("Nur Zeichnung", { exact: true });
  const tabs = page.getByRole("tab", { name: /Ausrichten/ });
  const box = (await stage.boundingBox()) as {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  // Tap: on until the next tap.
  await page.mouse.click(centre.x, centre.y);
  await expect(pill).toBeVisible();
  await expect(tabs).toBeVisible();
  await page.mouse.click(centre.x, centre.y);
  await expect(pill).toBeHidden();
  // Hold: on while pressed, off on release.
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.down();
  await expect(pill).toBeVisible();
  await expect(tabs).toBeVisible();
  await page.mouse.up();
  await expect(pill).toBeHidden();
  expect(await session.reloaded()).toBe(false);
  expect(session.errors).toEqual([]);
});
