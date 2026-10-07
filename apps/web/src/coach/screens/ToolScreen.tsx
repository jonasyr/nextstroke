import { SheetFormat } from "@nextstroke/contracts";
import { DATASET, factsFor } from "@nextstroke/materials";
import { t } from "@nextstroke/ui";
import { useState } from "react";
import { type FlowChoices, mmLabel, tipChoices } from "../flow.ts";
import { COMMON_TIPS_MM, orderPens, POPULAR_PENS, penName } from "../labels.ts";
import { FlowBar, Foot, Option, Options, Pill } from "./parts.tsx";

const PENS = orderPens(DATASET.fineliners);
const SHEETS = SheetFormat.options;

/** Step 2 of 3: which fineliner, which tip, which paper. */
export function ToolScreen({
  choices,
  onChange,
  onBack,
  onNext,
}: {
  choices: FlowChoices;
  onChange: (change: Partial<FlowChoices>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [allPens, setAllPens] = useState(
    !POPULAR_PENS.includes(choices.finelinerId) && choices.finelinerId !== "generic",
  );
  const pen = DATASET.fineliners.find((p) => p.id === choices.finelinerId);
  const listed = tipChoices(factsFor(DATASET, choices.finelinerId).tipSizesMm?.value);
  const tips = listed.length ? listed : COMMON_TIPS_MM;
  const shown = allPens ? PENS : PENS.filter((p) => POPULAR_PENS.includes(p.id));
  return (
    <>
      <FlowBar back={onBack} title={t("guided.tool.title")} step={t("guided.tool.step")} />
      <div className="ns-g-body">
        <section className="ns-stack">
          <h2 className="ns-label">{t("guided.tool.pen")}</h2>
          <Options label={t("guided.tool.penGroup")}>
            {shown.map((p) => (
              <Option
                key={p.id}
                name="pen"
                title={penName(p)}
                selected={choices.finelinerId === p.id}
                onSelect={() => onChange({ finelinerId: p.id, tipMm: null })}
              />
            ))}
            <Option
              name="pen"
              title={t("guided.unknown")}
              hint={t("guided.tool.penUnknown")}
              selected={choices.finelinerId === "generic"}
              onSelect={() => onChange({ finelinerId: "generic", tipMm: null })}
            />
          </Options>
          {!allPens && (
            <button
              type="button"
              className="ns-text ns-accent ns-start-self"
              onClick={() => setAllPens(true)}
            >
              {t("guided.tool.allPens", { count: String(PENS.length) })}
            </button>
          )}
        </section>
        <section className="ns-stack">
          <h2 className="ns-label">{t("guided.tool.tip")}</h2>
          <div className="ns-g-chips" role="radiogroup" aria-label={t("guided.tool.tipGroup")}>
            {tips.map((mm) => (
              <Pill
                key={mm}
                name="tip"
                selected={choices.tipMm === mm}
                onSelect={() => onChange({ tipMm: mm })}
              >
                {mmLabel(mm)}
              </Pill>
            ))}
            <Pill
              name="tip"
              selected={choices.tipMm === null}
              onSelect={() => onChange({ tipMm: null })}
            >
              {t("guided.unknown")}
            </Pill>
          </div>
          <p className="ns-note">
            {listed.length && pen?.brand
              ? t("guided.tool.tipSource", { brand: pen.brand })
              : t("guided.tool.tipPlain")}{" "}
            {t("guided.tool.tipUse")}
          </p>
        </section>
        <section className="ns-stack">
          <h2 className="ns-label">{t("guided.tool.paper")}</h2>
          <Options label={t("guided.tool.paperGroup")}>
            {DATASET.papers.map((paper) => (
              <Option
                key={paper.id}
                name="paper"
                title={paper.name}
                {...(paper.feathers === "likely" ? { hint: t("guided.tool.feathers") } : {})}
                selected={choices.paperId === paper.id}
                onSelect={() => onChange({ paperId: paper.id })}
              />
            ))}
          </Options>
        </section>
        <section className="ns-stack">
          <h2 className="ns-label">{t("guided.tool.sheet")}</h2>
          <div className="ns-g-chips" role="radiogroup" aria-label={t("guided.tool.sheetGroup")}>
            {SHEETS.map((sheet) => (
              <Pill
                key={sheet}
                name="sheet"
                selected={choices.sheet === sheet}
                onSelect={() => onChange({ sheet })}
              >
                {sheet}
              </Pill>
            ))}
          </div>
          <p className="ns-note">{t("guided.tool.sheetUse")}</p>
        </section>
      </div>
      <Foot>
        <button type="button" className="ns-primary" onClick={onNext}>
          {t("guided.next")}
        </button>
      </Foot>
    </>
  );
}
