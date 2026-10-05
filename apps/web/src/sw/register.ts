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
): (worker: ServiceWorker) => void {
  let requested = false;
  container.addEventListener("controllerchange", () => {
    if (requested) reload();
  });
  return (worker) => {
    requested = true;
    activateUpdate(worker);
  };
}
