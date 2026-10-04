import { t } from "@nextstroke/ui";
import { ArrowLeftRight, Hand, Minimize2, RefreshCcw, Sun, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { ICON, IconButton } from "./IconButton.tsx";

/**
 * Sheets and the "Mehr" menu. Closed sheets are unmounted, not hidden: Safari 26 tints its
 * toolbars from fixed elements even when they are invisible (D-056).
 */

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="ns-scrim" onClick={onClose} aria-hidden="true" />
      <div className="ns-sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="ns-grab" />
        <div className="ns-shead">
          <h2>{title}</h2>
          <IconButton label={t("common.close")} onClick={onClose}>
            <X {...ICON} />
          </IconButton>
        </div>
        {children}
      </div>
    </>
  );
}

export type ExportKind = "current" | "drawing" | "vorlage";

export function ExportSheet({
  onShare,
  onSave,
  onClose,
}: {
  onShare: (kind: ExportKind) => void;
  onSave: (kind: ExportKind) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ExportKind>("current");
  return (
    <Sheet title={t("export.title")} onClose={onClose}>
      <div role="radiogroup" aria-label={t("export.title")}>
        {(["current", "drawing", "vorlage"] as const).map((k) => (
          <label key={k} className="ns-opt">
            <input type="radio" name="ns-export" checked={kind === k} onChange={() => setKind(k)} />
            {t(`export.${k}`)}
          </label>
        ))}
      </div>
      <button type="button" className="ns-primary" onClick={() => onShare(kind)}>
        {t("export.share")}
      </button>
      <button type="button" className="ns-text ns-accent" onClick={() => onSave(kind)}>
        {t("export.save")}
      </button>
    </Sheet>
  );
}

export type MoreAction = "swap" | "wake" | "hide" | "gestures" | "reset";

const MORE = [
  { action: "swap", Icon: ArrowLeftRight },
  { action: "wake", Icon: Sun },
  { action: "hide", Icon: Minimize2 },
  { action: "gestures", Icon: Hand },
  { action: "reset", Icon: RefreshCcw },
] as const;

export function MoreMenu({
  onAction,
  onClose,
}: {
  onAction: (action: MoreAction) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="ns-scrim ns-clear" onClick={onClose} aria-hidden="true" />
      <div className="ns-menu" role="menu" aria-label={t("editor.more")}>
        {MORE.map(({ action, Icon }) => (
          <button key={action} type="button" role="menuitem" onClick={() => onAction(action)}>
            <Icon {...ICON} />
            {t(`more.${action}`)}
          </button>
        ))}
      </div>
    </>
  );
}

const GESTURES = [
  "gestures.tap",
  "gestures.hold",
  "gestures.zoom",
  "gestures.align",
  "gestures.corners",
  "gestures.reset",
] as const;

export function GesturesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title={t("gestures.title")} onClose={onClose}>
      <ul className="ns-list">
        {GESTURES.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
    </Sheet>
  );
}

export function InfoSheet({
  onClose,
  onGestures,
}: {
  onClose: () => void;
  onGestures: () => void;
}) {
  return (
    <Sheet title={t("info.title")} onClose={onClose}>
      <p className="ns-muted">{t("info.body")}</p>
      <button type="button" className="ns-text ns-accent ns-start-self" onClick={onGestures}>
        {t("info.gestures")}
      </button>
    </Sheet>
  );
}

export function PdfDialog({
  count,
  onChoose,
}: {
  count: number;
  onChoose: (page: number | null) => void;
}) {
  const [page, setPage] = useState(1);
  return (
    <Sheet title={t("pdf.title")} onClose={() => onChoose(null)}>
      <label className="ns-field">
        {t("pdf.page", { count: String(count) })}
        <input
          type="number"
          min={1}
          max={count}
          value={page}
          onChange={(e) => setPage(Number(e.target.value))}
        />
      </label>
      <button
        type="button"
        className="ns-primary"
        onClick={() => onChoose(Math.min(Math.max(1, Math.round(page) || 1), count))}
      >
        {t("pdf.load")}
      </button>
    </Sheet>
  );
}
