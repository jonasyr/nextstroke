import type { Project } from "@nextstroke/contracts";
import { t } from "@nextstroke/ui";
import { shortDate } from "./flow.ts";

/** "2 Zwischenstände · gestern": what the projects list says about one project. */
export function projectLine(project: Project, nowIso: string): string {
  const count = project.checkpoints.length;
  const checkpoints =
    count === 0
      ? t("home.checkpoints.none")
      : count === 1
        ? t("home.checkpoints.one")
        : t("home.checkpoints.many", { count: String(count) });
  return `${checkpoints} · ${whenLabel(project.updatedAt, nowIso)}`;
}

const DAY = 24 * 60 * 60 * 1000;

/** Calendar days in UTC, so tests do not depend on the machine's time zone. */
export function whenLabel(iso: string, nowIso: string): string {
  const days = Math.floor(Date.parse(nowIso) / DAY) - Math.floor(Date.parse(iso) / DAY);
  if (days <= 0) return t("home.when.today");
  if (days === 1) return t("home.when.yesterday");
  if (days < 7) return t("home.when.days", { days: String(days) });
  return shortDate(iso);
}

/** Newest first. */
export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
