import { suggest } from "@nextstroke/coaching";
import { IMAGE_CORNERS, type Quad } from "@nextstroke/compare";
import { newId, type Project, type SuggestionSet } from "@nextstroke/contracts";
import { DATASET } from "@nextstroke/materials";
import {
  addCheckpoint,
  ConflictError,
  createProject,
  deleteProject,
  setReference,
  updateProject,
} from "@nextstroke/projects";
import { t } from "@nextstroke/ui";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { Decoded } from "../compare/decode.ts";
import { Thumb } from "../compare/Thumb.tsx";
import type { CoachDeps } from "./deps.ts";
import {
  choicesFrom,
  DEFAULT_CHOICES,
  defaultTitle,
  type FlowChoices,
  type FlowStep,
  requestFrom,
} from "./flow.ts";
import { ideasLead } from "./labels.ts";
import { CheckScreen } from "./screens/CheckScreen.tsx";
import { GoalScreen } from "./screens/GoalScreen.tsx";
import { IdeasScreen } from "./screens/IdeasScreen.tsx";
import { PhotoScreen } from "./screens/PhotoScreen.tsx";
import { StepsScreen } from "./screens/StepsScreen.tsx";
import { TemplateCard } from "./screens/TemplateCard.tsx";
import { ToolScreen } from "./screens/ToolScreen.tsx";
import { pairsToQuad, quadToPairs } from "./straighten.ts";
import { type Straight, straightView } from "./straightView.ts";
import { useCorners } from "./useCorners.ts";
import { useTemplatePicker } from "./useTemplatePicker.tsx";

const CHECKPOINT_LABELS = {
  title: t("guided.check.photoTitle"),
  back: t("nav.back"),
  next: t("guided.check.compare"),
  input: t("guided.check.photoLabel"),
};

/** A photo's bytes as an immutable asset input. */
async function assetInput(file: File, decoded: Decoded) {
  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    origin: "user-upload" as const,
    mimeType: file.type || "application/octet-stream",
    width: decoded.sourceWidth,
    height: decoded.sourceHeight,
  };
}

const KNOWN = {
  pens: DATASET.fineliners.map((p) => p.id),
  papers: DATASET.papers.map((p) => p.id),
};

/** A stored asset as a bitmap. */
async function decodeAsset(deps: CoachDeps, id: string) {
  const asset = await deps.projects?.store.getAsset(id);
  if (!asset) return null;
  const blob = new Blob([new Uint8Array(asset.bytes)], { type: asset.record.mimeType });
  return deps.decode(blob);
}

/**
 * The guided flow (Phase 3 Task 5, D-067): photo and corners, an optional template (D-070), pen
 * and paper, goal, three ideas, steps, then a checkpoint photo compared with the start and the
 * template. Photos become immutable assets; the request, ideas, chosen idea and corners are saved
 * as revisions. Without storage it still works.
 */
