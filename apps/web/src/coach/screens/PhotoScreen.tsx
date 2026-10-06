import { t } from "@nextstroke/ui";
import { Camera } from "lucide-react";
import type { ChangeEvent } from "react";
import { ICON } from "../../compare/IconButton.tsx";
import { FlowBar, Foot } from "./parts.tsx";

/** Step 1 of 3: a photo of the drawing; it becomes the project's immutable original. */
export function PhotoScreen({
  image,
  busy,
  status,
  onPick,
  onCancel,
  onNext,
}: {
  image: ImageBitmap | null;
  busy: boolean;
  status: string;
  onPick: (file: File) => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onPick(file);
  };
  return (
    <>
      <FlowBar
        back={onCancel}
        backLabel={t("nav.cancel")}
        title={t("guided.photo.title")}
        step={t("guided.photo.step")}
      />
      <div className="ns-g-body">
        <label className="ns-g-empty" data-loaded={image ? "" : undefined}>
          {image ? (
            <PhotoPreview image={image} />
          ) : (
            <>
              <Camera {...ICON} size={40} />
              <span>
                <b>{t("guided.photo.lead")}</b>
                <br />
                {t("guided.photo.hint")}
              </span>
            </>
          )}
          <span className="ns-link">{t(image ? "guided.photo.change" : "guided.photo.pick")}</span>
          <input
            type="file"
            accept="image/*"
            className="ns-hidden-input"
            aria-label={t("guided.photo.label")}
            onChange={change}
            disabled={busy}
          />
        </label>
        <p className="ns-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
      <Foot>
        <button type="button" className="ns-primary" disabled={!image || busy} onClick={onNext}>
          {t("guided.next")}
        </button>
      </Foot>
    </>
  );
}

function PhotoPreview({ image }: { image: ImageBitmap }) {
  return (
    <canvas
      className="ns-g-photo"
      style={{ aspectRatio: String(image.width / image.height) }}
      ref={(el) => {
        const ctx = el?.getContext("2d");
        if (!el || !ctx) return;
        el.width = image.width;
        el.height = image.height;
        ctx.drawImage(image, 0, 0);
      }}
    />
  );
}
