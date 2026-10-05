// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PdfPasswordError } from "./pdf.ts";
import { type CompareDeps, QuickCompare } from "./QuickCompare.tsx";
import type { VisionDeps } from "./visionClient.ts";

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
  // jsdom has no layout: give every element a 400 × 200 box and report it once observed.
  Element.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, x: 0, y: 0, width: 400, height: 200, right: 400, bottom: 200 }) as DOMRect;
  globalThis.ResizeObserver = class {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe() {
      this.callback([], this as unknown as ResizeObserver);
    }
    unobserve() {}
    disconnect() {}
  };
});
afterEach(cleanup);

const bitmap = (width = 100, height = 50) =>
  ({ width, height, close: vi.fn() }) as unknown as ImageBitmap;

function makeDeps(over: Partial<CompareDeps> = {}): CompareDeps {
  return {
    decode: vi.fn(async () => ({
      bitmap: bitmap(),
      width: 1000,
      height: 500,
      sourceWidth: 1000,
      sourceHeight: 500,
    })),
    renderPdf: vi.fn(async () => ({
      blob: new Blob(["pdf"], { type: "image/png" }),
      page: 2,
      count: 3,
    })),
    share: vi.fn(async () => "shared"),
    download: vi.fn(),
    renderBlob: vi.fn(async (_size, type, paint) => {
      paint(new Proxy({}, { get: () => () => {} }) as CanvasRenderingContext2D);
      return new Blob(["x"], { type });
    }),
    gray: vi.fn((_img, w: number, h: number) => ({
      data: new Float32Array(w * h).fill(0.5),
      width: w,
      height: h,
    })),
    rgba: vi.fn((image: ImageBitmap) => ({
      data: new Uint8ClampedArray(image.width * image.height * 4).fill(200),
      width: image.width,
      height: image.height,
    })),
    fromRgba: vi.fn(async (rgba) => bitmap(rgba.width, rgba.height)),
    now: () => 0,
    ...over,
  };
}

const png = (name = "a.png", size = 10) =>
  new File([new Uint8Array(size)], name, { type: "image/png" });

function pick(label: "Vorlage" | "Zeichnung", file: File) {
  fireEvent.change(screen.getByLabelText(`${label} wählen`), { target: { files: [file] } });
}

async function loadBoth(deps: CompareDeps) {
  render(<QuickCompare deps={deps} />);
  pick("Zeichnung", png("zeichnung.png"));
  await screen.findByText("Bild geladen. Jetzt das zweite Bild wählen.");
  pick("Vorlage", png("vorlage.png"));
  await screen.findByRole("dialog", { name: "Vergleich" });
}

const stage = () => screen.getByRole("application");
const button = (name: string | RegExp) => screen.getByRole("button", { name });
const slider = () => screen.getByRole("slider") as HTMLInputElement;

function drag(id: number, from: [number, number], to: [number, number]) {
  fireEvent.pointerDown(stage(), { pointerId: id, clientX: from[0], clientY: from[1] });
  fireEvent.pointerMove(stage(), { pointerId: id, clientX: to[0], clientY: to[1] });
  fireEvent.pointerUp(stage(), { pointerId: id });
}

function tap(id: number, x: number, y: number) {
  fireEvent.pointerDown(stage(), { pointerId: id, clientX: x, clientY: y });
  fireEvent.pointerUp(stage(), { pointerId: id });
}

const paper = (inset: number, confidence = 0.97) => ({
  corners: [
    { x: inset, y: inset },
    { x: 1 - inset, y: inset },
    { x: 1 - inset, y: 1 - inset },
    { x: inset, y: 1 - inset },
  ] as const,
  confidence,
});

function fakeVision(over: Partial<VisionDeps> = {}): VisionDeps {
  return {
    load: vi.fn(async () => ({ ok: true, ms: 5 })),
    detectPaper: vi.fn(async () => null),
    align: vi.fn(async () => null),
    refine: vi.fn(async () => null),
    corners: vi.fn(async () => null),
    ...over,
  };
}

