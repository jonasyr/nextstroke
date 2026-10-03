import { t } from "@nextstroke/ui";
import { type ReactNode, useEffect } from "react";

/**
 * CSS immersive container: fixed to the viewport with safe-area padding. The element
 * Fullscreen API is not required on iPhone (project state, "do not build yet").
 */
export function Immersive({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="ns-immersive" role="dialog" aria-modal="true" aria-label={t("immersive.open")}>
      <button type="button" className="ns-immersive-close" onClick={onClose}>
        {t("immersive.close")}
      </button>
      {children}
    </div>
  );
}
