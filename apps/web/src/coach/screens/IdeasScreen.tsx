import type { SuggestionSet } from "@nextstroke/contracts";
import { t } from "@nextstroke/ui";
import type { ReactNode } from "react";
import { LEVELS, levelLabel, techniqueLabel } from "../labels.ts";
import { FlowBar } from "./parts.tsx";

/** Three ideas, from little to much change (D-014, D-065). */
export function IdeasScreen({
  lead,
  suggestions,
  onBack,
  onPick,
  preview,
}: {
  lead: string;
  suggestions: SuggestionSet;
  onBack: () => void;
  onPick: (index: number) => void;
  /** A small stroke-plan preview for an idea, when it has one (D-071). */
  preview?: (index: number) => ReactNode;
}) {
  return (
    <>
      <FlowBar back={onBack} title={t("guided.ideas.title")} />
      <div className="ns-g-body">
        <p className="ns-sub">
          {lead} {t("guided.ideas.range")}
        </p>
        <ul className="ns-g-ideas">
          {suggestions.ideas.map((idea, i) => {
            return (
              <li key={idea.risk}>
                <button type="button" className="ns-g-idea" onClick={() => onPick(i)}>
                  <span className="ns-g-idea-row">
                    <span className="ns-g-idea-head">
                      <span className="ns-g-level">
                        <span className="ns-g-meter" aria-hidden="true">
                          {[1, 2, 3].map((k) => (
                            <i key={k} data-on={k <= LEVELS[idea.risk] ? "" : undefined} />
                          ))}
                        </span>
                        {levelLabel(idea.risk)}
                      </span>
                      <b>{idea.title}</b>
                    </span>
                    {preview?.(i)}
                  </span>
                  <span className="ns-muted">{idea.why}</span>
                  <small className="ns-muted">
                    {techniqueLabel(idea.technique)} ·{" "}
                    {t("guided.ideas.steps", { count: String(idea.steps.length) })}
                    {idea.materialClaimIds.length ? ` · ${t("guided.ideas.sources")}` : ""}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
