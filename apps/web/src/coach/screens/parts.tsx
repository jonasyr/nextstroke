import { t } from "@nextstroke/ui";
import type { ReactNode } from "react";

/** Top bar of a guided screen: back on the left, title with an optional step count in the middle. */
export function FlowBar({
  back,
  backLabel = t("nav.back"),
  title,
  step,
  action,
}: {
  back: () => void;
  backLabel?: string;
  title: string;
  step?: string;
  /** A secondary action on the right, so the foot keeps one full-width primary button. */
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="ns-g-bar">
      <button type="button" className="ns-text" onClick={back}>
        {backLabel}
      </button>
      <h1 className="ns-g-title">
        {title}
        {step && <small>{step}</small>}
      </h1>
      {action ? (
        <button type="button" className="ns-text ns-accent ns-g-action" onClick={action.onClick}>
          {action.label}
        </button>
      ) : (
        <span />
      )}
    </div>
  );
}

/** One choice in a list: a native radio with a title and an optional hint. */
export function Option({
  name,
  selected,
  onSelect,
  title,
  hint,
}: {
  name: string;
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint?: string;
}) {
  return (
    <label className="ns-g-option">
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        className="ns-g-radio"
      />
      <span>
        {title}
        {hint && <small>{hint}</small>}
      </span>
      <span className="ns-g-tick" aria-hidden="true" />
    </label>
  );
}

/** A compact choice: a pill in a row (`chip`) or a segment of a segmented control (`seg`). */
export function Pill({
  name,
  selected,
  onSelect,
  children,
  kind = "chip",
}: {
  name: string;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  kind?: "chip" | "seg";
}) {
  return (
    <label className={`ns-g-${kind}`}>
      <input
        type="radio"
        name={name}
        checked={selected}
        onChange={onSelect}
        className="ns-g-radio"
      />
      <span>{children}</span>
    </label>
  );
}

export function Options({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="ns-g-options" role="radiogroup" aria-label={label}>
      {children}
    </div>
  );
}

export function Foot({ children }: { children: ReactNode }) {
  return <div className="ns-g-foot">{children}</div>;
}
