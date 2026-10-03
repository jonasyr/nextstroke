import {
  type CompareAction,
  type CompareState,
  PARAMS,
  type Param,
  paramValue,
} from "@nextstroke/compare";
import { type MessageKey, t } from "@nextstroke/ui";
import type { Dispatch } from "react";

/** Bottom panels of the comparison editor: view, alignment, and paper corners. */

const PARAM_LABEL: Record<Param, MessageKey> = {
  x: "compare.param.x",
  y: "compare.param.y",
  scale: "compare.param.scale",
  rotation: "compare.param.rotation",
};

export function formatParam(param: Param, value: number): string {
  if (param === "scale") return `${(value * 100).toFixed(1)} %`;
  if (param === "rotation") return `${value.toFixed(2)}°`;
  return `${(value * 100).toFixed(2)} %`;
}

interface PanelProps {
  state: CompareState;
  dispatch: Dispatch<CompareAction>;
}

export function ViewPanel({ state, dispatch, onCorners }: PanelProps & { onCorners: () => void }) {
  const split = state.split !== null;
  const percent = Math.round((split ? (state.split ?? 0) : state.opacity) * 100);
  const hold = (active: boolean) => dispatch({ type: "hold", active });
  return (
    <>
      <div className="ns-seg">
        <button
          type="button"
          aria-pressed={!split}
          onClick={() => dispatch({ type: "split", on: false })}
        >
          {t("compare.mode.overlay")}
        </button>
        <button
          type="button"
          aria-pressed={split}
          onClick={() => dispatch({ type: "split", on: true })}
        >
          {t("compare.split")}
        </button>
      </div>
      <label className="ns-field" htmlFor="ns-slider">
        <span>
          {t(split ? "compare.splitPosition" : "compare.opacity")}: {percent} %
        </span>
        <input
          id="ns-slider"
          type="range"
          min={0}
          max={100}
          value={percent}
          onChange={(e) =>
            dispatch(
              split
                ? { type: "split-set", value: Number(e.target.value) / 100 }
                : { type: "opacity", percent: Number(e.target.value) },
            )
          }
        />
      </label>
      <div className="ns-row ns-fill">
        <button
          type="button"
          onPointerDown={() => hold(true)}
          onPointerUp={() => hold(false)}
          onPointerCancel={() => hold(false)}
          onPointerLeave={() => hold(false)}
          onKeyDown={(e) => (e.key === " " || e.key === "Enter") && hold(true)}
          onKeyUp={() => hold(false)}
        >
          {t("compare.hold")}
        </button>
        {!split && (
          <>
            <button type="button" onClick={() => dispatch({ type: "half" })}>
              {t("compare.half")}
            </button>
            <button type="button" onClick={() => dispatch({ type: "reference" })}>
              {t("compare.reference")}
            </button>
          </>
        )}
      </div>
      <div className="ns-row ns-fill">
        <button type="button" onClick={onCorners}>
          {t(state.corners ? "compare.corners.edit" : "compare.corners.open")}
        </button>
        <button type="button" onClick={() => dispatch({ type: "alignment", open: true })}>
          {t("compare.align")}
        </button>
      </div>
    </>
  );
}

