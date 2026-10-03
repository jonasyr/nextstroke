import { describe, expect, it } from "vitest";
import {
  ControlledOverlaySchema,
  canTransition,
  createControlledOverlay,
  PreviewArtifactSchema,
  toExperimentalInspiration,
} from "./preview.ts";

const provenance = {
  sourceAssetHash: "a".repeat(64),
  transformRevision: "tr_0001",
  producer: "openai:gpt-image-2.5-sunburst",
  promptRevision: "s1-v2",
  createdAt: "2026-10-03T18:00:00.000Z",
};
const composite = {
  kind: "generated-composite",
  id: "prv_template01",
  assetId: "ast_template01",
  providerRunId: "run_1",
  provenance,
  trust: "untrusted",
} as const;

describe("preview artifacts (spec §7)", () => {
  it("parses every artifact kind", () => {
    expect(PreviewArtifactSchema.parse(composite).kind).toBe("generated-composite");
    const rejected = {
      kind: "rejected-candidate",
      id: "prv_rej00001",
      sourceArtifactId: composite.id,
      reasonCode: "registration-failed",
      trust: "rejected",
    };
    expect(PreviewArtifactSchema.parse(rejected).trust).toBe("rejected");
  });

  it("rejects a generated composite that claims to be controlled", () => {
    expect(() => PreviewArtifactSchema.parse({ ...composite, trust: "controlled" })).toThrow();
  });

  it("never promotes generated or derived artifacts to controlled, approval or not", () => {
    expect(canTransition("generated-composite", "controlled")).toBe(false);
    expect(canTransition("derived-difference-overlay", "controlled")).toBe(false);
    expect(canTransition("experimental-inspiration", "controlled")).toBe(false);
    expect(canTransition("rejected-candidate", "experimental")).toBe(false);
  });

  it("allows only downgrades for a controlled overlay", () => {
    expect(canTransition("controlled-overlay", "experimental")).toBe(true);
    expect(canTransition("controlled-overlay", "rejected")).toBe(true);
    expect(canTransition("generated-composite", "experimental")).toBe(true);
  });

  it("turns a generated composite into warned inspiration, never more", () => {
    const inspiration = toExperimentalInspiration(composite, {
      id: "prv_insp0001",
      assetId: "ast_insp0001",
      warningCode: "generated-image",
    });
    expect(inspiration.trust).toBe("experimental");
    expect(inspiration.source).toBe("generated-composite");
    expect(inspiration.sourceArtifactId).toBe(composite.id);
  });

  const overlayInput = {
    id: "prv_overlay1",
    assetId: "ast_overlay1",
    construction: "structured-strokes",
    editableMaskRevision: "msk_0001",
    protectedGeometryRevision: "msk_0001",
    provenance: { ...provenance, producer: "stroke-plan:s3-from-s1-v1" },
  } as const;

  it("creates a controlled overlay only after a passed boundary audit", () => {
    expect(() => createControlledOverlay(overlayInput, { boundaryAuditPassed: false })).toThrow(
      /boundary audit/,
    );
    const overlay = createControlledOverlay(overlayInput, { boundaryAuditPassed: true });
    expect(overlay.trust).toBe("controlled");
  });

  it("may link a controlled stroke overlay to the template it was transferred from (D-051)", () => {
    const overlay = createControlledOverlay(
      { ...overlayInput, derivedFromTemplateId: composite.id },
      { boundaryAuditPassed: true },
    );
    expect(overlay.derivedFromTemplateId).toBe(composite.id);
  });

  it("allows a template link only for structured strokes", () => {
    expect(() =>
      ControlledOverlaySchema.parse({
        ...overlayInput,
        construction: "direct-alpha",
        derivedFromTemplateId: composite.id,
        kind: "controlled-overlay",
        trust: "controlled",
      }),
    ).toThrow(/structured strokes/);
  });
});
