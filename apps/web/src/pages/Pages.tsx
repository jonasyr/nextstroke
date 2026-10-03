import { type MessageKey, t } from "@nextstroke/ui";
import { browserDeps } from "../compare/browser.ts";
import { QuickCompare } from "../compare/QuickCompare.tsx";
import type { Route } from "../routing/routes.ts";

export const TITLES: Record<Route, MessageKey> = {
  home: "nav.home",
  compare: "nav.compare",
  projects: "nav.projects",
  guided: "nav.guided",
};

const INTROS: Record<Route, MessageKey> = {
  home: "page.home.intro",
  compare: "page.compare.intro",
  projects: "page.projects.intro",
  guided: "page.guided.intro",
};

export function Page({ route }: { route: Route }) {
  return (
    <>
      <h1>{t(TITLES[route])}</h1>
      <p>{t(INTROS[route])}</p>
      {route === "compare" && <QuickCompare deps={browserDeps} />}
      {(route === "projects" || route === "guided") && (
        <p className="ns-muted">{t("page.notReady")}</p>
      )}
    </>
  );
}
