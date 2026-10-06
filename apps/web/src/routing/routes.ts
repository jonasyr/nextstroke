/** Hash routes: static hosting on ChatGPT Sites needs no server rewrites (D-038). */
export const ROUTES = ["home", "compare", "projects", "guided"] as const;
export type Route = (typeof ROUTES)[number];

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "").split(/[?#/]/)[0] ?? "";
  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : "home";
}

export function hrefFor(route: Route): string {
  return route === "home" ? "#/" : `#/${route}`;
}

/** A route and its id, e.g. `#/projects/prj_…` → projects, prj_…; ids are entity ids only. */
export function parseLocation(hash: string): { route: Route; id: string | null } {
  const [, id] = hash.replace(/^#\/?/, "").split(/[?#]/)[0]?.split("/") ?? [];
  return { route: parseRoute(hash), id: id && /^[a-z]{2,4}_[0-9a-z]{4,64}$/.test(id) ? id : null };
}

export function hrefWith(route: Route, id: string): string {
  return `#/${route}/${id}`;
}
