import type { CompareAction, CompareState } from "@nextstroke/compare";
import { t } from "@nextstroke/ui";
import {
  Blend,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
  Minus,
  Move,
  Plus,
  RotateCcw,
  RotateCw,
  Scan,
  Sparkles,
} from "lucide-react";
import { type ReactNode, useRef } from "react";
import { ICON, IconButton } from "./IconButton.tsx";
import { Thumb } from "./Thumb.tsx";

/** Bottom panels of the editor: one mode, one primary control (D-056). */

export type Mode = "compare" | "align" | "corners";
/** Modes with a tab; the corner flow opens from Ausrichten. */
type TabMode = "compare" | "align";
/** Dispatch an action; `record` first saves an undo checkpoint. */
export type Apply = (action: CompareAction, record?: boolean) => void;

const de = (value: number, digits: number) => value.toFixed(digits).replace(".", ",");

interface Images {
  original: ImageBitmap;
  reference: ImageBitmap;
}

/** Slider with the Zeichnung at 0 and the Vorlage at 100; a quick double tap resets to 50 %. */
function EndCapSlider({
  id,
  label,
  value,
  images,
  onStart,
  onValue,
  thin = false,
}: {
  id: string;
  label: string;
  value: number;
  images: Images;
  onStart: () => void;
  onValue: (percent: number) => void;
  thin?: boolean;
}) {
  const lastUp = useRef(0);
  return (
    <div className={`ns-slider${thin ? " ns-thin" : ""}`}>
      <Thumb image={images.original} width={28} height={28} className="ns-cap" />
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={value}
        aria-label={label}
        style={{ "--p": `${value}%` } as React.CSSProperties}
        onPointerDown={onStart}
        onKeyDown={onStart}
        onPointerUp={(e) => {
          if (e.timeStamp - lastUp.current < 300) {
            onStart();
            onValue(50);
          }
          lastUp.current = e.timeStamp;
        }}
        onChange={(e) => onValue(Number(e.target.value))}
      />
      <Thumb image={images.reference} width={28} height={28} className="ns-cap" />
      <output htmlFor={id}>{value} %</output>
    </div>
  );
}

export function ComparePanel({
  state,
  apply,
  images,
  onMode,
}: {
  state: CompareState;
  apply: Apply;
  images: Images;
  onMode: (mode: TabMode) => void;
}) {
  const split = state.split !== null;
  const value = Math.round((split ? (state.split ?? 0) : state.opacity) * 100);
  const revealed = state.tapReveal;
  const changed = {
    compare: split || state.opacity !== 0.5,
    align:
      state.corners !== null ||
      state.layer.x !== 0 ||
      state.layer.y !== 0 ||
      state.layer.scale !== 1 ||
      state.layer.rotationDeg !== 0,
  };
  const tabs = [
    { mode: "compare", Icon: Blend },
    { mode: "align", Icon: Move },
  ] as const;
  return (
    <>
      <div className="ns-row">
        <fieldset className="ns-seg" aria-label={t("view.label")}>
          {(["overlay", "split"] as const).map((view) => {
            const on = (view === "split") === split;
            return (
              <button
                key={view}
                type="button"
                aria-pressed={on}
                onClick={() => !on && apply({ type: "split", on: view === "split" }, true)}
              >
                {t(view === "split" ? "view.split" : "view.overlay")}
              </button>
            );
          })}
        </fieldset>
        <button
          type="button"
          className="ns-toggle"
          aria-pressed={revealed}
          aria-label={t("reveal.label")}
          onClick={() => apply({ type: "toggle-reveal" })}
        >
          {revealed ? <EyeOff {...ICON} /> : <Eye {...ICON} />}
          <span aria-hidden="true">{t("reveal.text")}</span>
        </button>
      </div>
      <EndCapSlider
        id="ns-slider"
        label={t(split ? "slider.split" : "slider.opacity")}
        value={value}
        images={images}
        onStart={() => apply({ type: "checkpoint" })}
        onValue={(percent) =>
          apply(split ? { type: "split-set", value: percent / 100 } : { type: "opacity", percent })
        }
      />
      <div className="ns-tabs" role="tablist" aria-label={t("mode.label")}>
        {tabs.map(({ mode, Icon }) => (
          <button
            key={mode}
            type="button"
            role="tab"
            className="ns-tab"
            aria-selected={mode === "compare"}
            onClick={() => onMode(mode)}
          >
            <Icon {...ICON} />
            {t(`mode.${mode}`)}
            {changed[mode] && <i className="ns-dot" role="img" aria-label={t("mode.changed")} />}
          </button>
        ))}
      </div>
    </>
  );
}