export function AlignPanel({
  state,
  dispatch,
  busy,
  onAuto,
  onStatus,
}: PanelProps & { busy: boolean; onAuto: () => void; onStatus: (text: string) => void }) {
  const param = state.activeParam;
  return (
    <>
      <div className="ns-panel-head">
        <h2>{t("compare.align")}</h2>
        <button
          type="button"
          className="ns-primary"
          onClick={() => dispatch({ type: "alignment", open: false })}
        >
          {t("compare.done")}
        </button>
      </div>
      {state.corners ? (
        <>
          <p className="ns-hint">{t("compare.corners.active")}</p>
          <div className="ns-row ns-fill">
            <button type="button" onClick={() => dispatch({ type: "corners-clear" })}>
              {t("compare.corners.clear")}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="ns-seg" role="tablist">
            {(Object.keys(PARAMS) as Param[]).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={p === param}
                onClick={() => dispatch({ type: "select-param", param: p })}
              >
                {t(PARAM_LABEL[p])}
              </button>
            ))}
          </div>
          <div className="ns-stepper">
            <button
              type="button"
              aria-label={t("compare.less")}
              onClick={() => dispatch({ type: "nudge", direction: -1 })}
            >
              −
            </button>
            <input
              type="range"
              aria-label={t(PARAM_LABEL[param])}
              min={PARAMS[param].min}
              max={PARAMS[param].max}
              step={PARAMS[param].step}
              value={paramValue(state)}
              onChange={(e) => {
                dispatch({ type: "set-param", value: Number(e.target.value) });
                onStatus(t("compare.status.adjusted", { label: t(PARAM_LABEL[param]) }));
              }}
            />
            <button
              type="button"
              aria-label={t("compare.more")}
              onClick={() => dispatch({ type: "nudge", direction: 1 })}
            >
              +
            </button>
            <output>{formatParam(param, paramValue(state))}</output>
          </div>
          <label className="ns-check">
            <input
              type="checkbox"
              checked={state.alignGestures}
              onChange={(e) => dispatch({ type: "align-gestures", enabled: e.target.checked })}
            />
            {t("compare.alignGestures")}
          </label>
          <div className="ns-row ns-fill">
            <button type="button" onClick={onAuto} disabled={busy}>
              {t("compare.auto")}
            </button>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "reset-layer" });
                onStatus(t("compare.status.reset"));
              }}
            >
              {t("compare.reset")}
            </button>
          </div>
        </>
      )}
    </>
  );
}

const CORNER_ICON = ["↖", "↗", "↘", "↙"] as const;
const NUDGES = [
  ["left", -1, 0, "←"],
  ["up", 0, -1, "↑"],
  ["down", 0, 1, "↓"],
  ["right", 1, 0, "→"],
] as const;

export function CornersPanel({ state, dispatch, onNext }: PanelProps & { onNext: () => void }) {
  const onReference = state.cornerStep === "reference";
  return (
    <>
      <div className="ns-panel-head">
        <h2>{t(onReference ? "compare.corners.stepReference" : "compare.corners.stepOriginal")}</h2>
        <button type="button" onClick={() => dispatch({ type: "corners-cancel" })}>
          {t("compare.corners.cancel")}
        </button>
      </div>
      <p className="ns-hint">
        {t(onReference ? "compare.corners.hintReference" : "compare.corners.hintOriginal")}
      </p>
      <fieldset className="ns-fine">
        <legend>{t("compare.corners.fine")}</legend>
        <div className="ns-row">
          {CORNER_ICON.map((icon, i) => (
            <button
              key={icon}
              type="button"
              className="ns-icon"
              aria-label={t(`compare.corner.${i as 0 | 1 | 2 | 3}`)}
              aria-pressed={state.activeCorner === i}
              onClick={() => dispatch({ type: "select-corner", index: i })}
            >
              {icon}
            </button>
          ))}
          <span className="ns-gap" />
          {NUDGES.map(([name, dx, dy, arrow]) => (
            <button
              key={name}
              type="button"
              className="ns-icon"
              aria-label={t(`compare.corner.${name}`)}
              onClick={() => dispatch({ type: "corner-nudge", dx, dy })}
            >
              {arrow}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="ns-row ns-fill">
        {onReference ? (
          <button type="button" className="ns-primary" onClick={onNext}>
            {t("compare.corners.next")}
          </button>
        ) : (
          <>
            <button type="button" onClick={() => dispatch({ type: "corners-back" })}>
              {t("compare.corners.back")}
            </button>
            <button
              type="button"
              className="ns-primary"
              onClick={() => dispatch({ type: "corners-done" })}
            >
              {t("compare.corners.done")}
            </button>
          </>
        )}
      </div>
    </>
  );
}
