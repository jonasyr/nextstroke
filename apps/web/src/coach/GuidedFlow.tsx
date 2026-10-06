import { suggest } from "@nextstroke/coaching";
import { newId, type Project, type SuggestionSet } from "@nextstroke/contracts";
import { DATASET } from "@nextstroke/materials";
import { ConflictError, createProject, updateProject } from "@nextstroke/projects";
import { t } from "@nextstroke/ui";
import { useRef, useState } from "react";
import type { CoachDeps } from "./deps.ts";
import {
  DEFAULT_CHOICES,
  defaultTitle,
  type FlowChoices,
  type FlowStep,
  requestFrom,
} from "./flow.ts";
import { ideasLead } from "./labels.ts";
import { GoalScreen } from "./screens/GoalScreen.tsx";
import { IdeasScreen } from "./screens/IdeasScreen.tsx";
import { PhotoScreen } from "./screens/PhotoScreen.tsx";
import { StepsScreen } from "./screens/StepsScreen.tsx";
import { ToolScreen } from "./screens/ToolScreen.tsx";

/**
 * The guided flow (Phase 3 Task 5, D-067): photo, pen and paper, goal, three ideas, steps.
 * The photo becomes the project's immutable original; the request, the ideas and the chosen
 * one are saved as the project's next revisions. Without storage the flow still works.
 */
export function GuidedFlow({ deps, onExit }: { deps: CoachDeps; onExit: () => void }) {
  const [step, setStep] = useState<FlowStep>("photo");
  const [image, setImage] = useState<ImageBitmap | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [choices, setChoices] = useState<FlowChoices>(DEFAULT_CHOICES);
  const [suggestions, setSuggestions] = useState<SuggestionSet | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  const project = useRef<Project | null>(null);
  const asked = useRef(false);

  const go = (next: FlowStep) => {
    setStep(next);
    window.scrollTo?.(0, 0);
  };

  /** Saves a change to the project; the flow goes on whether or not it could be stored. */
  const save = async (change: (p: Project) => Project) => {
    const projects = deps.projects;
    const seen = project.current;
    if (!projects || !seen) return;
    try {
      project.current = await updateProject(projects, seen, change);
    } catch (error) {
      setStatus(t(error instanceof ConflictError ? "guided.save.conflict" : "guided.save.failed"));
    }
  };

  const pick = async (file: File) => {
    setBusy(true);
    setStatus(t("guided.photo.loading"));
    try {
      const decoded = await deps.decode(file);
      setImage(decoded.bitmap);
      setStatus("");
      const projects = deps.projects;
      if (!projects) return;
      try {
        project.current = await createProject(projects, defaultTitle(projects.now()), {
          bytes: new Uint8Array(await file.arrayBuffer()),
          origin: "user-upload",
          mimeType: file.type || "application/octet-stream",
          width: decoded.sourceWidth,
          height: decoded.sourceHeight,
        });
        if (!asked.current) {
          asked.current = true;
          const { persisted } = await deps.storage().catch(() => ({ persisted: null }));
          if (!persisted) await deps.persist().catch(() => false);
        }
      } catch {
        setStatus(t("guided.save.failed"));
      }
    } catch {
      setStatus(t("guided.photo.failed"));
    } finally {
      setBusy(false);
    }
  };

  const showIdeas = () => {
    const aspect = image ? image.width / image.height : 1;
    const request = requestFrom(choices, aspect);
    const set = suggest(request, DATASET, deps.projects?.id("sug") ?? newId("sug"));
    setSuggestions(set);
    setSelected(null);
    go("ideas");
    void save((p) => {
      const { selectedIdea: _, ...rest } = p;
      return { ...rest, request, suggestions: set };
    });
  };

  const pickIdea = (index: number) => {
    setSelected(index);
    setDone([]);
    go("steps");
    void save((p) => ({ ...p, selectedIdea: index }));
  };

  const change = (next: Partial<FlowChoices>) => setChoices((c) => ({ ...c, ...next }));
  const pen = DATASET.fineliners.find((p) => p.id === choices.finelinerId);
  const paper = DATASET.papers.find((p) => p.id === choices.paperId);
  const idea = suggestions && selected !== null ? suggestions.ideas[selected] : undefined;

  return (
    <div className="ns-g">
      {step === "photo" && (
        <PhotoScreen
          image={image}
          busy={busy}
          status={status}
          onPick={(file) => void pick(file)}
          onCancel={onExit}
          onNext={() => go("tool")}
        />
      )}
      {step === "tool" && (
        <ToolScreen
          choices={choices}
          onChange={change}
          onBack={() => go("photo")}
          onNext={() => go("goal")}
        />
      )}
      {step === "goal" && (
        <GoalScreen
          image={image}
          choices={choices}
          onChange={change}
          onBack={() => go("tool")}
          onNext={showIdeas}
        />
      )}
      {step === "ideas" && suggestions && (
        <IdeasScreen
          lead={ideasLead(choices.intent, pen, choices.tipMm, paper)}
          suggestions={suggestions}
          onBack={() => go("goal")}
          onPick={pickIdea}
        />
      )}
      {step === "steps" && idea && (
        <StepsScreen
          idea={idea}
          skill={choices.skill}
          done={done}
          onToggle={(i) => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))}
          onBack={() => go("ideas")}
          primary={{ label: t("guided.steps.doneForToday"), onClick: onExit }}
        />
      )}
      {step !== "photo" && status && (
        <p className="ns-toast ns-g-toast" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