const ARROWS = [
  { key: "up", dx: 0, dy: -1, Icon: ChevronUp, area: "u" },
  { key: "left", dx: -1, dy: 0, Icon: ChevronLeft, area: "l" },
  { key: "right", dx: 1, dy: 0, Icon: ChevronRight, area: "r" },
  { key: "down", dx: 0, dy: 1, Icon: ChevronDown, area: "d" },
] as const;

export function AlignPanel({
  state,
  apply,
  images,
  fine,
  onFine,
  busy,
  onAuto,
  onCorners,
}: {
  state: CompareState;
  apply: Apply;
  images: Images;
  fine: boolean;
  onFine: (fine: boolean) => void;
  busy: boolean;
  /** Everything automatic: content, paper corners, position search (D-058). */
  onAuto: () => void;
  /** The manual four-corner flow. */
  onCorners: () => void;
}) {
  const px = fine ? 1 : 10;
  const unit = px / images.original.width;
  const { layer } = state;
  return (
    <>
      <div className="ns-row">
        <button
          type="button"
          className="ns-auto"
          aria-label={t("align.autoAll")}
          onClick={onAuto}
          disabled={busy}
        >
          <Sparkles {...ICON} />
          {t("align.auto")}
        </button>
        <button type="button" className="ns-auto ns-auto-2" onClick={onCorners}>
          <Scan {...ICON} />
          {t(state.corners ? "align.cornersEdit" : "align.corners")}
        </button>
      </div>
      <section className="ns-section" aria-labelledby="ns-fine-title">
        <div className="ns-section-head">
          <h2 id="ns-fine-title">{t("align.fine")}</h2>
          <button
            type="button"
            className="ns-text ns-accent"
            onClick={() => apply({ type: "reset-layer" }, true)}
          >
            {t("align.reset")}
          </button>
        </div>
        <div className="ns-fine">
          <fieldset className="ns-pad" aria-label={t("align.move")}>
            {ARROWS.map(({ key, dx, dy, Icon, area }) => (
              <IconButton
                key={key}
                label={t(`align.${key}`)}
                style={{ gridArea: area }}
                onClick={() => apply({ type: "layer-nudge", dx: dx * unit, dy: dy * unit }, true)}
              >
                <Icon {...ICON} />
              </IconButton>
            ))}
            <button
              type="button"
              className="ns-pad-c ns-pad-step"
              style={{ gridArea: "c" }}
              aria-label={t(fine ? "corners.stepFine" : "corners.stepCoarse")}
              onClick={() => onFine(!fine)}
            >
              {px} px
            </button>
          </fieldset>
          <div className="ns-steppers">
            <div className="ns-stepper">
              <IconButton
                label={t("align.smaller")}
                onClick={() => apply({ type: "layer-scale", delta: fine ? -0.002 : -0.02 }, true)}
              >
                <Minus {...ICON} />
              </IconButton>
              <span className="ns-stepper-val">
                <small>{t("align.size")}</small>
                <output>{de(layer.scale * 100, 1)} %</output>
              </span>
              <IconButton
                label={t("align.larger")}
                onClick={() => apply({ type: "layer-scale", delta: fine ? 0.002 : 0.02 }, true)}
              >
                <Plus {...ICON} />
              </IconButton>
            </div>
            <div className="ns-stepper">
              <IconButton
                label={t("align.ccw")}
                onClick={() => apply({ type: "layer-rotate", delta: fine ? -0.1 : -1 }, true)}
              >
                <RotateCcw {...ICON} />
              </IconButton>
              <span className="ns-stepper-val">
                <small>{t("align.rotate")}</small>
                <output>{de(layer.rotationDeg, 1)}°</output>
              </span>
              <IconButton
                label={t("align.cw")}
                onClick={() => apply({ type: "layer-rotate", delta: fine ? 0.1 : 1 }, true)}
              >
                <RotateCw {...ICON} />
              </IconButton>
            </div>
          </div>
        </div>
      </section>
      <EndCapSlider
        id="ns-slider"
        label={t("slider.opacity")}
        value={Math.round(state.opacity * 100)}
        images={images}
        thin
        onStart={() => apply({ type: "checkpoint" })}
        onValue={(percent) => apply({ type: "opacity", percent })}
      />
    </>
  );
}

