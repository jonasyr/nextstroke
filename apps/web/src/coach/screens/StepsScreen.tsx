import { evidenceFor } from "@nextstroke/coaching";
import type { CoachRequest, Idea } from "@nextstroke/contracts";
import { DATASET } from "@nextstroke/materials";
import { t } from "@nextstroke/ui";
import type { ReactNode } from "react";
import { generalRules, levelLabel } from "../labels.ts";
import { FlowBar, Foot } from "./parts.tsx";

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const day = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d}.${m}.${y}`;
};

/** The chosen idea as steps to tick off, with where its facts come from. */
export function StepsScreen({
  idea,
  skill,
  done,
  onToggle,
  onBack,
  foot,
}: {
  idea: Idea;
  skill: CoachRequest["skill"];
  done: number[];
  onToggle: (index: number) => void;
  onBack: () => void;
  /** The step's action at the bottom: photographing the checkpoint. */
  foot: ReactNode;
}) {
  const evidence = evidenceFor(idea, DATASET);
  return (
    <>
      <FlowBar back={onBack} title={t("guided.steps.title")} />
      <div className="ns-g-body">
        <div className="ns-group">
          <span className="ns-label">{levelLabel(idea.risk)}</span>
          <h2 className="ns-g-headline">{idea.title}</h2>
          <p className="ns-sub">{idea.why}</p>
        </div>
        <ol className="ns-g-steps">
          {idea.steps.map((step, i) => (
            <li key={step}>
              <button
                type="button"
                className="ns-g-step"
                aria-pressed={done.includes(i)}
                onClick={() => onToggle(i)}
              >
                <span className="ns-g-num" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{step}</span>
              </button>
            </li>
          ))}
        </ol>
        <details className="ns-g-details">
          <summary>{t("guided.steps.why")}</summary>
          <div className="ns-g-evidence">
            {evidence.map((e) => (
              <p key={e.text}>
                {e.text}
                <small>
                  <a href={e.url} target="_blank" rel="noopener noreferrer">
                    {host(e.url)}
                  </a>{" "}
                  · {t("guided.steps.retrieved", { date: day(e.retrievedAt) })}
                </small>
              </p>
            ))}
            <p>{generalRules(skill)}</p>
          </div>
        </details>
      </div>
      <Foot>{foot}</Foot>
    </>
  );
}
