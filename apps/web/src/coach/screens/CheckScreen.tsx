import { t } from "@nextstroke/ui";
import { useEffect, useRef, useState } from "react";
import { FlowBar, Foot } from "./parts.tsx";

/**
 * Before and now (Phase 3 Task 5): the straight original and the straight checkpoint, both in
 * the same frame, split by a divider the user moves. Rendered locally; nothing is changed.
 */
export function CheckScreen({
  before,
  now,
  saved,
  onBack,
  onDone,
  onNext,
}: {
  before: ImageBitmap;
  now: ImageBitmap;
  saved: boolean;
  onBack: () => void;
  onDone: () => void;
  onNext: () => void;
}) {
  const [split, setSplit] = useState(50);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const aspect = before.width / before.height;

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    el.width = Math.round(el.clientWidth * (window.devicePixelRatio || 1));
    el.height = Math.round(el.width / aspect);
    const x = Math.round((split / 100) * el.width);
    ctx.drawImage(before, 0, 0, el.width, el.height);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, el.width - x, el.height);
    ctx.clip();
    ctx.drawImage(now, 0, 0, el.width, el.height);
    ctx.restore();
    ctx.fillStyle = "#8fb0ff";
    ctx.fillRect(x - 1, 0, 2, el.height);
  }, [before, now, aspect, split]);

  return (
    <>
      <FlowBar back={onBack} title={t("guided.check.title")} />
      <div className="ns-g-body">
        <div className="ns-g-check">
          <canvas
            ref={canvas}
            className="ns-g-photo"
            style={{ aspectRatio: String(aspect) }}
            role="img"
            aria-label={t("guided.check.view")}
          />
          <span className="ns-g-tag" data-side="left">
            {t("guided.check.before")}
          </span>
          <span className="ns-g-tag" data-side="right">
            {t("guided.check.now")}
          </span>
        </div>
        <label className="ns-group">
          <span className="ns-sub">{t("guided.check.split")}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            className="ns-g-range"
          />
        </label>
        <p className="ns-sub">{t(saved ? "guided.check.saved" : "guided.check.unsaved")}</p>
      </div>
      <Foot>
        <div className="ns-g-row2">
          <button type="button" className="ns-g-secondary" onClick={onDone}>
            {t("guided.steps.doneForToday")}
          </button>
          <button type="button" className="ns-primary" onClick={onNext}>
            {t("guided.check.next")}
          </button>
        </div>
      </Foot>
    </>
  );
}
