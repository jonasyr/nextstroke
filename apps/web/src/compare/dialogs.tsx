import { t } from "@nextstroke/ui";
import { useState } from "react";

/** Small modal sheets of Quick Compare: PDF page choice and export. */

export function PdfDialog({
  count,
  onChoose,
}: {
  count: number;
  onChoose: (page: number | null) => void;
}) {
  const [page, setPage] = useState(1);
  return (
    <div className="ns-dialog" role="dialog" aria-modal="true" aria-label={t("compare.pdf.title")}>
      <h2>{t("compare.pdf.title")}</h2>
      <label className="ns-field">
        {t("compare.pdf.page", { count: String(count) })}
        <input
          type="number"
          min={1}
          max={count}
          value={page}
          onChange={(e) => setPage(Number(e.target.value))}
        />
      </label>
      <div className="ns-row ns-fill">
        <button type="button" onClick={() => onChoose(null)}>
          {t("compare.pdf.cancel")}
        </button>
        <button
          type="button"
          className="ns-primary"
          onClick={() => onChoose(Math.min(Math.max(1, Math.round(page) || 1), count))}
        >
          {t("compare.pdf.load")}
        </button>
      </div>
    </div>
  );
}

export type ExportKind = "original" | "reference" | "png" | "jpeg";

export function ExportDialog({
  onSave,
  onClose,
}: {
  onSave: (kind: ExportKind) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="ns-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={t("compare.export.title")}
    >
      <h2>{t("compare.export.title")}</h2>
      <div className="ns-list">
        <button type="button" className="ns-primary" onClick={() => onSave("jpeg")}>
          {t("compare.export.jpeg")}
        </button>
        <button type="button" onClick={() => onSave("png")}>
          {t("compare.export.png")}
        </button>
        <button type="button" onClick={() => onSave("original")}>
          {t("compare.export.original")}
        </button>
        <button type="button" onClick={() => onSave("reference")}>
          {t("compare.export.reference")}
        </button>
        <button type="button" onClick={onClose}>
          {t("compare.export.close")}
        </button>
      </div>
    </div>
  );
}
