import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./styles.css";
import { reloadOnRequestedUpdate, watchForUpdate } from "./sw/register.ts";

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

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  const update = reloadOnRequestedUpdate(navigator.serviceWorker, () => window.location.reload());
  navigator.serviceWorker
    .register("./sw.js")
    .then((registration) =>
      watchForUpdate(registration, hadController, (worker) => render(() => update(worker))),
    );
}