describe("start screen", () => {
  it("opens the demo pair from the empty start screen (D-056)", async () => {
    const demoPair = vi.fn(async () => ({
      reference: png("Beispiel-Vorlage.png"),
      original: png("Beispiel-Zeichnung.jpg"),
    }));
    render(<QuickCompare deps={makeDeps({ demoPair })} />);
    fireEvent.click(button("Beispiel ansehen"));
    expect(await screen.findByRole("dialog", { name: "Vergleich" })).toBeTruthy();
    fireEvent.click(button("Zurück zu den Bildern"));
    expect(screen.getByText("Beispiel-Zeichnung.jpg")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Beispiel ansehen" })).toBeNull();
  });

  it("explains a demo pair that cannot be made, and hides the link without one", async () => {
    const demoPair = vi.fn(async () => {
      throw new Error("no canvas");
    });
    const { unmount } = render(<QuickCompare deps={makeDeps({ demoPair })} />);
    fireEvent.click(button("Beispiel ansehen"));
    expect(await screen.findByText(/Datei nicht lesbar/)).toBeTruthy();
    unmount();
    render(<QuickCompare deps={makeDeps()} />);
    expect(screen.queryByRole("button", { name: "Beispiel ansehen" })).toBeNull();
  });

  it("offers the Vorlage, then the drawing, and compares only with both", async () => {
    render(<QuickCompare deps={makeDeps()} />);
    const labels = screen.getAllByText(/^(Vorlage|Deine Zeichnung)$/).map((e) => e.textContent);
    expect(labels).toEqual(["Vorlage", "Deine Zeichnung"]);
    expect(screen.getByText(/Ohne Konto, ohne Netz, ohne KI/)).toBeTruthy();
    expect((button("Vergleichen") as HTMLButtonElement).disabled).toBe(true);
    pick("Zeichnung", png("zeichnung.png"));
    expect(await screen.findByText("zeichnung.png")).toBeTruthy();
    expect(screen.getByText("Ändern")).toBeTruthy();
  });

  it("opens the editor once both images are loaded and returns to the cards", async () => {
    await loadBoth(makeDeps());
    expect(screen.queryByRole("navigation")).toBeNull();
    fireEvent.click(button("Zurück zu den Bildern"));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(button("Vergleichen"));
    expect(screen.getByRole("dialog", { name: "Vergleich" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("refuses oversized and unsupported files with an explanation", async () => {
    render(<QuickCompare deps={makeDeps()} />);
    pick("Zeichnung", new File(["x"], "notes.txt", { type: "text/plain" }));
    expect(await screen.findByText(/Datei nicht lesbar/)).toBeTruthy();
    const big = png();
    Object.defineProperty(big, "size", { value: 80 * 1024 * 1024 });
    pick("Zeichnung", big);
    expect(await screen.findByText("Bitte eine Datei unter 70 MB wählen.")).toBeTruthy();
  });

  it("explains HEIC and password PDF failures", async () => {
    const deps = makeDeps({ decode: vi.fn(async () => Promise.reject(new Error("decode"))) });
    render(<QuickCompare deps={deps} />);
    pick("Zeichnung", new File(["x"], "IMG_1.HEIC", { type: "" }));
    expect(await screen.findByText(/HEIC-Foto/)).toBeTruthy();
    cleanup();
    render(
      <QuickCompare
        deps={makeDeps({ renderPdf: vi.fn(async () => Promise.reject(new PdfPasswordError())) })}
      />,
    );
    pick("Vorlage", new File(["x"], "scan.pdf", { type: "application/pdf" }));
    expect(await screen.findByText(/Passwortgeschützte PDF/)).toBeTruthy();
  });

  it("asks for the page of a multi-page PDF", async () => {
    const renderPdf = vi.fn(
      async (_data: ArrayBuffer, choose: (n: number) => Promise<number | null>) => {
        const page = await choose(3);
        return page === null ? null : { blob: new Blob(["p"]), page, count: 3 };
      },
    );
    render(<QuickCompare deps={makeDeps({ renderPdf })} />);
    pick("Vorlage", new File(["x"], "scan.pdf", { type: "application/pdf" }));
    const dialog = await screen.findByRole("dialog", { name: "Welche Seite?" });
    fireEvent.change(dialog.querySelector("input") as HTMLInputElement, { target: { value: "2" } });
    fireEvent.click(button("Seite laden"));
    expect(await screen.findByText(/scan\.pdf · 2\/3/)).toBeTruthy();
    pick("Zeichnung", new File(["x"], "b.pdf", { type: "application/pdf" }));
    await screen.findByRole("dialog", { name: "Welche Seite?" });
    fireEvent.click(button("Schließen"));
    expect(await screen.findByText("Laden abgebrochen.")).toBeTruthy();
  });

  it("guards a second import while one is running", async () => {
    let finish: (value: never) => void = () => {};
    const decode = vi.fn(
      () =>
        new Promise<never>((resolve) => {
          finish = resolve;
        }),
    );
    render(<QuickCompare deps={makeDeps({ decode })} />);
    pick("Zeichnung", png());
    await screen.findByText("Datei wird auf deinem Gerät geladen …");
    expect((screen.getByLabelText("Zeichnung wählen") as HTMLInputElement).disabled).toBe(true);
    finish(undefined as never);
  });

  it("replaces an image and releases the previous bitmap", async () => {
    const first = { width: 1000, height: 500, close: vi.fn() } as unknown as ImageBitmap;
    const decoded = (b: ImageBitmap) => ({
      bitmap: b,
      width: 1000,
      height: 500,
      sourceWidth: 1000,
      sourceHeight: 500,
    });
    const decode = vi
      .fn()
      .mockResolvedValueOnce(decoded(first))
      .mockResolvedValue(decoded(bitmap()));
    render(<QuickCompare deps={makeDeps({ decode })} />);
    pick("Zeichnung", png("one.png"));
    await screen.findByText("one.png");
    pick("Zeichnung", png("two.png"));
    await screen.findByText("two.png");
    expect(first.close).toHaveBeenCalled();
  });

  it("explains the app and its gestures from the menu", () => {
    render(<QuickCompare deps={makeDeps()} />);
    fireEvent.click(button("Mehr"));
    expect(screen.getByRole("dialog", { name: "Über NextStroke" })).toBeTruthy();
    fireEvent.click(button("Gesten anzeigen"));
    expect(screen.getByRole("dialog", { name: "Gesten" })).toBeTruthy();
    fireEvent.click(button("Schließen"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("editor: comparing", () => {
  it("sets the Vorlage opacity, resets it with a double tap, and undoes the change", async () => {
    await loadBoth(makeDeps());
    expect((button("Rückgängig") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.pointerDown(slider());
    fireEvent.change(slider(), { target: { value: "30" } });
    expect(screen.getByText("30 %")).toBeTruthy();
    fireEvent.click(button("Rückgängig"));
    expect(slider().value).toBe("50");
    fireEvent.click(button("Wiederholen"));
    expect(slider().value).toBe("30");
    fireEvent.pointerUp(slider(), { timeStamp: 1000 });
    fireEvent.pointerUp(slider(), { timeStamp: 1100 });
    expect(slider().value).toBe("50");
  });

  it("shows only the drawing with the eye toggle, a tap, Space, or while held", async () => {
    await loadBoth(makeDeps({ now: () => performance.now() }));
    const eye = button("Nur Zeichnung zeigen");
    fireEvent.click(eye);
    expect(eye.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByText("Nur Zeichnung")).toBeTruthy();
    tap(1, 10, 10);
    expect(screen.queryByText("Nur Zeichnung")).toBeNull();
    fireEvent.keyDown(stage(), { key: " " });
    expect(screen.getByText("Nur Zeichnung")).toBeTruthy();
    fireEvent.keyDown(stage(), { key: " " });
    fireEvent.pointerDown(stage(), { pointerId: 2, clientX: 50, clientY: 50 });
    // The hold timer (280 ms) fires on its own clock; wait for it rather than a fixed time.
    expect(await screen.findByText("Nur Zeichnung")).toBeTruthy();
    fireEvent.pointerUp(stage(), { pointerId: 2 });
    expect(screen.queryByText("Nur Zeichnung")).toBeNull();
  });

  it("zooms with the capsule, wheel and keys, and fits back", async () => {
    await loadBoth(makeDeps());
    const fit = button("Einpassen") as HTMLButtonElement;
    expect(fit.disabled).toBe(true);
    fireEvent.click(button("Vergrößern"));
    expect(fit.textContent).toBe("150 %");
    fireEvent.click(button("Verkleinern"));
    fireEvent.wheel(stage(), { deltaY: -1 });
    fireEvent.wheel(stage(), { deltaY: 1 });
    for (const key of ["+", "=", "-", "x", "+"]) fireEvent.keyDown(stage(), { key });
    expect(fit.disabled).toBe(false);
    fireEvent.click(fit);
    expect(fit.textContent).toBe("100 %");
    fireEvent.keyDown(stage(), { key: "+" });
    fireEvent.keyDown(stage(), { key: "0" });
    expect(fit.textContent).toBe("100 %");
  });

  it("pans with one finger and ends a cancelled pointer without a tap", async () => {
    await loadBoth(makeDeps());
    fireEvent.pointerDown(stage(), { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(stage(), { pointerId: 1, clientX: 60, clientY: 40 });
    fireEvent.pointerCancel(stage(), { pointerId: 1 });
    expect(screen.queryByText("Nur Zeichnung")).toBeNull();
  });

  it("splits the view, moves the divider by slider and by drag, and ends", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Teilen" }));
    expect(screen.getByRole("button", { name: "Teilen" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("slider", { name: "Trennlinie" })).toBeTruthy();
    fireEvent.change(slider(), { target: { value: "20" } });
    // The 1000 × 500 drawing fills the 400 × 200 stage: the divider sits at x = 80.
    drag(4, [85, 150], [300, 150]);
    expect(slider().value).toBe("75");
    tap(5, 10, 10);
    expect(screen.getByText("Nur Zeichnung")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Überlagern" }));
    expect(screen.getByRole("slider", { name: "Deckkraft der Vorlage" })).toBeTruthy();
  });

  it("exports the current view by share and the untouched drawing by saving", async () => {
    const deps = makeDeps();
    await loadBoth(deps);
    fireEvent.click(button("Exportieren"));
    const sheet = screen.getByRole("dialog", { name: "Exportieren" });
    fireEvent.click(within(sheet).getByRole("button", { name: "Teilen" }));
    await waitFor(() => expect(deps.share).toHaveBeenCalled());
    const shared = vi.mocked(deps.share).mock.calls[0]?.[0] as File;
    expect(shared.name).toBe("Vergleich.jpg");
    fireEvent.click(within(sheet).getByLabelText("Nur Zeichnung"));
    fireEvent.click(within(sheet).getByRole("button", { name: "Bild sichern" }));
    await waitFor(() => expect(deps.download).toHaveBeenCalled());
    const drawing = vi.mocked(deps.download).mock.calls[0]?.[0] as File;
    expect(drawing.name).toBe("zeichnung.png");
    fireEvent.click(within(sheet).getByLabelText("Nur Vorlage"));
    fireEvent.click(within(sheet).getByRole("button", { name: "Bild sichern" }));
    await waitFor(() => expect(vi.mocked(deps.download).mock.calls.length).toBe(2));
    const vorlage = vi.mocked(deps.download).mock.calls[1]?.[0] as File;
    expect(vorlage.name).toBe("vorlage.png");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Exportieren" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Vergleich" })).toBeTruthy();
  });

  it("reports an export the browser cannot encode", async () => {
    await loadBoth(
      makeDeps({ renderBlob: vi.fn(async () => Promise.reject(new Error("encode"))) }),
    );
    fireEvent.click(button("Exportieren"));
    const sheet = screen.getByRole("dialog", { name: "Exportieren" });
    fireEvent.click(within(sheet).getByRole("button", { name: "Teilen" }));
    expect(await screen.findByText(/Exportieren nicht möglich/)).toBeTruthy();
  });

  it("ends a hold when the window loses focus", async () => {
    await loadBoth(makeDeps({ now: () => performance.now() }));
    fireEvent.pointerDown(stage(), { pointerId: 2, clientX: 50, clientY: 50 });
    await screen.findByText("Nur Zeichnung");
    await act(async () => window.dispatchEvent(new Event("blur")));
    expect(screen.queryByText("Nur Zeichnung")).toBeNull();
  });

  it("fades messages over the image", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await loadBoth(makeDeps());
      expect(await screen.findByText(/Nicht automatisch ausgerichtet/)).toBeTruthy();
      await act(async () => vi.advanceTimersByTime(4100));
      expect(screen.queryByText(/Nicht automatisch ausgerichtet/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows one hint per mode until it is closed", async () => {
    const hints = { seen: vi.fn(() => false), dismiss: vi.fn() };
    await loadBoth(makeDeps({ hints }));
    expect(screen.getByText(/zwei Finger: zoomen/)).toBeTruthy();
    hints.seen.mockReturnValue(true);
    fireEvent.click(button("Hinweis schließen"));
    expect(hints.dismiss).toHaveBeenCalledWith("compare");
    expect(screen.queryByText(/zwei Finger: zoomen/)).toBeNull();
  });

  it("hides and restores the controls, keeps the screen on, swaps and resets from the menu", async () => {
    const keepAwake = vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await loadBoth(makeDeps({ keepAwake }));
    const menu = () => {
      fireEvent.click(button("Mehr"));
      return screen.getByRole("menu");
    };
    fireEvent.click(within(menu()).getByRole("menuitem", { name: "Bildschirm anlassen" }));
    expect(await screen.findByText("Bildschirm bleibt an")).toBeTruthy();
    fireEvent.click(within(menu()).getByRole("menuitem", { name: "Bildschirm anlassen" }));
    expect(await screen.findByText(/geht in diesem Browser nicht/)).toBeTruthy();
    fireEvent.change(slider(), { target: { value: "80" } });
    fireEvent.click(within(menu()).getByRole("menuitem", { name: "Alles zurücksetzen" }));
    expect(slider().value).toBe("50");
    fireEvent.click(within(menu()).getByRole("menuitem", { name: "Bilder tauschen" }));
    fireEvent.click(within(menu()).getByRole("menuitem", { name: "Gesten" }));
    expect(screen.getByRole("dialog", { name: "Gesten" })).toBeTruthy();
    fireEvent.click(button("Schließen"));
    fireEvent.click(within(menu()).getByRole("menuitem", { name: "Bedienelemente ausblenden" }));
    expect(screen.queryByRole("button", { name: "Rückgängig" })).toBeNull();
    fireEvent.click(button("Bedienelemente einblenden"));
    expect(button("Rückgängig")).toBeTruthy();
    fireEvent.click(button("Mehr"));
    fireEvent.click(document.querySelector(".ns-scrim") as Element);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("editor: aligning", () => {
  it("moves, scales and rotates the Vorlage in fine and coarse steps", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    expect(screen.getByRole("heading", { name: "Feinjustieren" })).toBeTruthy();
    for (const name of ["Nach oben", "Nach unten", "Nach links", "Nach rechts"])
      fireEvent.click(button(name));
    fireEvent.click(button("Vorlage vergrößern"));
    expect(screen.getByText("100,2 %")).toBeTruthy();
    fireEvent.click(button("Nach rechts drehen"));
    expect(screen.getByText("0,1°")).toBeTruthy();
    fireEvent.click(button("Schrittweite fein, 1 Pixel"));
    expect(screen.getByText("10 px")).toBeTruthy();
    fireEvent.click(button("Vorlage verkleinern"));
    fireEvent.click(button("Nach links drehen"));
    expect(screen.getByText("98,2 %")).toBeTruthy();
    expect(screen.getByText("-0,9°")).toBeTruthy();
    fireEvent.click(button("Schrittweite grob, 10 Pixel"));
    fireEvent.change(slider(), { target: { value: "40" } });
    fireEvent.click(button("Zurücksetzen"));
    expect(screen.getByText("100,0 %")).toBeTruthy();
    fireEvent.click(button("Vorlage vergrößern"));
    fireEvent.click(button("Fertig"));
    expect(screen.getByRole("tab", { name: /Ausrichten/ }).querySelector(".ns-dot")).toBeTruthy();
  });

  it("moves the Vorlage by gesture, and cancel restores it", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    drag(1, [10, 10], [60, 10]);
    fireEvent.click(button("Vorlage vergrößern"));
    fireEvent.click(button("Abbrechen"));
    expect(screen.getByRole("tab", { name: /Ausrichten/ }).querySelector(".ns-dot")).toBeNull();
  });

  it("zooms the view with two fingers while aligning, leaving nothing to undo (D-059)", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    expect(screen.getByRole("button", { name: "Abbrechen" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Exportieren" })).toBeNull();
    fireEvent.pointerDown(stage(), { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage(), { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(stage(), { pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(stage(), { pointerId: 2 });
    fireEvent.pointerUp(stage(), { pointerId: 1 });
    expect((button("Einpassen") as HTMLButtonElement).disabled).toBe(false);
    expect((button("Rückgängig") as HTMLButtonElement).disabled).toBe(true);
    drag(3, [100, 100], [160, 120]);
    expect((button("Rückgängig") as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button("Fertig"));
    expect(button("Exportieren")).toBeTruthy();
  });

  it("keeps the alignment when auto-align finds no safe match", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Automatisch ausrichten"));
    await screen.findByText("Keine sichere Ausrichtung – manuell weiter ausrichten.");
  });

  it("applies an accepted correlation alignment", async () => {
    const pattern = (w: number, h: number) => {
      const data = new Float32Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) data[y * w + x] = 0.5 + 0.4 * Math.sin(x / 5) * Math.cos(y / 7);
      return { data, width: w, height: h };
    };
    await loadBoth(makeDeps({ gray: vi.fn((_img, w: number, h: number) => pattern(w, h)) }));
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Automatisch ausrichten"));
    expect(
      await screen.findByText("Am Bildinhalt ausgerichtet. Prüfe die Kanten bei 50 %."),
    ).toBeTruthy();
  });
});

describe("editor: paper corners on both images", () => {
  async function toCorners(deps: CompareDeps) {
    await loadBoth(deps);
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Ecken setzen"));
    expect(screen.getByText("Ecken 1/2")).toBeTruthy();
  }

  it("places corners on the Vorlage, then on the drawing, and warps", async () => {
    const deps = makeDeps();
    await toCorners(deps);
    expect(screen.queryByRole("button", { name: "Vergrößern" })).toBeNull();
    // At 0.85× the 400 × 200 image spans (30, 15)–(370, 185): ring 1 is at (30, 15).
    drag(2, [40, 25], [60, 40]);
    fireEvent.click(button("Ecke 3 unten rechts wählen"));
    expect(button("Ecke 3 unten rechts wählen").getAttribute("aria-pressed")).toBe("true");
    for (const name of ["oben", "unten", "links", "rechts"])
      fireEvent.click(button(`Ecke nach ${name}`));
    fireEvent.click(button("Schrittweite fein, 1 Pixel"));
    expect(button("Schrittweite grob, 10 Pixel")).toBeTruthy();
    fireEvent.click(button("Ganzes Bild"));
    fireEvent.click(button("Zurücksetzen"));
    expect(deps.fromRgba).not.toHaveBeenCalled();
    fireEvent.click(button("Weiter"));
    expect(screen.getByText("Ecken 2/2")).toBeTruthy();
    await waitFor(() => expect(deps.fromRgba).toHaveBeenCalledTimes(1));
    drag(3, [368, 17], [340, 40]);
    await waitFor(() => expect(deps.fromRgba).toHaveBeenCalledTimes(2));
    fireEvent.click(button("Zurück"));
    expect(screen.getByText("Ecken 1/2")).toBeTruthy();
    fireEvent.click(button("Weiter"));
    fireEvent.click(button("Fertig"));
    // Back in Ausrichten, where the corners came from; its "Fertig" returns to comparing.
    expect(screen.getByRole("heading", { name: "Feinjustieren" })).toBeTruthy();
    expect(button("Ecken ändern")).toBeTruthy();
    expect(slider().value).toBe("50");
    fireEvent.click(button("Fertig"));
    expect(screen.getByRole("tab", { name: /Ausrichten/ }).querySelector(".ns-dot")).toBeTruthy();
  });

  it("pans instead of tapping while placing corners", async () => {
    await toCorners(makeDeps());
    tap(1, 200, 100);
    fireEvent.keyDown(stage(), { key: " " });
    expect(screen.getByText("Ecken 1/2")).toBeTruthy();
  });

  it("warns instead of warping when corners cross", async () => {
    const deps = makeDeps();
    await toCorners(deps);
    fireEvent.click(button("Weiter"));
    await waitFor(() => expect(deps.fromRgba).toHaveBeenCalledTimes(1));
    drag(3, [32, 17], [420, 220]);
    expect(await screen.findByText(/Ecken überkreuzen sich/)).toBeTruthy();
    expect(deps.fromRgba).toHaveBeenCalledTimes(1);
  });

  it("cancels the corners back to Ausrichten, and Ausrichten back to before", async () => {
    await toCorners(makeDeps());
    fireEvent.click(button("Weiter"));
    fireEvent.click(button("Fertig"));
    fireEvent.click(button("Ecken ändern"));
    fireEvent.click(button("Abbrechen"));
    expect(screen.getByRole("heading", { name: "Feinjustieren" })).toBeTruthy();
    expect(button("Ecken ändern")).toBeTruthy();
    fireEvent.click(button("Abbrechen"));
    expect(screen.getByRole("tab", { name: /Ausrichten/ }).querySelector(".ns-dot")).toBeNull();
  });
});

describe("editor: opencv.js vision (D-055, D-056)", () => {
  it("aligns a new pair by its content first when the editor opens", async () => {
    const vision = fakeVision({
      align: vi.fn(async () => ({
        accepted: true as const,
        corners: paper(0.1).corners,
        confidence: 0.7,
      })),
    });
    await loadBoth(makeDeps({ vision }));
    expect(
      await screen.findByText("Am Bildinhalt ausgerichtet. Prüfe die Kanten bei 50 %."),
    ).toBeTruthy();
    expect(vision.detectPaper).not.toHaveBeenCalled();
  });

  it("falls back to sure paper corners, and to a hint otherwise", async () => {
    const sure = vi.fn().mockResolvedValueOnce(paper(0.1, 0.97)).mockResolvedValueOnce(null);
    const deps = makeDeps({ vision: fakeVision({ detectPaper: sure }) });
    await loadBoth(deps);
    expect(await screen.findByText("Automatisch an den Blattecken ausgerichtet")).toBeTruthy();
    await waitFor(() => expect(deps.fromRgba).toHaveBeenCalled());
    cleanup();
    // A guess (here from straight lines) is never applied without the user seeing it.
    const guess = vi.fn(async () => paper(0.1, 0.9));
    await loadBoth(makeDeps({ vision: fakeVision({ detectPaper: guess }) }));
    expect(await screen.findByText(/Nicht automatisch ausgerichtet/)).toBeTruthy();
    cleanup();
    const offline = fakeVision({ load: vi.fn(async () => ({ ok: false, ms: 0 })) });
    await loadBoth(makeDeps({ vision: offline }));
    expect(await screen.findByText(/Nicht automatisch ausgerichtet/)).toBeTruthy();
    expect(offline.detectPaper).not.toHaveBeenCalled();
  });

  it("places the drawing's corners through the content alignment, else from the paper", async () => {
    const align = vi
      .fn()
      .mockResolvedValueOnce(null) // on opening
      .mockResolvedValueOnce({ accepted: true, corners: paper(0.1).corners, confidence: 0.7 })
      .mockResolvedValue(null);
    const detectPaper = vi.fn(async () => paper(0.2, 0.85));
    await loadBoth(makeDeps({ vision: fakeVision({ align, detectPaper }) }));
    await screen.findByText(/Nicht automatisch ausgerichtet/);
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Ecken setzen"));
    fireEvent.click(button("Weiter"));
    expect(await screen.findByText("Ecken aus dem Bildinhalt übernommen")).toBeTruthy();
    expect(screen.queryByText("Ecken prüfen")).toBeNull();
    fireEvent.click(button("Automatisch"));
    expect(await screen.findByText("Blattecken erkannt")).toBeTruthy();
    expect(screen.getByText("Ecken prüfen")).toBeTruthy();
  });

  it("flags only the rings it could not confirm, and snaps a dropped ring (D-061)", async () => {
    const guess = paper(0.2, 0.85);
    const [c1, c2, , c4] = guess.corners;
    const corners = vi
      .fn()
      .mockResolvedValueOnce([c1, c2, null, c4]) // the check of the guess: ring 3 unclear
      .mockResolvedValueOnce([{ x: 0.78, y: 0.79 }]); // ring 3 dropped near a paper corner
    const detectPaper = vi.fn(async () => guess);
    await loadBoth(makeDeps({ vision: fakeVision({ detectPaper, corners }) }));
    await screen.findByText(/Nicht automatisch ausgerichtet/);
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Ecken setzen"));
    expect(await screen.findByText("Ecke 3 prüfen")).toBeTruthy();
    expect(corners).toHaveBeenCalledWith(expect.anything(), guess.corners, [0, 1, 2, 3]);
    // Ring 3 sits at (302, 151); moving it makes it the user's, so the flag goes.
    drag(4, [302, 151], [300, 150]);
    expect(screen.queryByText("Ecke 3 prüfen")).toBeNull();
    expect(await screen.findByText("An der Blattecke eingerastet")).toBeTruthy();
    expect(corners).toHaveBeenLastCalledWith(expect.anything(), expect.any(Array), [2]);
  });

  it("names several rings to check", async () => {
    const guess = paper(0.2, 0.85);
    const corners = vi.fn(async () => [null, guess.corners[1], null, guess.corners[3]]);
    await loadBoth(
      makeDeps({ vision: fakeVision({ detectPaper: vi.fn(async () => guess), corners }) }),
    );
    await screen.findByText(/Nicht automatisch ausgerichtet/);
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Ecken setzen"));
    expect(await screen.findByText("Ecken 1 und 3 prüfen")).toBeTruthy();
    fireEvent.click(button("Ecke 1 oben links wählen"));
    expect(screen.getByText("Ecke 3 prüfen")).toBeTruthy();
  });

  it("pre-places detected corners in the corner steps and re-detects on request", async () => {
    let loaded: (value: { ok: boolean; ms: number }) => void = () => {};
    const loading = new Promise<{ ok: boolean; ms: number }>((resolve) => {
      loaded = resolve;
    });
    // Opening the corner step before opencv.js is ready stops the automatic alignment, so the
    // first detection is the Vorlage's in corner step 1, the second the "Automatisch" button's.
    const detectPaper = vi.fn().mockResolvedValueOnce(paper(0.2)).mockResolvedValueOnce(null);
    const vision = fakeVision({ load: vi.fn(() => loading), detectPaper });
    await loadBoth(makeDeps({ vision }));
    expect(await screen.findByText("Bilderkennung wird geladen …")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Ecken setzen"));
    await act(async () => loaded({ ok: true, ms: 5 }));
    expect(await screen.findByText("Blattecken erkannt")).toBeTruthy();
    // The detected bottom-right corner (0.8, 0.8) sits at (302, 151).
    drag(4, [302, 151], [300, 150]);
    expect(button("Ecke 3 unten rechts wählen").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(button("Automatisch"));
    expect(await screen.findByText(/Blatt nicht erkannt/)).toBeTruthy();
  });

  it("uses an unsure paper guess only on request, and only as the last resort", async () => {
    const detectPaper = vi.fn(async () => paper(0.1, 0.85));
    await loadBoth(makeDeps({ vision: fakeVision({ detectPaper }) }));
    await screen.findByText(/Nicht automatisch ausgerichtet/);
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Automatisch ausrichten"));
    expect(await screen.findByText(/An vermuteten Blattecken ausgerichtet/)).toBeTruthy();
    fireEvent.click(button("Ecken ändern"));
    fireEvent.click(button("Weiter"));
    expect(screen.getByText("Ecken prüfen")).toBeTruthy();
  });

  it("aligns with the feature homography first, then the correlation search", async () => {
    const align = vi
      .fn()
      .mockResolvedValueOnce(null) // on opening
      .mockResolvedValueOnce({ accepted: true, corners: paper(0.1).corners, confidence: 0.6 })
      .mockResolvedValue(null);
    const deps = makeDeps({ vision: fakeVision({ align }) });
    await loadBoth(deps);
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Automatisch ausrichten"));
    expect(
      await screen.findByText("Am Bildinhalt ausgerichtet. Prüfe die Kanten bei 50 %."),
    ).toBeTruthy();
    expect(deps.gray).not.toHaveBeenCalled();
    fireEvent.click(button("Abbrechen"));
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Automatisch ausrichten"));
    await screen.findByText("Keine sichere Ausrichtung – manuell weiter ausrichten.");
    expect(deps.gray).toHaveBeenCalled();
  });

  it("falls back to the full content alignment when the drawing sits differently", async () => {
    const align = vi
      .fn()
      .mockResolvedValueOnce(null) // on opening
      .mockResolvedValueOnce(null) // corner step 2
      .mockResolvedValueOnce({ accepted: true, corners: paper(0.1).corners, confidence: 0.6 });
    const refine = vi.fn(async () => ({
      accepted: false as const,
      reason: "few-inliers" as const,
    }));
    await loadBoth(makeDeps({ vision: fakeVision({ align, refine }) }));
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Ecken setzen"));
    fireEvent.click(button("Weiter"));
    fireEvent.click(button("Fertig"));
    expect(await screen.findByText(/die Ecken der Vorlage bleiben/)).toBeTruthy();
    // The small correction was tried before and after the full alignment.
    expect(refine).toHaveBeenCalledTimes(2);
  });

  it("keeps placed corners and corrects the rest by content (D-060)", async () => {
    // The Vorlage warped by the corners still sits 2 % left of the drawing.
    const shifted = [
      { x: 0.02, y: 0 },
      { x: 1.02, y: 0 },
      { x: 1.02, y: 1 },
      { x: 0.02, y: 1 },
    ];
    const refine = vi
      .fn()
      .mockResolvedValueOnce({ accepted: true, corners: shifted, confidence: 0.7 })
      .mockResolvedValueOnce({ accepted: true, corners: paper(0.3).corners, confidence: 0.7 });
    await loadBoth(makeDeps({ vision: fakeVision({ refine }) }));
    fireEvent.click(screen.getByRole("tab", { name: /Ausrichten/ }));
    fireEvent.click(button("Ecken setzen"));
    fireEvent.click(button("Weiter"));
    fireEvent.click(button("Fertig"));
    expect(await screen.findByText(/Am Bildinhalt nachjustiert/)).toBeTruthy();
    expect((button("Rückgängig") as HTMLButtonElement).disabled).toBe(false);
    // A big jump is not a correction: the corners stay.
    fireEvent.click(button("Automatisch ausrichten"));
    expect(await screen.findByText(/kein sicherer Feinabgleich/)).toBeTruthy();
    expect(refine).toHaveBeenCalledTimes(2);
  });
});
