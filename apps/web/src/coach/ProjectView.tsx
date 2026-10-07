import type { Project } from "@nextstroke/contracts";
import { deleteProject, describeStorage, exportProject, setReference } from "@nextstroke/projects";
import { t } from "@nextstroke/ui";
import { useEffect, useState } from "react";
import { hrefFor, hrefWith } from "../routing/routes.ts";
import { APP_VERSION } from "../version.ts";
import { AssetImage } from "./AssetImage.tsx";
import type { CoachDeps } from "./deps.ts";
import { shortDate } from "./flow.ts";
import { FlowBar, Foot } from "./screens/parts.tsx";
import { TemplateCard } from "./screens/TemplateCard.tsx";
import { quadToPairs } from "./straighten.ts";
import { useTemplatePicker } from "./useTemplatePicker.tsx";

/** A file name from the project title: letters, digits and dashes only. */
export function exportName(title: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${base || "projekt"}.nextstroke.zip`;
}

/**
 * One project (Phase 3 Task 5): the start and every checkpoint, the optional template (D-070),
 * the idea chosen last, comparing in Quick Compare, saving the project as a file, deleting it,
 * and drawing on.
 */
export function ProjectView({
  deps,
  id,
  navigate,
}: {
  deps: CoachDeps;
  id: string;
  navigate: (hash: string) => void;
}) {
  const projects = deps.projects;
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  /** "template" while the corners of a newly picked template are placed. */
  const [mode, setMode] = useState<"view" | "template">("view");
  const picker = useTemplatePicker(deps, setStatus);

  useEffect(() => {
    let live = true;
    (projects?.store.getProject(id) ?? Promise.resolve(null))
      .then((p) => live && setProject(p))
      .catch(() => live && setProject(null));
    deps
      .storage()
      .then((s) => live && setNotes(describeStorage(s)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [projects, deps, id]);

  const home = () => navigate(hrefFor("home"));
  if (project === undefined) {
    return (
      <div className="ns-g">
        <p className="ns-status ns-g-body">{t("project.loading")}</p>
      </div>
    );
  }
  if (!project || !projects) {
    return (
      <div className="ns-g">
        <FlowBar back={home} backLabel={t("project.back")} title="" />
        <p className="ns-g-body">{t("project.missing")}</p>
      </div>
    );
  }

  const changeTemplate = async (picked: { image: Parameters<typeof setReference>[2] } | null) => {
    try {
      setProject(await setReference(projects, project, picked?.image ?? null));
      setStatus(t(picked ? "guided.template.saved" : "guided.template.removed"));
    } catch {
      setStatus(t("guided.save.failed"));
    }
  };

  if (mode === "template") {
    return (
      <div className="ns-g">
        {picker.screen(
          status,
          () => {
            const chosen = picker.chosen();
            setMode("view");
            if (chosen) {
              void changeTemplate({
                image: { image: chosen.picture.asset, corners: quadToPairs(chosen.quad) },
              });
            }
          },
          () => setMode("view"),
        )}
      </div>
    );
  }

  const comparable = Boolean(project.referenceAssetId || project.checkpoints.length);

  const idea =
    project.suggestions && project.selectedIdea !== undefined
      ? project.suggestions.ideas[project.selectedIdea]
      : undefined;

  const save = async () => {
    try {
      const zip = await exportProject(projects, project.id, APP_VERSION);
      const name = exportName(project.title);
      deps.download(new File([new Uint8Array(zip)], name, { type: "application/zip" }));
      setStatus(t("project.exported", { name }));
    } catch {
      setStatus(t("project.exportFailed"));
    }
  };

  const remove = async () => {
    if (!confirming) return setConfirming(true);
    await deleteProject(projects, project.id);
    home();
  };

  return (
    <div className="ns-g">
      <FlowBar back={home} backLabel={t("project.back")} title={project.title} />
      <div className="ns-g-body">
        <ul className="ns-g-timeline">
          {[
            { assetId: project.originalAssetId, createdAt: project.createdAt },
            ...project.checkpoints,
          ].map((shot, i) => (
            <li key={shot.assetId}>
              <AssetImage store={projects.store} assetId={shot.assetId} className="ns-g-shot" />
              <span className="ns-note">
                {i === 0
                  ? t("project.start", { date: shortDate(shot.createdAt) })
                  : t("project.checkpoint", { n: String(i) })}
              </span>
            </li>
          ))}
        </ul>
        <TemplateCard
          preview={
            project.referenceAssetId ? (
              <AssetImage
                store={projects.store}
                assetId={project.referenceAssetId}
                className="ns-g-shot"
              />
            ) : null
          }
          busy={picker.busy}
          onPick={(file) =>
            void picker.pick(file).then((ok) => {
              if (ok) setMode("template");
            })
          }
          onRemove={() => void changeTemplate(null)}
        />
        <section className="ns-stack">
          <h2 className="ns-label">{t("project.last")}</h2>
          <p>{idea ? idea.title : t("project.noIdea")}</p>
        </section>
        <section className="ns-stack">
          {comparable && (
            <a className="ns-g-secondary ns-g-link-button" href={hrefWith("compare", project.id)}>
              {t("project.compare")}
            </a>
          )}
          <button type="button" className="ns-g-secondary" onClick={() => void save()}>
            {t("project.export")}
          </button>
          <button type="button" className="ns-text ns-g-danger" onClick={() => void remove()}>
            {t(confirming ? "project.deleteConfirm" : "project.delete")}
          </button>
          {picker.dialog}
          {notes.map((note) => (
            <p key={note} className="ns-note">
              {note}
            </p>
          ))}
          <p className="ns-status" role="status" aria-live="polite">
            {status}
          </p>
        </section>
      </div>
      <Foot>
        <a className="ns-primary ns-g-primary-file" href={hrefWith("guided", project.id)}>
          {t("project.continue")}
        </a>
      </Foot>
    </div>
  );
}
