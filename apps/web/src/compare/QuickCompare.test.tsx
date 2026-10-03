// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PdfPasswordError } from "./pdf.ts";
import { type CompareDeps, QuickCompare } from "./QuickCompare.tsx";

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

function pick(label: string, file: File) {
  fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { files: [file] } });
}

async function loadBoth(deps: CompareDeps) {
  render(<QuickCompare deps={deps} />);
  pick("Original wählen", png("original.png"));
  await screen.findByText("Bild geladen. Jetzt das zweite Bild wählen.");
  pick("Referenz wählen", png("referenz.png"));
  await screen.findByText("ÜBERLAGERUNG");
}

const workspace = () => screen.getByLabelText(/Vergleichsfläche/);

function drag(id: number, from: [number, number], to: [number, number]) {
  fireEvent.pointerDown(workspace(), { pointerId: id, clientX: from[0], clientY: from[1] });
  fireEvent.pointerMove(workspace(), { pointerId: id, clientX: to[0], clientY: to[1] });
  fireEvent.pointerUp(workspace(), { pointerId: id });
}

describe("Quick Compare import screen", () => {
  it("starts with two image cards and no account, network or AI", () => {
    render(<QuickCompare deps={makeDeps()} />);
    expect(screen.getByLabelText("Original wählen")).toBeTruthy();
    expect(screen.getByLabelText("Referenz wählen")).toBeTruthy();
    expect(screen.getByText(/bleiben auf diesem Gerät/)).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the editor once both images are loaded and returns to the cards", async () => {
    await loadBoth(makeDeps());
    expect(screen.getByRole("dialog", { name: "Vergleich" })).toBeTruthy();
    expect(screen.getByText(/Tippe aufs Bild für das Original/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "‹ Bilder" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("✓ original.png")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Vergleichen" }));
    expect(screen.getByRole("dialog", { name: "Vergleich" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("refuses oversized and unsupported files with an explanation", async () => {
    render(<QuickCompare deps={makeDeps()} />);
    pick("Original wählen", new File(["x"], "notes.txt", { type: "text/plain" }));
    expect(await screen.findByText(/Datei nicht lesbar/)).toBeTruthy();
    const big = png();
    Object.defineProperty(big, "size", { value: 80 * 1024 * 1024 });
    pick("Original wählen", big);
    expect(await screen.findByText("Bitte eine Datei unter 70 MB wählen.")).toBeTruthy();
  });

  it("explains HEIC and password PDF failures", async () => {
    const deps = makeDeps({ decode: vi.fn(async () => Promise.reject(new Error("decode"))) });
    render(<QuickCompare deps={deps} />);
    pick("Original wählen", new File(["x"], "IMG_1.HEIC", { type: "" }));
    expect(await screen.findByText(/HEIC-Foto/)).toBeTruthy();
    cleanup();
    render(
      <QuickCompare
        deps={makeDeps({ renderPdf: vi.fn(async () => Promise.reject(new PdfPasswordError())) })}
      />,
    );
    pick("Original wählen", new File(["x"], "scan.pdf", { type: "application/pdf" }));
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
    pick("Original wählen", new File(["x"], "scan.pdf", { type: "application/pdf" }));
    const dialog = await screen.findByRole("dialog", { name: "Welche Seite?" });
    fireEvent.change(dialog.querySelector("input") as HTMLInputElement, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Seite laden" }));
    expect(await screen.findByText(/scan\.pdf · 2\/3/)).toBeTruthy();
    pick("Referenz wählen", new File(["x"], "b.pdf", { type: "application/pdf" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
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
    pick("Original wählen", png());
    await screen.findByText("Datei wird auf deinem Gerät geladen …");
    expect((screen.getByLabelText("Original wählen") as HTMLInputElement).disabled).toBe(true);
    finish(undefined as never);
  });

  it("replaces an image and releases the previous bitmap", async () => {
    const first = { width: 1000, height: 500, close: vi.fn() } as unknown as ImageBitmap;
    const decode = vi
      .fn()
      .mockResolvedValueOnce({
        bitmap: first,
        width: 1000,
        height: 500,
        sourceWidth: 1000,
        sourceHeight: 500,
      })
      .mockResolvedValue({
        bitmap: bitmap(),
        width: 1000,
        height: 500,
        sourceWidth: 1000,
        sourceHeight: 500,
      });
    render(<QuickCompare deps={makeDeps({ decode })} />);
    pick("Original wählen", png("one.png"));
    await screen.findByText(/one\.png/);
    pick("Original wählen", png("two.png"));
    await screen.findByText(/two\.png/);
    expect(first.close).toHaveBeenCalled();
  });
});

describe("Quick Compare editor: viewing", () => {
  it("follows the opacity controls and reveals the original while held", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Referenz" }));
    expect(screen.getByText("REFERENZ")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Deckkraft der Referenz/), { target: { value: "30" } });
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "50 %" }));
    expect(screen.getByText(/Deckkraft der Referenz: 50 %/)).toBeTruthy();
    const hold = screen.getByRole("button", { name: "Original halten" });
    fireEvent.pointerDown(hold);
    expect(screen.getByText("ORIGINAL · TIPPEN ZUM VERGLEICH")).toBeTruthy();
    fireEvent.pointerUp(hold);
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
    fireEvent.keyDown(hold, { key: "Enter" });
    expect(screen.getByText("ORIGINAL · TIPPEN ZUM VERGLEICH")).toBeTruthy();
    fireEvent.keyUp(hold, { key: "Enter" });
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
  });

  it("toggles the original with a tap on the image and with Space", async () => {
    await loadBoth(makeDeps());
    fireEvent.pointerDown(workspace(), { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(workspace(), { pointerId: 1 });
    expect(screen.getByText("ORIGINAL · TIPPEN ZUM VERGLEICH")).toBeTruthy();
    fireEvent.keyDown(workspace(), { key: " " });
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
  });

  it("zooms with wheel and keys and offers fitting back", async () => {
    await loadBoth(makeDeps());
    expect(screen.queryByRole("button", { name: "Einpassen" })).toBeNull();
    fireEvent.wheel(workspace(), { deltaY: -1 });
    fireEvent.wheel(workspace(), { deltaY: 1 });
    for (const key of ["+", "=", "-", "0", "x", "+"]) fireEvent.keyDown(workspace(), { key });
    fireEvent.click(screen.getByRole("button", { name: "Einpassen" }));
    expect(screen.queryByRole("button", { name: "Einpassen" })).toBeNull();
  });

  it("pans with one finger and ends a cancelled pointer without a tap", async () => {
    await loadBoth(makeDeps());
    fireEvent.pointerDown(workspace(), { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(workspace(), { pointerId: 1, clientX: 60, clientY: 40 });
    fireEvent.pointerCancel(workspace(), { pointerId: 1 });
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
  });

  it("splits the image, moves the divider by slider and by drag, and ends", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Geteilt" }));
    expect(screen.getByRole("button", { name: "Geteilt" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByText("LINKS ORIGINAL · RECHTS REFERENZ")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "50 %" })).toBeNull();
    const slider = screen.getByLabelText(/Teilung/) as HTMLInputElement;
    expect(slider.value).toBe("50");
    fireEvent.change(slider, { target: { value: "20" } });
    expect(slider.value).toBe("20");
    // The 1000 × 500 original fills the 400 × 200 workspace: the divider sits at x = 80.
    drag(4, [85, 150], [300, 150]);
    expect(slider.value).toBe("75");
    fireEvent.pointerDown(workspace(), { pointerId: 5, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(workspace(), { pointerId: 5 });
    expect(screen.getByText("ORIGINAL · TIPPEN ZUM VERGLEICH")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Überlagern" }));
    expect(screen.queryByLabelText(/Teilung/)).toBeNull();
  });

  it("exports the comparison and the untouched original through share", async () => {
    const deps = makeDeps();
    await loadBoth(deps);
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    fireEvent.click(screen.getByRole("button", { name: "Vergleich als JPEG" }));
    await waitFor(() => expect(deps.share).toHaveBeenCalled());
    const shared = vi.mocked(deps.share).mock.calls[0]?.[0] as File;
    expect(shared.name).toBe("Vergleich.jpg");
    const dialog = screen.getByRole("dialog", { name: "Speichern oder teilen" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Original" }));
    await waitFor(() => expect(vi.mocked(deps.share).mock.calls.length).toBe(2));
    const [second] = vi.mocked(deps.share).mock.calls[1] ?? [];
    expect((second as File).name).toBe("original.png");
    fireEvent.click(screen.getByRole("button", { name: "Schließen" }));
    expect(screen.queryByRole("dialog", { name: "Speichern oder teilen" })).toBeNull();
  });

  it("reports an export the browser cannot encode", async () => {
    await loadBoth(
      makeDeps({ renderBlob: vi.fn(async () => Promise.reject(new Error("encode"))) }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    fireEvent.click(screen.getByRole("button", { name: "Vergleich als PNG" }));
    expect(await screen.findByText(/Speichern nicht möglich/)).toBeTruthy();
  });

  it("ends a hold when the window loses focus", async () => {
    await loadBoth(makeDeps());
    fireEvent.pointerDown(screen.getByRole("button", { name: "Original halten" }));
    await act(async () => window.dispatchEvent(new Event("blur")));
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
  });

  it("fades messages over the image", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await loadBoth(makeDeps());
      expect(screen.getByText(/Tippe aufs Bild für das Original/)).toBeTruthy();
      await act(async () => vi.advanceTimersByTime(4100));
      expect(screen.queryByText(/Tippe aufs Bild für das Original/)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Quick Compare editor: alignment", () => {
  it("aligns with buttons and resets", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    fireEvent.click(screen.getByRole("tab", { name: "Drehung" }));
    fireEvent.click(screen.getByRole("button", { name: "Mehr" }));
    expect(screen.getByText("0.05°")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zurücksetzen" }));
    expect(screen.getByText("0.00°")).toBeTruthy();
    expect(screen.getByText("Ausrichtung zurückgesetzt.")).toBeTruthy();
  });

  it("sets a parameter with its slider, formats each unit, and closes", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    fireEvent.click(screen.getByRole("tab", { name: "Größe" }));
    fireEvent.change(screen.getByRole("slider", { name: "Größe" }), { target: { value: "1.5" } });
    expect(screen.getByText("150.0 %")).toBeTruthy();
    expect(screen.getByText("Größe angepasst.")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Vertikale Position" }));
    fireEvent.click(screen.getByRole("button", { name: "Weniger" }));
    expect(screen.getByText("-0.05 %")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("moves the reference by gesture while aligning, and can switch that off", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    drag(1, [10, 10], [60, 10]);
    expect(screen.queryByText("0.00 %")).toBeNull();
    fireEvent.click(screen.getByLabelText("Gesten verschieben die Referenz"));
    expect(
      (screen.getByLabelText("Gesten verschieben die Referenz") as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("keeps the user's alignment when auto-align finds no safe match", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    fireEvent.click(screen.getByRole("button", { name: "Automatisch ausrichten" }));
    await screen.findByText("Kein sicherer Abgleich. Bitte manuell ausrichten.");
  });

  it("applies an accepted auto-alignment", async () => {
    const pattern = (w: number, h: number) => {
      const data = new Float32Array(w * h);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) data[y * w + x] = 0.5 + 0.4 * Math.sin(x / 5) * Math.cos(y / 7);
      return { data, width: w, height: h };
    };
    await loadBoth(makeDeps({ gray: vi.fn((_img, w: number, h: number) => pattern(w, h)) }));
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    fireEvent.click(screen.getByRole("button", { name: "Automatisch ausrichten" }));
    expect(await screen.findByText("Abgeglichen. Prüfe die Kanten bei 50 %.")).toBeTruthy();
  });
});

describe("Quick Compare editor: paper corners on both images", () => {
  async function toOriginalStep(deps: CompareDeps) {
    await loadBoth(deps);
    fireEvent.click(screen.getByRole("button", { name: "Blattecken setzen" }));
    expect(screen.getByText("Blattecken 1/2: Referenz")).toBeTruthy();
    expect(screen.getByText("Blattecken 1/2: Referenz")).toBeTruthy();
  }

  it("places corners on the reference, then on the original, and warps", async () => {
    const deps = makeDeps();
    await toOriginalStep(deps);
    // At 0.85× the 400 × 200 image spans (30, 15)–(370, 185): the top-left ring is at (30, 15).
    drag(2, [32, 17], [60, 40]);
    fireEvent.click(screen.getByRole("button", { name: "Ecke unten rechts" }));
    expect(
      screen.getByRole("button", { name: "Ecke unten rechts" }).getAttribute("aria-pressed"),
    ).toBe("true");
    for (const name of ["links", "oben", "rechts", "unten"])
      fireEvent.click(screen.getByRole("button", { name: `Ecke nach ${name}` }));
    expect(deps.fromRgba).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByText("Blattecken 2/2: Original")).toBeTruthy();
    await waitFor(() => expect(deps.fromRgba).toHaveBeenCalledTimes(1));
    drag(3, [368, 17], [340, 40]);
    await waitFor(() => expect(deps.fromRgba).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Zurück" }));
    expect(screen.getByText("Blattecken 1/2: Referenz")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
    expect(screen.getByText(/Deckkraft der Referenz: 50 %/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    expect(screen.getByText(/Die Blattecken bestimmen/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Blattecken entfernen" }));
    expect(screen.getByRole("tab", { name: "Drehung" })).toBeTruthy();
  });

  it("pans instead of tapping while placing corners", async () => {
    await toOriginalStep(makeDeps());
    fireEvent.pointerDown(workspace(), { pointerId: 1, clientX: 200, clientY: 100 });
    fireEvent.pointerUp(workspace(), { pointerId: 1 });
    fireEvent.keyDown(workspace(), { key: " " });
    expect(screen.getByText("Blattecken 1/2: Referenz")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Einpassen" })).toBeNull();
    fireEvent.wheel(workspace(), { deltaY: -1 });
    fireEvent.click(screen.getByRole("button", { name: "Einpassen" }));
    expect(screen.queryByRole("button", { name: "Einpassen" })).toBeNull();
  });

  it("warns instead of warping when corners cross", async () => {
    const deps = makeDeps();
    await toOriginalStep(deps);
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    await waitFor(() => expect(deps.fromRgba).toHaveBeenCalledTimes(1));
    // Drag the original's top-left ring past its bottom-right one.
    drag(3, [32, 17], [420, 220]);
    expect(await screen.findByText(/Ecken überkreuzen sich/)).toBeTruthy();
    expect(deps.fromRgba).toHaveBeenCalledTimes(1);
  });

  it("cancels back to the alignment from before", async () => {
    await toOriginalStep(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Weiter" }));
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Blattecken setzen" })).toBeTruthy();
  });
});
