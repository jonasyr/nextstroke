import { t } from "@nextstroke/ui";
import type { ChangeEvent } from "react";

/** First screen of Quick Compare: one card per image, then "Vergleichen". */

export type Slot = "original" | "reference";

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.pdf";

const TEXT = {
  original: {
    title: "compare.slot.original.title",
    hint: "compare.slot.original.hint",
    pick: "compare.pick.original",
  },
  reference: {
    title: "compare.slot.reference.title",
    hint: "compare.slot.reference.hint",
    pick: "compare.pick.reference",
  },
} as const;

export function ImportScreen({
  names,
  busy,
  status,
  onPick,
  onOpen,
}: {
  names: Record<Slot, string | undefined>;
  busy: boolean;
  status: string;
  onPick: (slot: Slot, file: File | undefined) => void;
  onOpen: () => void;
}) {
  const ready = Boolean(names.original && names.reference);
  const change = (slot: Slot) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    onPick(slot, file);
  };
  return (
    <div className="ns-import">
      {(["original", "reference"] as const).map((slot, i) => {
        const name = names[slot];
        return (
          <div key={slot} className="ns-card" data-loaded={name ? "" : undefined}>
            <div className="ns-card-text">
              <span className="ns-card-title">
                {i + 1} · {t(TEXT[slot].title)}
              </span>
              <span className="ns-muted">{name ? `✓ ${name}` : t(TEXT[slot].hint)}</span>
            </div>
            <label className={`ns-button${name ? "" : " ns-primary"}`} aria-disabled={busy}>
              {t(name ? "compare.change" : "compare.choose")}
              <input
                type="file"
                className="ns-hidden-input"
                aria-label={t(TEXT[slot].pick)}
                accept={ACCEPT}
                onChange={change(slot)}
                disabled={busy}
              />
            </label>
          </div>
        );
      })}
      <p className="ns-status" role="status" aria-live="polite">
        {status}
      </p>
      {ready ? (
        <button type="button" className="ns-primary ns-wide" onClick={onOpen}>
          {t("compare.start")}
        </button>
      ) : (
        <p className="ns-muted">{t("compare.empty")}</p>
      )}
    </div>
  );
}
