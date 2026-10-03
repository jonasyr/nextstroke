// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { PdfPasswordError } from "./pdf.ts";
import { type CompareDeps, QuickCompare } from "./QuickCompare.tsx";

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() => null) as never;
});
afterEach(cleanup);

const bitmap = (width = 1000, height = 500) =>
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
  await screen.findByText("Bild geladen. Automatisch oder manuell ausrichten.");
  pick("Referenz wählen", png("referenz.png"));
  await screen.findByText("ÜBERLAGERUNG");
}

describe("Quick Compare page", () => {
  it("starts with two pickers and no account, network or AI", () => {
    render(<QuickCompare deps={makeDeps()} />);
    expect(screen.getByLabelText("Original wählen")).toBeTruthy();
    expect(screen.getByText(/bleiben auf diesem Gerät/)).toBeTruthy();
  });

  it("shows the comparison once both images are loaded and follows the opacity controls", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Referenz" }));
    expect(screen.getByText("REFERENZ")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Original" }));
    expect(screen.getByText("ORIGINAL · TIPPEN ZUM VERGLEICH")).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Deckkraft der Referenz/), { target: { value: "30" } });
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Original halten" }));
    expect(screen.getByText("ORIGINAL · TIPPEN ZUM VERGLEICH")).toBeTruthy();
    fireEvent.pointerUp(screen.getByRole("button", { name: "Original halten" }));
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
  });

  it("toggles the original with a tap on the workspace and with Space", async () => {
    await loadBoth(makeDeps());
    const workspace = screen.getByLabelText(/Vergleichsfläche/);
    fireEvent.pointerDown(workspace, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(workspace, { pointerId: 1 });
    expect(screen.getByText("ORIGINAL · TIPPEN ZUM VERGLEICH")).toBeTruthy();
    fireEvent.keyDown(workspace, { key: " " });
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
  });

  it("aligns manually with buttons and resets", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    fireEvent.click(screen.getByRole("tab", { name: "Drehung" }));
    fireEvent.click(screen.getByRole("button", { name: "Mehr" }));
    expect(screen.getByText("0.05°")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Zurücksetzen" }));
    expect(screen.getByText("0.00°")).toBeTruthy();
    expect(screen.getByText("Ausrichtung zurückgesetzt.")).toBeTruthy();
  });

  it("keeps the user's alignment when auto-align finds no safe match", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    fireEvent.click(screen.getByRole("button", { name: "Automatisch ausrichten" }));
    await screen.findByText("Kein sicherer Abgleich. Bitte manuell ausrichten.");
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
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("reports an export the browser cannot encode", async () => {
    await loadBoth(
      makeDeps({ renderBlob: vi.fn(async () => Promise.reject(new Error("encode"))) }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));
    fireEvent.click(screen.getByRole("button", { name: "Vergleich als PNG" }));
    expect(await screen.findByText(/Speichern nicht möglich/)).toBeTruthy();
  });

  it("keeps settings when entering and leaving immersive mode", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Referenz" }));
    fireEvent.click(screen.getByRole("button", { name: "Vollbild" }));
    expect(screen.getByRole("dialog", { name: "Vollbild" })).toBeTruthy();
    expect(screen.getByText("REFERENZ")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("REFERENZ")).toBeTruthy();
  });

  it("ends a hold when the window loses focus", async () => {
    await loadBoth(makeDeps());
    fireEvent.pointerDown(screen.getByRole("button", { name: "Original halten" }));
    await act(async () => window.dispatchEvent(new Event("blur")));
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
  });
});

describe("Quick Compare view and alignment controls", () => {
  it("zooms with buttons, wheel and keys, and fits back", async () => {
    await loadBoth(makeDeps());
    const workspace = screen.getByLabelText(/Vergleichsfläche/);
    fireEvent.click(screen.getByRole("button", { name: "Vergrößern" }));
    fireEvent.click(screen.getByRole("button", { name: "Verkleinern" }));
    fireEvent.wheel(workspace, { deltaY: -1 });
    fireEvent.wheel(workspace, { deltaY: 1 });
    for (const key of ["+", "=", "-", "0", "x"]) fireEvent.keyDown(workspace, { key });
    fireEvent.click(screen.getByRole("button", { name: "Einpassen" }));
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
  });

  it("pans with one finger and ends a cancelled pointer without a tap", async () => {
    await loadBoth(makeDeps());
    const workspace = screen.getByLabelText(/Vergleichsfläche/);
    fireEvent.pointerDown(workspace, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(workspace, { pointerId: 1, clientX: 60, clientY: 40 });
    fireEvent.pointerCancel(workspace, { pointerId: 1 });
    expect(screen.getByText("ÜBERLAGERUNG")).toBeTruthy();
  });

  it("moves the reference by gesture while aligning, and can switch that off", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    const workspace = screen.getByLabelText(/Vergleichsfläche/);
    fireEvent.pointerDown(workspace, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(workspace, { pointerId: 1, clientX: 60, clientY: 10 });
    fireEvent.pointerUp(workspace, { pointerId: 1 });
    expect(
      screen.getByRole("tab", { name: "Horizontale Position" }).getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.queryByText("0.00 %")).toBeNull();
    fireEvent.click(screen.getByLabelText("Gesten verschieben die Referenz"));
    expect(
      (screen.getByLabelText("Gesten verschieben die Referenz") as HTMLInputElement).checked,
    ).toBe(false);
  });

  it("sets a parameter with its slider and formats each unit", async () => {
    await loadBoth(makeDeps());
    fireEvent.click(screen.getByRole("button", { name: "Ausrichten" }));
    fireEvent.click(screen.getByRole("tab", { name: "Größe" }));
    fireEvent.change(screen.getByRole("slider", { name: "Größe" }), { target: { value: "1.5" } });
    expect(screen.getByText("150.0 %")).toBeTruthy();
    expect(screen.getByText("Größe angepasst.")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Vertikale Position" }));
    fireEvent.click(screen.getByRole("button", { name: "Weniger" }));
    expect(screen.getByText("-0.05 %")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Vergleich" }));
    expect(screen.queryByRole("tab")).toBeNull();
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

  it("shows the original from inside immersive mode and holds with the keyboard", async () => {
    await loadBoth(makeDeps());
    const hold = screen.getByRole("button", { name: "Original halten" });
    fireEvent.keyDown(hold, { key: "Enter" });
    expect(screen.getByText("ORIGINAL · TIPPEN ZUM VERGLEICH")).toBeTruthy();
    fireEvent.keyUp(hold, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Vollbild" }));
    const immersive = screen.getByRole("dialog", { name: "Vollbild" });
    fireEvent.click(within(immersive).getByRole("button", { name: "Original" }));
    expect(within(immersive).getByRole("button", { name: "Vergleich" })).toBeTruthy();
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
