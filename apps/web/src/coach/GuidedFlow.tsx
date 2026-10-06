import { suggest } from "@nextstroke/coaching";
import { moveCorner, type Point, type Quad } from "@nextstroke/compare";
import { newId, type Project, type SuggestionSet } from "@nextstroke/contracts";
import { warpPerspective } from "@nextstroke/imaging";
import { DATASET } from "@nextstroke/materials";
import { ConflictError, createProject, deleteProject, updateProject } from "@nextstroke/projects";
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
import { guessCorners, INSET_CORNERS, snapCorner } from "./paper.ts";
import { GoalScreen } from "./screens/GoalScreen.tsx";
import { IdeasScreen } from "./screens/IdeasScreen.tsx";
import { PhotoScreen } from "./screens/PhotoScreen.tsx";
import { StepsScreen } from "./screens/StepsScreen.tsx";
import { ToolScreen } from "./screens/ToolScreen.tsx";
import { quadToPairs, straightPointMapper, straightSize, straightToSource } from "./straighten.ts";

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
  const [quad, setQuad] = useState<Quad>(INSET_CORNERS);
  const [unsure, setUnsure] = useState<number[]>([]);
  /** The straight view of the sheet and the map from it back to the original. */
  const [straight, setStraight] = useState<{
    bitmap: ImageBitmap;
    map: (p: [number, number]) => [number, number];
  } | null>(null);
  const project = useRef<Project | null>(null);
  const asked = useRef(false);
  /** Set once the user moves a ring, so a late automatic guess does not overwrite it. */
  const moved = useRef(false);
  /** Where each ring snapped before (D-062). */
  const snaps = useRef(new Map<number, Point[]>());

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
      setStraight(null);
      setChoices((c) => ({ ...c, area: null, protectedSpots: [] }));
      setQuad(INSET_CORNERS);
      setUnsure([]);
      moved.current = false;
      snaps.current = new Map();
      setStatus(t("guided.corners.finding"));
      void findCorners(decoded.bitmap);
      const projects = deps.projects;
      if (!projects) return;
      try {
        // A photo replaced before any idea was chosen leaves no project behind.
        const previous = project.current;
        if (previous && !previous.request) {
          project.current = null;
          await deleteProject(projects, previous.id).catch(() => undefined);
        }
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

  /** The automatic guess, unless the user already moved a ring. */
  const findCorners = async (bitmap: ImageBitmap) => {
    const guess = await guessCorners(deps.vision ?? null, bitmap);
    if (moved.current) return;
    setQuad(guess.quad);
    setUnsure(guess.unsure);
    setStatus(
      t(
        !guess.found
          ? "guided.corners.missing"
          : guess.unsure.length
            ? "guided.corners.check"
            : "guided.corners.found",
      ),
    );
  };

  const moveRing = (index: number, point: Point) => {
    moved.current = true;
    setQuad((q) => moveCorner(q, index, point));
    setUnsure((u) => u.filter((i) => i !== index));
  };

  const dropRing = async (index: number) => {
    if (!image) return;
    const earlier = snaps.current.get(index) ?? [];
    const found = await snapCorner(deps.vision ?? null, image, quad, index, earlier);
    if (!found) return;
    snaps.current.set(index, [...earlier, found]);
    setQuad((q) => moveCorner(q, index, found));
    setStatus(t("status.snapped"));
  };

  /** Straightens the sheet from the corners and saves them; the original stays as it is. */
  const straighten = async () => {
    if (!image) return;
    const size = straightSize(quad, image.width, image.height);
    const toSource = straightToSource(quad, image.width, image.height, size);
    const map = straightPointMapper(quad);
    if (!toSource || !map) {
      setStatus(t("guided.corners.folded"));
      return;
    }
    setBusy(true);
    try {
      const pixels = warpPerspective(deps.rgba(image), toSource, size.width, size.height);
      setStraight({ bitmap: await deps.fromRgba(pixels), map });
      setStatus("");
      go("tool");
      void save((p) => ({ ...p, paperCorners: quadToPairs(quad) }));
    } catch {
      setStatus(t("guided.photo.failed"));
    } finally {
      setBusy(false);
    }
  };

  const showIdeas = () => {
    const marked = straight?.bitmap ?? image;
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

  const change = (next: Partial<FlowChoices>) => setChoices((c) => ({ ...c, ...next }));
  const pen = DATASET.fineliners.find((p) => p.id === choices.finelinerId);
  const paper = DATASET.papers.find((p) => p.id === choices.paperId);
  const idea = suggestions && selected !== null ? suggestions.ideas[selected] : undefined;

  return (
    <div className="ns-g">
      {step === "photo" && (
        <PhotoScreen
          image={image}
          corners={
            image ? { quad, unsure, onMove: moveRing, onDrop: (i) => void dropRing(i) } : null
          }
          busy={busy}
          status={status}
          onPick={(file) => void pick(file)}
          onCancel={onExit}
          onNext={() => void straighten()}
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
          image={straight?.bitmap ?? image}
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
