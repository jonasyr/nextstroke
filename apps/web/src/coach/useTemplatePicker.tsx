import { IMAGE_CORNERS, type Quad } from "@nextstroke/compare";
import { t } from "@nextstroke/ui";
import { useRef, useState } from "react";
import { PdfDialog } from "../compare/sheets.tsx";
import type { CoachDeps } from "./deps.ts";
import { loadPicture, type Picture, PictureError } from "./picture.ts";
import { PhotoScreen } from "./screens/PhotoScreen.tsx";
import { useCorners } from "./useCorners.ts";

const labels = () => ({
  title: t("guided.template.title"),
  back: t("nav.back"),
  next: t("guided.template.use"),
  input: t("guided.template.addLabel"),
  change: t("guided.template.change"),
  accept: "image/*,application/pdf,.pdf,.heic",
});

/**
 * Choosing a template (D-070): open a photo, image file or PDF page, then place its four corners
 * (the whole image when no sheet is found, as for a digital template). Shared by the guided flow
 * and the project view; `say` receives the status line.
 */
export function useTemplatePicker(deps: CoachDeps, say: (text: string) => void) {
  const corners = useCorners(deps.vision ?? null, say);
  const [pdfAsk, setPdfAsk] = useState<{
    count: number;
    resolve: (page: number | null) => void;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const picture = useRef<Picture | null>(null);

  /** Opens a file; true when the corner step should show. */
  const pick = async (file: File): Promise<boolean> => {
    setBusy(true);
    say(t("guided.photo.loading"));
    try {
      const loaded = await loadPicture(
        deps,
        file,
        (count) => new Promise((resolve) => setPdfAsk({ count, resolve })),
      );
      if (!loaded) {
        say(t("status.cancelled"));
        return false;
      }
      picture.current = loaded;
      corners.start(loaded.decoded.bitmap, {
        fallback: IMAGE_CORNERS,
        missing: "guided.template.whole",
      });
      return true;
    } catch (error) {
      say(t(error instanceof PictureError ? error.key : "status.unsupported"));
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** The chosen template with its corners, once the user accepts them. */
  const chosen = (): { picture: Picture; quad: Quad } | null =>
    picture.current ? { picture: picture.current, quad: corners.quad } : null;

  /** The page choice for a PDF with several pages. */
  const dialog = pdfAsk ? (
    <PdfDialog
      count={pdfAsk.count}
      onChoose={(page) => {
        pdfAsk.resolve(page);
        setPdfAsk(null);
      }}
    />
  ) : null;

  /** The corner step; `onDone` accepts, `onCancel` goes back without changing the template. */
  const screen = (status: string, onDone: () => void, onCancel: () => void) => (
    <>
      <PhotoScreen
        labels={labels()}
        image={corners.image}
        corners={corners.props}
        busy={busy}
        status={status}
        onPick={(file) => void pick(file)}
        onCancel={onCancel}
        onNext={onDone}
      />
      {dialog}
    </>
  );

  return { pick, chosen, screen, dialog, busy };
}
