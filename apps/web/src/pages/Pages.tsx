import { t } from "@nextstroke/ui";
import { browserDeps } from "../compare/browser.ts";
import { QuickCompare } from "../compare/QuickCompare.tsx";
import type { Route } from "../routing/routes.ts";

/**
 * v0.1 has no global navigation (D-056): Start is Quick Compare. Projects and guided coaching
 * keep their routes for later phases but are not linked from the app yet.
 */
export function Page({ route }: { route: Route }) {
  if (route === "home" || route === "compare") return <QuickCompare deps={browserDeps} />;
  return (
    <div className="ns-later">
      <h1>{t(route === "projects" ? "nav.projects" : "nav.guided")}</h1>
      <p>{t(route === "projects" ? "page.projects.intro" : "page.guided.intro")}</p>
      <p className="ns-muted">{t("page.notReady")}</p>
      <a href="#/">{t("page.toCompare")}</a>
    </div>
  );
}
