import type { Project } from "@nextstroke/contracts";
import { deleteProject, describeStorage, exportProject } from "@nextstroke/projects";
import { t } from "@nextstroke/ui";
import { useEffect, useState } from "react";
import { hrefFor, hrefWith } from "../routing/routes.ts";
import { APP_VERSION } from "../version.ts";
import { AssetImage } from "./AssetImage.tsx";
import type { CoachDeps } from "./deps.ts";
import { shortDate } from "./flow.ts";
import { FlowBar, Foot } from "./screens/parts.tsx";

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
 * One project (Phase 3 Task 5): the start and every checkpoint, the idea chosen last, saving
 * the project as a file, deleting it, and drawing on.
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
  if (project === undefined) return <p className="ns-status ns-g-body">{t("project.loading")}</p>;
  if (!project || !projects) {
    return (
      <>
        <FlowBar back={home} backLabel={t("project.back")} title="" />
        <p className="ns-g-body">{t("project.missing")}</p>
      </>
    );
  }

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
    <>
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
        <section className="ns-group">
          <h2 className="ns-label">{t("project.last")}</h2>
          <p>{idea ? idea.title : t("project.noIdea")}</p>
        </section>
        <section className="ns-group">
          <button type="button" className="ns-g-secondary" onClick={() => void save()}>
            {t("project.export")}
          </button>
          <button type="button" className="ns-text ns-g-danger" onClick={() => void remove()}>
            {t(confirming ? "project.deleteConfirm" : "project.delete")}
          </button>
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
    </>
  );
}
