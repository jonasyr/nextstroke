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