export function GuidedFlow({
  deps,
  projectId = null,
  onExit,
}: {
  deps: CoachDeps;
  /** A saved project to draw on; its original, corners and last choices are restored. */
  projectId?: string | null;
  /** Leaves the flow, with the project's id when there is one. */
  onExit: (projectId: string | null) => void;
}) {
  const [step, setStep] = useState<FlowStep>("photo");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [choices, setChoices] = useState<FlowChoices>(DEFAULT_CHOICES);
  const [suggestions, setSuggestions] = useState<SuggestionSet | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState<number[]>([]);
  /** The straight view of the original sheet. */
  const [straight, setStraight] = useState<Straight | null>(null);
  /** The straight view of the latest checkpoint, and whether it was stored. */
  const [now, setNow] = useState<{ bitmap: ImageBitmap; saved: boolean } | null>(null);
  const original = useCorners(deps.vision ?? null, setStatus);
  const checkpoint = useCorners(deps.vision ?? null, setStatus);
  const checkpointFile = useRef<{ file: File; decoded: Decoded } | null>(null);
  /** The optional template and its corners on its own image (D-070). */
  const [template, setTemplate] = useState<{ bitmap: ImageBitmap; quad: Quad } | null>(null);
  /** The template straightened into the start's frame, for "Vorher und jetzt". */
  const [templateStraight, setTemplateStraight] = useState<ImageBitmap | null>(null);
  const picker = useTemplatePicker(deps, setStatus);
  const project = useRef<Project | null>(null);
  const asked = useRef(false);

  // Drawing on a saved project: straight to the goal with the last choices (D-067).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per project id
  useEffect(() => {
    const projects = deps.projects;
    if (!projectId || !projects) return;
    let live = true;
    void (async () => {
      setBusy(true);
      setStatus(t("project.loading"));
      try {
        const saved = await projects.store.getProject(projectId);
        const asset = saved && (await projects.store.getAsset(saved.originalAssetId));
        if (!saved || !asset) throw new Error("missing");
        const blob = new Blob([new Uint8Array(asset.bytes)], { type: asset.record.mimeType });
        const decoded = await deps.decode(blob);
        if (!live) return;
        project.current = saved;
        asked.current = true;
        if (saved.request) setChoices(choicesFrom(saved.request, KNOWN));
        const quad = saved.paperCorners ? pairsToQuad(saved.paperCorners) : undefined;
        original.start(decoded.bitmap, quad ? { known: quad } : {});
        const templateImage =
          saved.referenceAssetId && (await decodeAsset(deps, saved.referenceAssetId));
        if (templateImage && live) {
          setTemplate({
            bitmap: templateImage.bitmap,
            quad: saved.referenceCorners ? pairsToQuad(saved.referenceCorners) : IMAGE_CORNERS,
          });
        }
        const view = quad && (await straightView(deps, decoded.bitmap, quad));
        if (!live) return;
        setStatus("");
        if (view) {
          setStraight(view);
          go("goal");
        }
      } catch {
        if (live) setStatus(t("project.resumeFailed"));
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [projectId]);

  const exit = () => onExit(project.current?.id ?? null);

  const go = (next: FlowStep) => {
    setStep(next);
    window.scrollTo?.(0, 0);
  };

  const saveFailed = (error: unknown) =>
    setStatus(t(error instanceof ConflictError ? "guided.save.conflict" : "guided.save.failed"));

  /** Saves a change to the project; the flow goes on whether or not it could be stored. */
  const save = async (change: (p: Project) => Project) => {
    const projects = deps.projects;
    const seen = project.current;
    if (!projects || !seen) return;
    try {
      project.current = await updateProject(projects, seen, change);
    } catch (error) {
      saveFailed(error);
    }
  };

  const decode = async (file: File) => {
    setBusy(true);
    setStatus(t("guided.photo.loading"));
    try {
      return await deps.decode(file);
    } catch {
      setStatus(t("guided.photo.failed"));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const pick = async (file: File) => {
    const decoded = await decode(file);
    if (!decoded) return;
    setStraight(null);
    setChoices((c) => ({ ...c, area: null, protectedSpots: [] }));
    original.start(decoded.bitmap);
    const projects = deps.projects;
    if (!projects) return;
    try {
      // A photo replaced before any idea was chosen leaves no project behind.
      const previous = project.current;
      if (previous && !previous.request) {
        project.current = null;
        await deleteProject(projects, previous.id).catch(() => undefined);
      }
      const title = defaultTitle(projects.now());
      project.current = await createProject(projects, title, await assetInput(file, decoded));
      if (!asked.current) {
        asked.current = true;
        const { persisted } = await deps.storage().catch(() => ({ persisted: null }));
        if (!persisted) await deps.persist().catch(() => false);
      }
    } catch {
      setStatus(t("guided.save.failed"));
    }
  };

  /** Straightens the sheet from the corners and saves them; the original stays as it is. */
  const straighten = async () => {
    if (!original.image) return;
    setBusy(true);
    try {
      const view = await straightView(deps, original.image, original.quad);
      if (!view) return setStatus(t("guided.corners.folded"));
      setStraight(view);
      setStatus("");
      go("tool");
      void save((p) => ({ ...p, paperCorners: quadToPairs(original.quad) }));
    } catch {
      setStatus(t("guided.photo.failed"));
    } finally {
      setBusy(false);
    }
  };

  /** A template file was picked: its corner step follows. */
  const pickTemplate = async (file: File) => {
    if (await picker.pick(file)) go("template");
  };

  /** Keeps the template and its corners; stored as the project's reference (D-070). */
  const acceptTemplate = async () => {
    const chosen = picker.chosen();
    if (!chosen) return go("photo");
    setTemplate({ bitmap: chosen.picture.decoded.bitmap, quad: chosen.quad });
    setTemplateStraight(null);
    go("photo");
    const projects = deps.projects;
    const seen = project.current;
    if (!projects || !seen) return setStatus("");
    try {
      project.current = await setReference(projects, seen, {
        image: chosen.picture.asset,
        corners: quadToPairs(chosen.quad),
      });
      setStatus(t("guided.template.saved"));
    } catch (error) {
      saveFailed(error);
    }
  };

  const removeTemplate = async () => {
    setTemplate(null);
    setTemplateStraight(null);
    const projects = deps.projects;
    const seen = project.current;
    if (!projects || !seen?.referenceAssetId) return setStatus(t("guided.template.removed"));
    try {
      project.current = await setReference(projects, seen, null);
      setStatus(t("guided.template.removed"));
    } catch (error) {
      saveFailed(error);
    }
  };

  const showIdeas = () => {
    const marked = straight?.bitmap ?? original.image;
    const aspect = marked ? marked.width / marked.height : 1;
    const request = requestFrom(choices, aspect, straight?.map);
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

  const pickCheckpoint = async (file: File) => {
    const decoded = await decode(file);
    if (!decoded) return;
    checkpointFile.current = { file, decoded };
    checkpoint.start(decoded.bitmap);
    go("checkPhoto");
  };

  /** Straightens the checkpoint into the original's frame, stores it, and shows both. */
  const compareCheckpoint = async () => {
    const taken = checkpointFile.current;
    if (!checkpoint.image || !straight || !taken) return;
    setBusy(true);
    try {
      const size = { width: straight.bitmap.width, height: straight.bitmap.height };
      const view = await straightView(deps, checkpoint.image, checkpoint.quad, size);
      if (!view) return setStatus(t("guided.corners.folded"));
      if (template && !templateStraight) {
        const shown = await straightView(deps, template.bitmap, template.quad, size);
        if (shown) setTemplateStraight(shown.bitmap);
      }
      let saved = false;
      const projects = deps.projects;
      const seen = project.current;
      if (projects && seen) {
        try {
          project.current = await addCheckpoint(
            projects,
            seen,
            await assetInput(taken.file, taken.decoded),
            { paperCorners: quadToPairs(checkpoint.quad) },
          );
          saved = true;
        } catch (error) {
          saveFailed(error);
        }
      }
      setNow({ bitmap: view.bitmap, saved });
      if (saved) setStatus("");
      go("check");
    } catch {
      setStatus(t("guided.photo.failed"));
    } finally {
      setBusy(false);
    }
  };

  const change = (next: Partial<FlowChoices>) => setChoices((c) => ({ ...c, ...next }));
  const pen = DATASET.fineliners.find((p) => p.id === choices.finelinerId);
  const paper = DATASET.papers.find((p) => p.id === choices.paperId);
  const idea = suggestions && selected !== null ? suggestions.ideas[selected] : undefined;
  const takeCheckpoint = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void pickCheckpoint(file);
  };

  return (
    <div className="ns-g">
      {step === "photo" && (
        <PhotoScreen
          image={original.image}
          corners={original.props}
          busy={busy}
          status={status}
          onPick={(file) => void pick(file)}
          onCancel={exit}
          onNext={() => void straighten()}
          template={
            original.image ? (
              <TemplateCard
                preview={template ? <Thumb image={template.bitmap} width={56} height={70} /> : null}
                busy={picker.busy || busy}
                onPick={(file) => void pickTemplate(file)}
                onRemove={() => void removeTemplate()}
              />
            ) : null
          }
        />
      )}
      {step === "template" &&
        picker.screen(
          status,
          () => void acceptTemplate(),
          () => go("photo"),
        )}
      {step !== "template" && picker.dialog}
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
          image={straight?.bitmap ?? original.image}
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
          onDone={exit}
          foot={
            <label className="ns-primary ns-g-primary-file">
              {t("guided.check.take")}
              <input
                type="file"
                accept="image/*"
                className="ns-hidden-input"
                aria-label={t("guided.check.photoLabel")}
                onChange={takeCheckpoint}
                disabled={busy}
              />
            </label>
          }
        />
      )}
      {step === "checkPhoto" && (
        <PhotoScreen
          labels={CHECKPOINT_LABELS}
          image={checkpoint.image}
          corners={checkpoint.props}
          busy={busy}
          status={status}
          onPick={(file) => void pickCheckpoint(file)}
          onCancel={() => go("steps")}
          onNext={() => void compareCheckpoint()}
        />
      )}
      {step === "check" && straight && now && (
        <CheckScreen
          before={straight.bitmap}
          template={templateStraight}
          now={now.bitmap}
          saved={now.saved}
          onBack={() => go("steps")}
          onDone={exit}
          onNext={() => go("goal")}
        />
      )}
      {step !== "photo" && step !== "checkPhoto" && step !== "template" && status && (
        <p className="ns-toast ns-g-toast" role="status">
          {status}
        </p>
      )}
    </div>
  );
}
