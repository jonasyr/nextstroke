import { browserCoachDeps } from "../coach/browser.ts";
import type { CoachDeps } from "../coach/deps.ts";
import { GuidedFlow } from "../coach/GuidedFlow.tsx";
import { Home } from "../coach/Home.tsx";
import { ProjectView } from "../coach/ProjectView.tsx";
import { browserDeps } from "../compare/browser.ts";
import { type CompareDeps, QuickCompare } from "../compare/QuickCompare.tsx";
import { hrefFor, hrefWith, type Route } from "../routing/routes.ts";

const navigate = (hash: string) => {
  window.location.hash = hash;
};
const goHome = () => navigate(hrefFor("home"));

/**
 * Start offers the coach and Quick Compare (D-067); there is still no global navigation
 * (D-056): every screen has its own way back.
 */
export function Page({
  route,
  id = null,
  coach = browserCoachDeps,
  compare = browserDeps,
}: {
  route: Route;
  id?: string | null;
  coach?: CoachDeps;
  compare?: CompareDeps;
}) {
  if (route === "compare") return <QuickCompare deps={compare} onHome={goHome} />;
  if (route === "projects" && id)
    return <ProjectView key={id} deps={coach} id={id} navigate={navigate} />;
  if (route === "home" || route === "projects") {
    return <Home deps={coach} now={() => new Date().toISOString()} navigate={navigate} />;
  }
  return (
    <GuidedFlow
      key={id ?? "new"}
      deps={coach}
      projectId={id}
      onExit={(projectId) =>
        navigate(projectId ? hrefWith("projects", projectId) : hrefFor("home"))
      }
    />
  );
}
