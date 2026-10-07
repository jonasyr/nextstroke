import type { Refusal } from "@nextstroke/imaging";
import { t } from "@nextstroke/ui";
import { useState } from "react";
import { FormMarker, type FormTool } from "../FormMarker.tsx";
import type { FlowChoices } from "../flow.ts";
import { type FormImage, isEmpty, NO_FORM, resize, sizeRange, undo } from "../form.ts";
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
  form = null,
}: {
  image: ImageBitmap | null;
  /** The straight view at computing size and the form's mask, once form mode is on (D-073). */
  form?: { image: FormImage; mask: Uint8Array } | null;
  choices: FlowChoices;
  onChange: (change: Partial<FlowChoices>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [mode, setMode] = useState<MarkMode>("area");
  const [more, setMore] = useState(choices.protectedSpots.length > 0);
  const [tool, setTool] = useState<FormTool>("tap");
  const [refused, setRefused] = useState<Refusal | null>(null);
  const [searching, setSearching] = useState(false);
  const formMarks = choices.form;
  const setMarks = (next: FlowChoices["form"]) => {
    setRefused(null);
    onChange({ form: next });
  };
  const range = form ? sizeRange(form.image, formMarks) : { smaller: false, larger: false };
  const formHint = searching
    ? t("guided.form.searching")
    : refused
      ? t(`guided.form.${refused}`)
      : tool === "paint"
        ? t("guided.form.paintHint")
        : tool === "erase"
          ? t("guided.form.eraseHint")
          : form && !isEmpty(form.mask)
            ? t(range.smaller || range.larger ? "guided.form.foundSizes" : "guided.form.found")
            : t("guided.form.tap");
  const tools: [FormTool, string][] = [
    ["tap", t("guided.form.tapTool")],
    ["paint", t("guided.form.paint")],
    ["erase", t("guided.form.erase")],
  ];
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
        <section className="ns-stack">
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
          <section className="ns-stack">
            <h2 className="ns-label">{t("guided.goal.where")}</h2>
            <div className="ns-g-segs" role="radiogroup" aria-label={t("guided.form.areaGroup")}>
              <Pill
                kind="seg"
                name="area-kind"
                selected={choices.areaKind === "circle"}
                onSelect={() => onChange({ areaKind: "circle" })}
              >
                {t("guided.form.circle")}
              </Pill>
              <Pill
                kind="seg"
                name="area-kind"
                selected={choices.areaKind === "form"}
                onSelect={() => onChange({ areaKind: "form" })}
              >
                {t("guided.form.form")}
              </Pill>
            </div>
          </section>
        )}
        {image && choices.areaKind === "form" && form && (
          <section className="ns-stack">
            <FormMarker
              image={image}
              form={form.image}
              mask={form.mask}
              marks={formMarks}
              tool={tool}
              onMarks={setMarks}
              onRefused={setRefused}
              onSearching={setSearching}
              label={t("guided.form.image")}
            />
            <p className="ns-sub" role="status">
              {formHint}
            </p>
            <div className="ns-g-segs" role="radiogroup" aria-label={t("guided.form.tools")}>
              {tools.map(([value, text]) => (
                <Pill
                  key={value}
                  kind="seg"
                  name="form-tool"
                  selected={tool === value}
                  onSelect={() => {
                    setTool(value);
                    setRefused(null);
                  }}
                >
                  {text}
                </Pill>
              ))}
            </div>
            {(range.smaller || range.larger) && (
              <div className="ns-g-row2">
                <button
                  type="button"
                  className="ns-g-secondary"
                  disabled={!range.smaller}
                  onClick={() => setMarks(resize(form.image, formMarks, -1))}
                >
                  {t("guided.form.smaller")}
                </button>
                <button
                  type="button"
                  className="ns-g-secondary"
                  disabled={!range.larger}
                  onClick={() => setMarks(resize(form.image, formMarks, 1))}
                >
                  {t("guided.form.larger")}
                </button>
              </div>
            )}
            <div className="ns-g-row">
              <button
                type="button"
                className="ns-text"
                disabled={formMarks.steps.length === 0}
                onClick={() => setMarks(undo(formMarks))}
              >
                {t("guided.form.undo")}
              </button>
              <button
                type="button"
                className="ns-text"
                disabled={formMarks.steps.length === 0}
                onClick={() => {
                  setMarks({ ...NO_FORM, kind: formMarks.kind });
                  setTool("tap");
                }}
              >
                {t("guided.form.reset")}
              </button>
            </div>
            {!isEmpty(form.mask) && (
              <div className="ns-stack ns-g-plan-light">
                <span className="ns-label" aria-hidden="true">
                  {t("guided.form.kind")}
                </span>
                <div className="ns-g-segs" role="radiogroup" aria-label={t("guided.form.kind")}>
                  {(["round", "flat"] as const).map((kind) => (
                    <Pill
                      key={kind}
                      kind="seg"
                      name="form-kind"
                      selected={formMarks.kind === kind}
                      onSelect={() => onChange({ form: { ...formMarks, kind } })}
                    >
                      {t(`guided.form.${kind}`)}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
        {image && choices.areaKind === "circle" && (
          <section className="ns-stack">
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
        <section className="ns-stack">
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
