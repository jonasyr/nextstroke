import type { Point, Quad } from "@nextstroke/compare";
import { t } from "@nextstroke/ui";
import { Camera } from "lucide-react";
import type { ChangeEvent } from "react";
import { ICON } from "../../compare/IconButton.tsx";
import { CornerEditor } from "../CornerEditor.tsx";
import { FlowBar, Foot } from "./parts.tsx";

export interface CornerProps {
  quad: Quad;
  unsure: number[];
  onMove: (index: number, point: Point) => void;
  onDrop: (index: number) => void;
}

const ACCEPT = "image/*";

/**
 * Step 1 of 3: a photo of the drawing, which becomes the project's immutable original, and
 * its four paper corners, from which the straight view is computed.
 */
/** Labels of the original's photo step; a checkpoint passes its own. */
const ORIGINAL = {
  title: t("guided.photo.title"),
  step: t("guided.photo.step"),
  back: t("nav.cancel"),
  next: t("guided.next"),
  input: t("guided.photo.label"),
};

export function PhotoScreen({
  image,
  corners,
  busy,
  status,
  onPick,
  onCancel,
  onNext,
  labels = ORIGINAL,
}: {
  labels?: { title: string; step?: string; back: string; next: string; input: string };
  image: ImageBitmap | null;
  corners: CornerProps | null;
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
  const input = {
    type: "file",
    accept: ACCEPT,
    className: "ns-hidden-input",
    "aria-label": labels.input,
    onChange: change,
    disabled: busy,
  } as const;
  return (
    <>
      <FlowBar
        back={onCancel}
        backLabel={labels.back}
        title={labels.title}
        {...(labels.step ? { step: labels.step } : {})}
      />
      <div className="ns-g-body">
        {image && corners ? (
          <div className="ns-group">
            <CornerEditor image={image} label={t("guided.corners.label")} {...corners} />
            <label className="ns-text ns-accent ns-g-file">
              {t("guided.photo.change")}
              <input {...input} />
            </label>
          </div>
        ) : (
          <label className="ns-g-empty">
            <Camera {...ICON} size={40} />
            <span>
              <b>{t("guided.photo.lead")}</b>
              <br />
              {t("guided.photo.hint")}
            </span>
            <span className="ns-link">{t("guided.photo.pick")}</span>
            <input {...input} />
          </label>
        )}
        <p className="ns-status" role="status" aria-live="polite">
          {status}
        </p>
      </div>
      <Foot>
        <button type="button" className="ns-primary" disabled={!image || busy} onClick={onNext}>
          {labels.next}
        </button>
      </Foot>
    </>
  );
}
