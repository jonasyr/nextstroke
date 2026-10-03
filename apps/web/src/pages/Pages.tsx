import { type MessageKey, t } from "@nextstroke/ui";
import { useState } from "react";
import { Immersive } from "../Immersive.tsx";
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
  const [immersive, setImmersive] = useState(false);
  return (
    <>
      <h1>{t(TITLES[route])}</h1>
      <p>{t(INTROS[route])}</p>
      {route === "compare" && (
        <button type="button" onClick={() => setImmersive(true)}>
          {t("immersive.open")}
        </button>
      )}
      {route !== "home" && <p className="ns-muted">{t("page.notReady")}</p>}
      {immersive && <Immersive onClose={() => setImmersive(false)}>{null}</Immersive>}
    </>
  );
}
