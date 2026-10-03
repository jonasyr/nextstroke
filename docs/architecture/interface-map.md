# Interface Map (end of Phase 1)

**Updated:** 2026-10-03 · For owner review before Phase 2 (Phase 1 exit gate). Boundaries are enforced by `.dependency-cruiser.cjs` on every `pnpm run check`.

## Dependency rules

```text
apps/web ──▶ packages/ui ──▶ (react)
   │              │
   └──────────────┴──▶ packages/{compare, imaging, materials, coaching} ──▶ packages/contracts ──▶ (zod)
```

- `contracts` depends on no other workspace package.
- `compare`, `imaging`, `materials`, `coaching` and `contracts` never import React, Radix or `ui` (pure domain logic, D-039).
- Packages never import apps. No circular dependencies. Every import must resolve.

## Packages

| Package | Phase | Public interface today |
| --- | --- | --- |
| `@nextstroke/contracts` | 1 | `ImmutableAssetSchema` (roles `original`, `reference`, `checkpoint`, `provider-template`, `local-render`; provider images only as templates), `MaskRevisionSchema` (normalized editable and protected polygons, feather), `SourceRecordSchema` and `MaterialClaimSchema` (evidence level caps confidence; level E rejected as fact), `SuggestionSetSchema` (exactly three ideas), `StrokePlanSchema` (v2: strokes and hatch fills), `ExportManifestSchema` (versioned, local only), preview vocabulary of spec §7 (`GeneratedComposite`, `DerivedDifferenceOverlay`, `ControlledOverlay` with optional `derivedFromTemplateId`, `ExperimentalInspiration`, `RejectedCandidate`), `canTransition`, `toExperimentalInspiration`, `createControlledOverlay` (requires a passed boundary audit), `newId` |
| `@nextstroke/ui` | 1 | German message catalog `de`, `t(key, params)`, `LOCALES = ["de"]`, `Loading`, `ErrorNotice` |
| `@nextstroke/compare` | 2 | empty; transforms and comparison state |
| `@nextstroke/imaging` | 2 | empty; decode, masks, alignment, compositing, export |
| `@nextstroke/materials` | 3 | empty; sourced dataset and rules built on `MaterialClaimSchema` |
| `@nextstroke/coaching` | 3 | empty; ideas and instructions built on `SuggestionSetSchema` |
| `@nextstroke/web` | 1 | hash routes `#/`, `#/compare`, `#/projects`, `#/guided`; offline banner; CSS immersive container; generated service worker (app shell only) |

## Trust rules encoded in contracts

| From | Allowed changes |
| --- | --- |
| generated composite (provider image) | experimental inspiration, rejected |
| derived difference overlay | rejected |
| controlled overlay | experimental, rejected (downgrades only) |
| experimental inspiration | rejected |
| rejected candidate | none |

A controlled overlay is never reached by a transition. It is created only from a locally rendered construction after a passed boundary audit. Human approval is not an input (spec §7).

## Deliberately absent

Accounts, sync, D1/R2, cloud project storage, a generalized provider framework, and contracts for S2 direct-alpha generation beyond the spec vocabulary (D-051 does not build S2).
