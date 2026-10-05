import { t } from "@nextstroke/ui";
import { browserCoachDeps } from "../coach/browser.ts";
import type { CoachDeps } from "../coach/deps.ts";
import { Home } from "../coach/Home.tsx";
import { browserDeps } from "../compare/browser.ts";
import { type CompareDeps, QuickCompare } from "../compare/QuickCompare.tsx";
import { hrefFor, type Route } from "../routing/routes.ts";

const goHome = () => {
  window.location.hash = hrefFor("home");
};

/**
 * Start offers the coach and Quick Compare (D-067); there is still no global navigation
 * (D-056): every screen has its own way back.
 */
export function Page({
  route,
  coach = browserCoachDeps,
  compare = browserDeps,
}: {
  route: Route;
  id?: string | null;
  coach?: CoachDeps;
  compare?: CompareDeps;
}) {
  if (route === "compare") return <QuickCompare deps={compare} onHome={goHome} />;
  if (route === "home" || route === "projects") {
    return <Home deps={coach} now={() => new Date().toISOString()} />;
  }
  return (
    <div className="ns-later">
      <h1>{t("nav.guided")}</h1>
      <p>{t("page.guided.intro")}</p>
      <p className="ns-muted">{t("page.notReady")}</p>
      <a href={hrefFor("home")}>{t("page.toHome")}</a>
    </div>
  );
}
