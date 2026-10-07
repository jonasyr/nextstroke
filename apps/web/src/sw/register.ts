/** Detect a waiting service worker so the UI can offer a reload instead of silently swapping. */
export function watchForUpdate(
  registration: ServiceWorkerRegistration,
  hasController: boolean,
  onUpdate: (worker: ServiceWorker) => void,
): void {
  if (registration.waiting) {
    onUpdate(registration.waiting);
    return;
  }
  registration.addEventListener("updatefound", () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed" && hasController) onUpdate(worker);
    });
  });
}

export function activateUpdate(worker: ServiceWorker): void {
  worker.postMessage("SKIP_WAITING");
}

/**
 * Reload when a new worker takes control, but only after the user asked for the update. iOS
 * Safari can hand control to a waiting worker by itself, e.g. while the photo picker or the
 * camera puts the page in the background; an automatic reload then threw away the images the
 * user was loading (owner report 2026-10-05). Returns the "update now" action for the banner.
 */
export function reloadOnRequestedUpdate(
  container: EventTarget,
  reload: () => void,
  whenIdle: (run: () => void) => void = (run) => run(),
): (worker: ServiceWorker, options?: { automatic?: boolean }) => void {
  let requested: "user" | "automatic" | null = null;
  container.addEventListener("controllerchange", () => {
    if (requested === "user") reload();
    // iOS may hand control over long after the request, e.g. while the photo picker is open
    // in the coach (owner report 2026-10-07): an automatic update reloads only when idle.
    else if (requested === "automatic") whenIdle(reload);
  });
  return (worker, options = {}) => {
    if (requested !== "user") requested = options.automatic ? "automatic" : "user";
    activateUpdate(worker);
  };
}

/**
 * Applies an update by itself at a moment without work in progress (`isIdle`), checked now and
 * whenever `subscribe` reports a change (navigation, returning to the app). The installed iPhone
 * app rarely shows the update banner, so it kept running an old version (owner, 2026-10-07).
 * Returns a function that stops waiting.
 */
export function applyWhenIdle(
  isIdle: () => boolean,
  apply: () => void,
  subscribe: (check: () => void) => () => void,
): () => void {
  let done = false;
  let unsubscribe = () => {};
  const check = () => {
    if (done || !isIdle()) return;
    done = true;
    unsubscribe();
    apply();
  };
  unsubscribe = subscribe(check);
  check();
  return () => {
    done = true;
    unsubscribe();
  };
}
