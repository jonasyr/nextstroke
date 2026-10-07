import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { parseLocation } from "./routing/routes.ts";
import "./styles.css";
import { applyWhenIdle, reloadOnRequestedUpdate, watchForUpdate } from "./sw/register.ts";

const element = document.getElementById("root");
if (!element) throw new Error("missing #root element");
const root = createRoot(element);
const render = (onReloadForUpdate?: () => void) =>
  root.render(
    <StrictMode>
      <App {...(onReloadForUpdate ? { onReloadForUpdate } : {})} />
    </StrictMode>,
  );
render();

/** The start screen holds nothing unsaved: projects live in IndexedDB, other screens unmount. */
const idle = () => {
  const { route, id } = parseLocation(window.location.hash);
  return (
    document.visibilityState === "visible" && (route === "home" || (route === "projects" && !id))
  );
};

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  const update = reloadOnRequestedUpdate(navigator.serviceWorker, () => window.location.reload());
  navigator.serviceWorker.register("./sw.js").then((registration) => {
    watchForUpdate(registration, hadController, (worker) => {
      render(() => update(worker));
      applyWhenIdle(
        idle,
        () => update(worker),
        (check) => {
          window.addEventListener("hashchange", check);
          document.addEventListener("visibilitychange", check);
          return () => {
            window.removeEventListener("hashchange", check);
            document.removeEventListener("visibilitychange", check);
          };
        },
      );
    });
    // The installed app may stay in memory for days: look for a new version on every return.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") registration.update().catch(() => undefined);
    });
  });
}