/** "Ecke 3 prüfen", "Ecken 1 und 3 prüfen", or "Ecken prüfen" for all four (D-061). */
function checkText(unsure: readonly number[]): string {
  const n = unsure.map((i) => String(i + 1));
  if (n.length === 1) return t("corners.checkOne", { n: n[0] ?? "" });
  if (n.length === 4) return t("corners.check");
  return t("corners.checkSome", {
    list: `${n.slice(0, -1).join(", ")} ${t("common.and")} ${n.at(-1)}`,
  });
}

/** Corner buttons laid out like the paper: 1 2 over 4 3. */
const CORNER_ORDER = [0, 1, 3, 2] as const;

export function CornersPanel({
  state,
  apply,
  size,
  fine,
  onFine,
  unsure,
  onAuto,
  onTouchCorner,
}: {
  state: CompareState;
  apply: Apply;
  /** Pixel size of the image whose corners are being placed. */
  size: { width: number; height: number };
  fine: boolean;
  onFine: (fine: boolean) => void;
  /** Rings of an automatic guess still to be checked (D-061). */
  unsure: readonly number[];
  onAuto: () => void;
  /** Corner `index` was selected or nudged: magnify it, and it no longer needs checking. */
  onTouchCorner: (index: number) => void;
}) {
  const px = fine ? 1 : 10;
  const first = state.cornerStep === "reference";
  return (
    <>
      <h2 className="ns-ptitle">
        {t(first ? "corners.reference" : "corners.original")}
        <small>{t("corners.step", { n: first ? "1" : "2" })}</small>
      </h2>
      {unsure.length > 0 && (
        <p className="ns-note">
          <b>{checkText(unsure)}</b> · {t("corners.checkDetail")}
        </p>
      )}
      <div className="ns-crow">
        <fieldset className="ns-cornersel" aria-label={t("corners.select")}>
          {CORNER_ORDER.map((i) => (
            <button
              key={i}
              type="button"
              aria-pressed={state.activeCorner === i}
              aria-label={t("corners.pick", {
                n: String(i + 1),
                where: t(`corners.where.${i}`),
              })}
              onClick={() => {
                apply({ type: "select-corner", index: i });
                onTouchCorner(i);
              }}
            >
              {i + 1}
            </button>
          ))}
        </fieldset>
        <fieldset className="ns-pad" aria-label={t("corners.move")}>
          {ARROWS.map(({ key, dx, dy, Icon, area }) => (
            <IconButton
              key={key}
              label={t(`corners.${key}`)}
              style={{ gridArea: area }}
              onClick={() => {
                apply(
                  { type: "corner-nudge", dx: (dx * px) / size.width, dy: (dy * px) / size.height },
                  true,
                );
                onTouchCorner(state.activeCorner);
              }}
            >
              <Icon {...ICON} />
            </IconButton>
          ))}
          <button
            type="button"
            className="ns-pad-c ns-pad-step"
            style={{ gridArea: "c" }}
            aria-label={t(fine ? "corners.stepFine" : "corners.stepCoarse")}
            onClick={() => onFine(!fine)}
          >
            {px} px
          </button>
        </fieldset>
      </div>
      <div className="ns-links">
        <button type="button" className="ns-text ns-accent" onClick={onAuto}>
          {t("corners.auto")}
        </button>
        <button
          type="button"
          className="ns-text ns-accent"
          onClick={() => apply({ type: "corners-whole" }, true)}
        >
          {t("corners.whole")}
        </button>
        <button
          type="button"
          className="ns-text ns-accent"
          onClick={() => apply({ type: "corners-reset" }, true)}
        >
          {t("corners.reset")}
        </button>
      </div>
    </>
  );
}

/**
 * Top bar while aligning or placing corners (D-059): cancel on the leading edge, the one
 * prominent action on the trailing edge, as in Apple Photos.
 */
export function ModeBar({
  leading,
  trailing,
  children,
}: {
  leading: { label: string; onClick: () => void };
  trailing: { label: string; onClick: () => void };
  children: ReactNode;
}) {
  return (
    <div className="ns-topbar ns-modebar">
      <button type="button" className="ns-text" onClick={leading.onClick}>
        {leading.label}
      </button>
      <div className="ns-modebar-center">{children}</div>
      <button type="button" className="ns-done" onClick={trailing.onClick}>
        {trailing.label}
      </button>
    </div>
  );
}
