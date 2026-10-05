import { describe, expect, it } from "vitest";
import { hrefFor, hrefWith, parseLocation, parseRoute, ROUTES } from "./routes.ts";

describe("hash routes (D-038: hash routing, no server rewrites)", () => {
  it("knows the four Phase 1 screens", () => {
    expect(ROUTES).toEqual(["home", "compare", "projects", "guided"]);
  });

  it("parses known hashes and falls back to home", () => {
    expect(parseRoute("#/compare")).toBe("compare");
    expect(parseRoute("#/projects")).toBe("projects");
    expect(parseRoute("#/guided")).toBe("guided");
    expect(parseRoute("")).toBe("home");
    expect(parseRoute("#/")).toBe("home");
    expect(parseRoute("#/unknown")).toBe("home");
    expect(parseRoute("#/compare?x=1")).toBe("compare");
  });

  it("builds hrefs that round-trip", () => {
    for (const route of ROUTES) expect(parseRoute(hrefFor(route))).toBe(route);
    expect(hrefFor("home")).toBe("#/");
  });
});

describe("routes with an id (Phase 3 Task 5)", () => {
  it("reads an entity id after the route, and ignores anything else", () => {
    expect(parseLocation("#/projects/prj_0123abcd")).toEqual({
      route: "projects",
      id: "prj_0123abcd",
    });
    expect(parseLocation("#/guided")).toEqual({ route: "guided", id: null });
    expect(parseLocation("#/projects/<script>")).toEqual({ route: "projects", id: null });
    expect(parseLocation(hrefWith("guided", "prj_0001"))).toEqual({
      route: "guided",
      id: "prj_0001",
    });
  });
});
