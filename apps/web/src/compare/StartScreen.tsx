import { t } from "@nextstroke/ui";
import { Camera, Ellipsis, Image } from "lucide-react";
import type { ChangeEvent } from "react";
import { ICON, IconButton } from "./IconButton.tsx";
import { Thumb } from "./Thumb.tsx";

/** Start: one card per image, then the one prominent action "Vergleichen" (D-056). */

export type Slot = "original" | "reference";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.pdf";

/** The Vorlage (reference) comes first: it is what the drawing is compared against. */
const CARDS = [
  {
    slot: "reference",
    title: "start.vorlage.title",
    hint: "start.vorlage.hint",
    pick: "start.vorlage.pick",
    label: "start.vorlage.label",
    Icon: Image,
  },
  {
    slot: "original",
    title: "start.zeichnung.title",
    hint: "start.zeichnung.hint",
    pick: "start.zeichnung.pick",
    label: "start.zeichnung.label",
    Icon: Camera,
  },
] as const;

export interface Picked {
  name: string;
  bitmap: ImageBitmap;
}

export function StartScreen({
  images,
  busy,
  status,
  onPick,
  onOpen,
  onMore,
  onDemo,
}: {
  images: Partial<Record<Slot, Picked>>;
  busy: boolean;
  status: string;
  onPick: (slot: Slot, file: File | undefined) => void;
  onOpen: () => void;
  onMore: () => void;
  /** Opens the bundled demo pair; the link shows only when one is available. */
  onDemo?: () => void;
}) {
  const ready = Boolean(images.original && images.reference);
  const change = (slot: Slot) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    onPick(slot, file);
  };
  return (
    <div className="ns-start">
      <div className="ns-start-top">
        <span className="ns-wordmark">{t("app.name")}</span>
        <IconButton label={t("start.more")} onClick={onMore}>
          <Ellipsis {...ICON} />
        </IconButton>
      </div>
      <div>
        <h1 className="ns-lead">{t("start.lead")}</h1>
        <p className="ns-sub">{t("start.sub")}</p>
      </div>
      {CARDS.map(({ slot, title, hint, pick, label, Icon }) => {
        const image = images[slot];
        return (
          <label key={slot} className="ns-card" data-loaded={image ? "" : undefined}>
            <span className="ns-card-thumb">
              {image ? <Thumb image={image.bitmap} width={76} height={96} /> : <Icon {...ICON} />}
            </span>
            <span className="ns-card-text">
              <span className="ns-card-title">{t(title)}</span>
              <span className="ns-muted">{image ? image.name : t(hint)}</span>
              <span className="ns-link" aria-hidden="true">
                {t(image ? "start.change" : pick)}
              </span>
            </span>
            <input
              type="file"
              className="ns-hidden-input"
              aria-label={t(label)}
              accept={ACCEPT}
              onChange={change(slot)}
              disabled={busy}
            />
          </label>
        );
      })}
      <p className="ns-status" role="status" aria-live="polite">
        {status}
      </p>
      <div className="ns-grow" />
      {!ready && <p className="ns-muted ns-center">{t("start.empty")}</p>}
      {!ready && onDemo && (
        <button
          type="button"
          className="ns-text ns-accent ns-demo"
          onClick={onDemo}
          disabled={busy}
        >
          {t("start.demo")}
        </button>
      )}
      <button type="button" className="ns-primary" disabled={!ready} onClick={onOpen}>
        {t("start.go")}
      </button>
    </div>
  );
}
