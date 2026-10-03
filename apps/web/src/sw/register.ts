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
