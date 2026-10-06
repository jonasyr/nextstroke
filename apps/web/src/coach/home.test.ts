import type { Project } from "@nextstroke/contracts";
import { describe, expect, it } from "vitest";
import { projectLine, sortProjects, whenLabel } from "./home.ts";

const NOW = "2026-10-05T12:00:00.000Z";

function project(updatedAt: string, checkpoints = 0): Project {
  return {
    schemaVersion: 1,
    id: `prj_${updatedAt.slice(0, 10).replaceAll("-", "")}`,
    title: "Leuchtturm",
    createdAt: updatedAt,
    updatedAt,
    revision: 0,
    originalAssetId: "ast_0000",
    checkpoints: Array.from({ length: checkpoints }, () => ({
      assetId: "ast_0001",
      createdAt: updatedAt,
    })),
  };
}

describe("projects list", () => {
  it("says how far a project is and when it was last touched", () => {
    expect(projectLine(project(NOW), NOW)).toBe("Noch kein Zwischenstand · heute");
    expect(projectLine(project("2026-10-04T23:00:00.000Z", 1), NOW)).toBe(
      "1 Zwischenstand · gestern",
    );
    expect(projectLine(project("2026-10-01T08:00:00.000Z", 2), NOW)).toBe(
      "2 Zwischenstände · vor 4 Tagen",
    );
    expect(whenLabel("2026-09-20T08:00:00.000Z", NOW)).toBe("20. Sep.");
  });

  it("lists the newest project first", () => {
    const old = project("2026-09-01T00:00:00.000Z");
    const recent = project(NOW);
    expect(sortProjects([old, recent])).toEqual([recent, old]);
  });
});
