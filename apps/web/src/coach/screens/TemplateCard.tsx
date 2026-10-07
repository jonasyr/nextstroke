import { t } from "@nextstroke/ui";
import { Image as ImageIcon } from "lucide-react";
import { type ChangeEvent, type ReactNode, useState } from "react";
import { ICON } from "../../compare/IconButton.tsx";

const ACCEPT = "image/*,application/pdf,.pdf,.heic";

/**
 * The optional template under the drawing's photo and in the project view (D-070): add one,
 * or change or remove it. Removing asks for a second tap.
 */
export function TemplateCard({
  preview,
  busy,
  onPick,
  onRemove,
}: {
  /** The template's thumbnail; null when there is no template yet. */
  preview: ReactNode | null;
  busy: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const change = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onPick(file);
  };
  const input = {
    type: "file",
    accept: ACCEPT,
    className: "ns-hidden-input",
    "aria-label": t("guided.template.addLabel"),
    onChange: change,
    disabled: busy,
  } as const;
  return (
    <section className="ns-g-template" aria-label={t("guided.template.title")}>
      <span className="ns-g-template-thumb">{preview ?? <ImageIcon {...ICON} />}</span>
      <span className="ns-g-template-text">
        <b>{t(preview ? "guided.template.title" : "guided.template.optional")}</b>
        <small>{t(preview ? "guided.template.set" : "guided.template.hint")}</small>
        <span className="ns-g-template-actions">
          <label className="ns-text ns-accent ns-g-file">
            {t(preview ? "guided.template.change" : "guided.template.add")}
            <input {...input} />
          </label>
          {preview && (
            <button
              type="button"
              className="ns-text ns-g-danger"
              onClick={() => {
                if (!confirming) return setConfirming(true);
                setConfirming(false);
                onRemove();
              }}
            >
              {t(confirming ? "guided.template.removeConfirm" : "guided.template.remove")}
            </button>
          )}
        </span>
      </span>
    </section>
  );
}
