import { t } from "@nextstroke/ui";
import { useState } from "react";
import type { FlowChoices } from "../flow.ts";
import { INTENTS, intentLabel, SKILLS, skillLabel } from "../labels.ts";
import { type MarkMode, PhotoMarker } from "../PhotoMarker.tsx";
import { FlowBar, Foot, Option, Options, Pill } from "./parts.tsx";

/** Step 3 of 3: what should get better, where, what stays, and how much practice. */
export function GoalScreen({
  image,
  choices,
  onChange,
  onBack,
  onNext,
}: {
  image: ImageBitmap | null;
  choices: FlowChoices;
  onChange: (change: Partial<FlowChoices>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [mode, setMode] = useState<MarkMode>("area");
  const [more, setMore] = useState(choices.protectedSpots.length > 0);
  const hint =
    mode === "protect"
      ? t("guided.goal.protectHint")
      : choices.area
        ? t("guided.goal.marked")
        : t("guided.goal.tap");
  return (
    <>
      <FlowBar back={onBack} title={t("guided.goal.title")} step={t("guided.goal.step")} />
      <div className="ns-g-body">
        <section className="ns-group">
          <h2 className="ns-label">{t("guided.goal.intent")}</h2>
          <Options label={t("guided.goal.intentGroup")}>
            {INTENTS.map((intent) => (
              <Option
                key={intent}
                name="intent"
                title={intentLabel(intent)}
                hint={intentLabel(intent, ".hint")}
                selected={choices.intent === intent}
                onSelect={() => onChange({ intent })}
              />
            ))}
          </Options>
        </section>
        {image && (
          <section className="ns-group">
            <h2 className="ns-label">{t("guided.goal.where")}</h2>
            <PhotoMarker
              image={image}
              mode={mode}
              area={choices.area}
              protectedSpots={choices.protectedSpots}
              onArea={(area) => onChange({ area })}
              onProtected={(protectedSpots) => onChange({ protectedSpots })}
              label={t(mode === "protect" ? "guided.goal.markProtected" : "guided.goal.markArea")}
            />
            <p className="ns-sub" role="status">
              {hint}
            </p>
            <div className="ns-g-row">
              {choices.area && mode === "area" && (
                <button type="button" className="ns-text" onClick={() => onChange({ area: null })}>
                  {t("guided.goal.clear")}
                </button>
              )}
              {!more ? (
                <button type="button" className="ns-text ns-accent" onClick={() => setMore(true)}>
                  {t("guided.goal.more")}
                </button>
              ) : (
                <button
                  type="button"
                  className="ns-text ns-accent"
                  aria-pressed={mode === "protect"}
                  onClick={() => setMode(mode === "protect" ? "area" : "protect")}
                >
                  {mode === "protect"
                    ? t("guided.goal.protectDone")
                    : t("guided.goal.protect", { count: String(choices.protectedSpots.length) })}
                </button>
              )}
            </div>
          </section>
        )}
        <section className="ns-group">
          <h2 className="ns-label">{t("guided.goal.skill")}</h2>
          <div className="ns-g-segs" role="radiogroup" aria-label={t("guided.goal.skillGroup")}>
            {SKILLS.map((skill) => (
              <Pill
                key={skill}
                kind="seg"
                name="skill"
                selected={choices.skill === skill}
                onSelect={() => onChange({ skill })}
              >
                {skillLabel(skill)}
              </Pill>
            ))}
          </div>
        </section>
      </div>
      <Foot>
        <button type="button" className="ns-primary" onClick={onNext}>
          {t("guided.goal.go")}
        </button>
      </Foot>
    </>
  );
}
