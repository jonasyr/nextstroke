import { useSyncExternalStore } from "react";
import { parseLocation, type Route } from "./routes.ts";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** The current route with its id; the hash string is the snapshot, so it stays stable. */
export function useLocation(): { route: Route; id: string | null } {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return parseLocation(hash);
}
