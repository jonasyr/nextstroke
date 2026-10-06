import type { Project } from "@nextstroke/contracts";
import { describeStorage, importProject, PackageError } from "@nextstroke/projects";
import { t } from "@nextstroke/ui";
import { ChevronRight, PenLine, SquareStack } from "lucide-react";
import { type ChangeEvent, useEffect, useState } from "react";
import { ICON } from "../compare/IconButton.tsx";
import { hrefFor, hrefWith } from "../routing/routes.ts";
import { AssetImage } from "./AssetImage.tsx";
import type { CoachDeps } from "./deps.ts";
import { projectLine, sortProjects } from "./home.ts";

/**
 * Start (D-067): two ways in, coach or quick compare, then the projects on this device with
 * what the browser promises about keeping them.
 */
export function Home({
  deps,
  now,
  navigate,
}: {
  deps: CoachDeps;
  now: () => string;
  navigate: (hash: string) => void;
}) {
  const store = deps.projects?.store;
  const [status, setStatus] = useState("");

  /** Opens a saved project file; it is checked completely before anything is stored. */
  const open = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const projects = deps.projects;
    if (!file || !projects) return;
    setStatus(t("home.importing"));
    try {
      const project = await importProject(projects, new Uint8Array(await file.arrayBuffer()));
      navigate(hrefWith("projects", project.id));
    } catch (error) {
      setStatus(error instanceof PackageError ? error.message : t("project.resumeFailed"));
    }
  };
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    store
      ?.listProjects()
      .then((list) => live && setProjects(sortProjects(list)))
      .catch(() => live && setProjects([]));
    deps
      .storage()
      .then((status) => live && setNotes(describeStorage(status)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [deps, store]);
  return (
    <div className="ns-start ns-home">
      <div className="ns-start-top">
        <span className="ns-wordmark">{t("app.name")}</span>
      </div>
      <h1 className="ns-lead">{t("home.lead")}</h1>
      <div className="ns-stack">
        <a className="ns-choice ns-choice-main" href={hrefFor("guided")}>
          <span className="ns-choice-icon ns-choice-icon-main">
            <PenLine {...ICON} />
          </span>
          <span>
            <b>{t("home.coach.title")}</b>
            <span className="ns-muted">{t("home.coach.hint")}</span>
          </span>
        </a>
        <a className="ns-choice" href={hrefFor("compare")}>
          <span className="ns-choice-icon">
            <SquareStack {...ICON} />
          </span>
          <span>
            <b>{t("home.compare.title")}</b>
            <span className="ns-muted">{t("home.compare.hint")}</span>
          </span>
        </a>
      </div>
      <section className="ns-stack" aria-labelledby="ns-projects">
        <h2 id="ns-projects" className="ns-label">
          {t("home.projects")}
        </h2>
        {!store && <p className="ns-muted">{t("home.unavailable")}</p>}
        {store && projects?.length === 0 && <p className="ns-muted">{t("home.empty")}</p>}
        {store && projects && projects.length > 0 && (
          <ul className="ns-projects">
            {projects.map((project) => (
              <li key={project.id}>
                <a className="ns-project" href={hrefWith("projects", project.id)}>
                  <AssetImage
                    store={store}
                    assetId={project.checkpoints.at(-1)?.assetId ?? project.originalAssetId}
                    className="ns-project-thumb"
                  />
                  <span className="ns-project-text">
                    <b>{project.title}</b>
                    <small className="ns-muted">{projectLine(project, now())}</small>
                  </span>
                  <ChevronRight {...ICON} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
        {store && (
          <label className="ns-text ns-accent ns-g-file">
            {t("home.import")}
            <input
              type="file"
              accept=".zip,application/zip"
              className="ns-hidden-input"
              aria-label={t("home.importLabel")}
              onChange={(e) => void open(e)}
            />
          </label>
        )}
        <p className="ns-status" role="status" aria-live="polite">
          {status}
        </p>
        {store &&
          notes.map((note) => (
            <p key={note} className="ns-note">
              {note}
            </p>
          ))}
      </section>
    </div>
  );
}
