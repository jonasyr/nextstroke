import { describe, expect, it } from "vitest";
import { ImmutableAssetSchema } from "./asset.ts";
import { CoachRequestSchema, SuggestionSetSchema } from "./coaching.ts";
import { newId } from "./ids.ts";
import { ExportManifestSchema } from "./manifest.ts";
import { MaskRevisionSchema } from "./masks.ts";
import { StrokePlanSchema } from "./strokes.ts";

const asset = {
  schemaVersion: 1,
  id: "ast_original01",
  role: "original",
  origin: "user-upload",
  sha256: "b".repeat(64),
  mimeType: "image/jpeg",
  width: 4032,
  height: 3024,
  createdAt: "2026-10-03T18:00:00.000Z",
};

describe("immutable assets", () => {
  it("parses a versioned asset record", () => {
    expect(ImmutableAssetSchema.parse(asset).role).toBe("original");
  });

  it("rejects unknown schema versions", () => {
    expect(() => ImmutableAssetSchema.parse({ ...asset, schemaVersion: 2 })).toThrow();
  });

  it("marks provider images as untrusted templates only", () => {
    expect(() => ImmutableAssetSchema.parse({ ...asset, origin: "provider" })).toThrow(/provider/);
    expect(
      ImmutableAssetSchema.parse({ ...asset, origin: "provider", role: "provider-template" }).role,
    ).toBe("provider-template");
  });

  it("is frozen after parsing", () => {
    const parsed = ImmutableAssetSchema.parse(asset);
    expect(Object.isFrozen(parsed)).toBe(true);
  });
});

describe("ids", () => {
  it("prefixes random ids by entity", () => {
    const id = newId("ast", () => 0.5);
    expect(id).toMatch(/^ast_[0-9a-z]{16}$/);
  });
});

describe("masks", () => {
  const mask = {
    schemaVersion: 1,
    id: "msk_0001",
    originalAssetId: "ast_original01",
    transformRevision: "tr_0001",
    editable: [
      [
        [0.1, 0.1],
        [0.4, 0.1],
        [0.4, 0.4],
      ],
    ],
    protected: [],
    featherPx: 0,
    reviewedByUser: true,
  };

  it("uses source-normalized coordinates", () => {
    expect(MaskRevisionSchema.parse(mask).editable).toHaveLength(1);
    expect(() =>
      MaskRevisionSchema.parse({
        ...mask,
        editable: [
          [
            [0.1, 0.1],
            [1.4, 0.1],
            [0.4, 0.4],
          ],
        ],
      }),
    ).toThrow();
  });

  it("needs an editable region", () => {
    expect(() => MaskRevisionSchema.parse({ ...mask, editable: [] })).toThrow();
  });
});

describe("suggestions", () => {
  const idea = {
    title: "Möwen",
    risk: "careful",
    technique: "zwei V-Formen",
    steps: ["Probestrich auf Reststück", "zwei kleine V zeichnen"],
    materialClaimIds: ["micron-ink"],
    why: "kleine, umkehrbare Ergänzung",
  };

  it("holds exactly three ideas", () => {
    const set = { schemaVersion: 1, id: "sug_0001", ideas: [idea, idea, idea] };
    expect(SuggestionSetSchema.parse(set).ideas).toHaveLength(3);
    expect(() => SuggestionSetSchema.parse({ ...set, ideas: [idea, idea] })).toThrow();
  });

  it("needs at least a practice step and one drawing step", () => {
    expect(() =>
      SuggestionSetSchema.parse({
        schemaVersion: 1,
        id: "sug_0001",
        ideas: [idea, idea, { ...idea, steps: [] }],
      }),
    ).toThrow();
  });
});

describe("stroke plans (lab schema version 2, D-049)", () => {
  it("accepts strokes and hatch fills", () => {
    const plan = {
      schemaVersion: "2",
      strokes: [
        {
          order: 1,
          points: [
            [0.1, 0.1],
            [0.2, 0.2],
          ],
          width: 0.001,
          darkness: 1,
        },
      ],
      fills: [
        {
          order: 2,
          polygon: [
            [0.1, 0.1],
            [0.3, 0.1],
            [0.3, 0.3],
          ],
          angleDeg: 45,
          spacing: 0.008,
          width: 0.001,
          darkness: 0.8,
          cross: false,
        },
      ],
    };
    expect(StrokePlanSchema.parse(plan).fills).toHaveLength(1);
    expect(() => StrokePlanSchema.parse({ ...plan, strokes: [], fills: [] })).toThrow(
      /strokes or fills/,
    );
    expect(() =>
      StrokePlanSchema.parse({ ...plan, fills: [{ ...plan.fills[0], order: 1 }] }),
    ).toThrow(/unique/);
  });
});

describe("export manifest", () => {
  it("lists assets by hash with a format version", () => {
    const manifest = {
      format: "nextstroke-project",
      formatVersion: 1,
      appVersion: "0.1.0",
      exportedAt: "2026-10-03T18:00:00.000Z",
      assets: [{ id: "ast_original01", sha256: "b".repeat(64), path: "assets/ast_original01.jpg" }],
    };
    expect(ExportManifestSchema.parse(manifest).assets).toHaveLength(1);
    expect(() => ExportManifestSchema.parse({ ...manifest, formatVersion: 9 })).toThrow();
  });
});

describe("coach requests (Phase 3 Task 3)", () => {
  it("takes intent, skill, pen and paper, and optional tips, area and protected details", () => {
    const request = {
      intent: "depth",
      skill: "beginner",
      finelinerId: "generic",
      paperId: "unknown",
    };
    expect(CoachRequestSchema.parse(request).intent).toBe("depth");
    expect(CoachRequestSchema.safeParse({ ...request, intent: "lighten" }).success).toBe(false);
    expect(CoachRequestSchema.safeParse({ ...request, ownedTipsMm: [0] }).success).toBe(false);
    expect(CoachRequestSchema.safeParse({ ...request, extra: 1 }).success).toBe(false);
  });
});
