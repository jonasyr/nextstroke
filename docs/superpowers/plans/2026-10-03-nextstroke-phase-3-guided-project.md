# NextStroke Phase 3 Guided Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete local Capture → Straighten → Describe → Ideas → Preview → Execute → Check workflow using deterministic fixtures and no cloud dependency.

**Architecture:** Dexie repositories persist immutable assets and versioned project records in IndexedDB. The guided React flow consumes the same framework-neutral imaging and comparison packages as Quick Compare. Mock analysis and preview fixtures exercise the final contracts before any live provider is integrated.

**Tech Stack:** React, TypeScript, Dexie, Zod contracts, Canvas 2D, OpenCV.js adapter for corner detection, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Global Constraints

- Local project creation does not require login or network access.
- Original captures, references, and checkpoints are immutable records and blobs.
- Every stage autosaves after a meaningful committed change, not on every pointer move.
- The guided flow supports fineliner, colored pencil, and watercolor only in the MVP.
- A reference is optional and its absence must be fully tested.
- Preview acceptance requires a separate layer, an allowed mask, protected-region validation, and a passing validation result.
- Quick Compare remains separately accessible and supplies the Check stage engine.
- Documentation and decision records change in the same commit as any behavioral decision.

## Review Focus

1. IndexedDB quota error, eviction, migration failure, or failed blob write must keep current in-memory work and explain recovery; Task 1 tests it.
2. No detectable four-corner contour, extreme perspective, glare, blur, or low light must lead to manual correction rather than a false confident crop; Task 2 tests it.
3. Reload, backward navigation, and cancellation at every stage must restore the last committed state without skipping required inputs; Task 3 tests it.
4. Empty mask, inverted mask, protected-mask overlap, and one changed protected pixel must reject preview acceptance; Task 4 tests it.
5. Deleting a project with checkpoints and pending derived assets must remove every related local blob but no unrelated asset; Task 5 tests it.

---

### Task 1: Create the local project and asset repositories

**Files:**
- Create: `apps/web/src/db/schema.ts`
- Create: `apps/web/src/db/NextStrokeDb.ts`
- Create: `apps/web/src/db/projectRepository.ts`
- Create: `apps/web/src/db/assetRepository.ts`
- Create: `apps/web/src/db/transaction.ts`
- Create: `apps/web/src/db/storageErrors.ts`
- Create: `apps/web/src/db/testDb.ts`
- Create: `apps/web/src/db/projectRepository.test.ts`
- Create: `apps/web/src/db/migrations.test.ts`

**Interfaces:**
- Consumes: project and asset contract types from Phase 1.
- Produces: `ProjectRepository` with `create`, `get`, `listRecent`, `update(expectedRevision, patch)`, `deleteCascade`, and `watch`; `AssetRepository` with `putImmutable`, `getBlob`, `getMetadata`, and `deleteUnreferenced`; `StorageFailure { code: 'quota' | 'migration' | 'unavailable' | 'unknown'; recoverable: boolean }`.

- [ ] **Step 1: Write failing repository tests**

Assert atomic project-plus-asset creation; immutable blob rejection on duplicate ID with different bytes; optimistic revision increment; stale revision conflict preserving both values; newest-first project listing; quota failure leaving the prior transaction unchanged; failed migration retaining the previous database version; and cascade deletion removing only assets exclusively referenced by that project.

- [ ] **Step 2: Run tests and confirm repositories are missing**

Run: `pnpm --filter @nextstroke/web test -- projectRepository migrations`  
Expected: FAIL because database modules are absent.

- [ ] **Step 3: Implement Dexie schema version 1 and repositories**

Use tables `projects`, `assets`, `captures`, `references`, `suggestionSets`, `changePlans`, `previewLayers`, `checkpoints`, `feedback`, and `syncQueue`. Store blobs only in `assets`; records reference IDs. All multi-record writes and cascade deletes use Dexie transactions.

- [ ] **Step 4: Add recovery semantics and verify**

Map browser storage exceptions to `StorageFailure`; never clear data automatically. Expose recovery actions `retry`, `export-current`, and `continue-in-memory` where applicable.

Run: `pnpm --filter @nextstroke/web test -- projectRepository migrations && pnpm --filter @nextstroke/web typecheck`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/db
git commit -m "feat: add local-first project storage"
```

### Task 2: Add capture assessment and perspective correction

**Files:**
- Create: `packages/imaging/src/quality/assessCaptureQuality.ts`
- Create: `packages/imaging/src/perspective/types.ts`
- Create: `packages/imaging/src/perspective/orderQuad.ts`
- Create: `packages/imaging/src/perspective/detectArtworkQuad.ts`
- Create: `packages/imaging/src/perspective/opencvDetector.ts`
- Create: `packages/imaging/src/perspective/warpPerspective.ts`
- Create: `packages/imaging/test/assessCaptureQuality.test.ts`
- Create: `packages/imaging/test/perspective.test.ts`
- Create: `apps/web/src/features/project/capture/CaptureStep.tsx`
- Create: `apps/web/src/features/project/capture/StraightenStep.tsx`
- Create: `apps/web/src/features/project/capture/QuadEditor.tsx`
- Create: `apps/web/src/features/project/capture/captureSteps.test.tsx`

**Interfaces:**
- Consumes: decoded images from Phase 2 and `Capture` contract.
- Produces: `assessCaptureQuality(image): CaptureQualityReport`; `detectArtworkQuad(image, signal): Promise<QuadDetectionResult>`; `warpPerspective(image, quad, outputLimits): Promise<DecodedImage>`; normalized clockwise `Quad` starting at top-left.

- [ ] **Step 1: Write failing quality and geometry tests**

Assert issue codes for `blur`, `glare`, `too-dark`, `too-small`, and `extreme-perspective`; ordered quads for every input point permutation; automatic detection of a synthetic skewed paper rectangle; `no-confident-quad` for blank/distractor images; rejection of self-intersecting or near-zero-area manual quads; and output dimensions bounded by pixel limits.

- [ ] **Step 2: Run tests and confirm missing services fail**

Run: `pnpm --filter @nextstroke/imaging test -- assessCaptureQuality perspective`  
Expected: FAIL because the services are absent.

- [ ] **Step 3: Implement quality heuristics and OpenCV-backed quad detection**

Pin the OpenCV.js package exactly. Downsample for analysis, then use grayscale, blur, Canny edges, contours, convex four-point approximation, area/angle scoring, and a confidence threshold. Return no confident result rather than guessing. Keep manual corner editing available for every image.

- [ ] **Step 4: Implement the capture and straighten UI**

Offer camera (`accept="image/*" capture="environment"`), photo library, and PDF import. Explain permissions in context. Show actionable warnings, automatic corners when confident, draggable 44px corner handles, reset, and an explicit `Use corrected image` action. Persist source and corrected asset separately.

- [ ] **Step 5: Verify package and component behavior**

Run: `pnpm --filter @nextstroke/imaging test -- assessCaptureQuality perspective && pnpm --filter @nextstroke/web test -- captureSteps`  
Expected: PASS; `no-confident-quad` opens manual editing with the full-frame quad.

- [ ] **Step 6: Commit**

```bash
git add packages/imaging apps/web/src/features/project/capture pnpm-lock.yaml
git commit -m "feat: add capture and perspective correction"
```

### Task 3: Build the resumable guided project flow with fixture analysis

**Files:**
- Create: `apps/web/src/features/project/routes.tsx`
- Create: `apps/web/src/features/project/ProjectFlow.tsx`
- Create: `apps/web/src/features/project/ProjectProgress.tsx`
- Create: `apps/web/src/features/project/useProjectDraft.ts`
- Create: `apps/web/src/features/project/context/DescribeStep.tsx`
- Create: `apps/web/src/features/project/context/materialProfiles.ts`
- Create: `apps/web/src/features/project/ideas/IdeasStep.tsx`
- Create: `apps/web/src/features/project/ideas/SuggestionCard.tsx`
- Create: `apps/web/src/services/analysis/AnalysisClient.ts`
- Create: `apps/web/src/services/analysis/FixtureAnalysisClient.ts`
- Create: `tests/fixtures/analysis/lighthouse-v1.json`
- Create: `apps/web/src/features/project/ProjectFlow.test.tsx`
- Create: `apps/web/e2e/local-project-flow.spec.ts`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: local repositories, capture flow, `SuggestionSetSchema`.
- Produces: route `/projects/:projectId/:stage`; `AnalysisClient.analyze(input, signal): Promise<SuggestionSet>`; stage guards; material profiles with allowed tool vocabularies; deterministic lighthouse fixture containing exactly three suggestions.

- [ ] **Step 1: Write failing stage and fixture tests**

Assert the seven stages and their prerequisites; optional reference omission; only the three supported materials; tool choices saved per project; explicit confirmation listing transmitted assets before `AnalysisClient.analyze`; cancellation preserving Describe state; malformed fixture rejected by contracts; browser reload restoring the exact stage; backward navigation not deleting later data until the user changes an upstream committed value.

- [ ] **Step 2: Run tests and confirm route failure**

Run: `pnpm --filter @nextstroke/web test -- ProjectFlow`  
Expected: FAIL because guided routes and client port are absent.

- [ ] **Step 3: Implement routes, draft persistence, context, and ideas**

Use one page shell with reversible stages. Autosave debounced committed form changes and save immediately on navigation. Suggestions display impact, difficulty, risk, materials, reason, and target region; selecting one does not yet create a preview.

- [ ] **Step 4: Implement explicit analysis confirmation with fixture client**

The confirmation names `corrected artwork` and optional `reference` as the assets that a future remote client would send. In Phase 3 the fixture client remains local but exercises loading, cancellation, offline, error, and retry states.

- [ ] **Step 5: Verify flow and reload behavior**

Run: `pnpm --filter @nextstroke/web test -- ProjectFlow && pnpm --filter @nextstroke/web exec playwright test e2e/local-project-flow.spec.ts --project=webkit`  
Expected: PASS through selection of one suggestion with and without a reference.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/project apps/web/src/services/analysis tests/fixtures/analysis apps/web/src/App.tsx
git commit -m "feat: add resumable guided project flow"
```

### Task 4: Implement protected masks and local preview validation

**Files:**
- Create: `packages/imaging/src/masks/Mask.ts`
- Create: `packages/imaging/src/masks/rasterizeStrokes.ts`
- Create: `packages/imaging/src/diff/colorDelta.ts`
- Create: `packages/imaging/src/diff/validatePreview.ts`
- Create: `packages/imaging/test/masks.test.ts`
- Create: `packages/imaging/test/validatePreview.test.ts`
- Create: `apps/web/src/features/project/preview/MaskEditor.tsx`
- Create: `apps/web/src/features/project/preview/PreviewStep.tsx`
- Create: `apps/web/src/features/project/preview/previewReducer.ts`
- Create: `apps/web/src/features/project/preview/PreviewStep.test.tsx`
- Create: `apps/web/src/services/preview/PreviewClient.ts`
- Create: `apps/web/src/services/preview/FixturePreviewClient.ts`
- Create: `tests/fixtures/previews/lighthouse-valid/manifest.json`
- Create: `tests/fixtures/previews/lighthouse-grid-violation/manifest.json`

**Interfaces:**
- Consumes: selected suggestion, corrected capture, fixture preview, Canvas renderer.
- Produces: `MaskDocument { width; height; strokes; revision }`; `rasterizeMask(document): Uint8ClampedArray`; `validatePreview(original, composite, allowedMask, protectedMask, policy): PreviewValidation`; `PreviewClient.generate(request, signal): Promise<GeneratedPreview>`.

- [ ] **Step 1: Write failing mask and validation tests**

Use policy `{ deltaThreshold: 24, maxOutsideChangedRatio: 0.01, maxProtectedChangedPixels: 0 }`. Assert deterministic stroke rasterization, paint/erase behavior, empty allowed-mask rejection, protected-mask precedence, valid change acceptance, more than 1% relevant changes outside the mask rejection, a single protected changed pixel rejection, mismatched dimensions rejection, and no mutation of inputs.

- [ ] **Step 2: Run tests and confirm missing validator fails**

Run: `pnpm --filter @nextstroke/imaging test -- masks validatePreview`  
Expected: FAIL because mask and validation services are absent.

- [ ] **Step 3: Implement masks and difference validation**

Store vector strokes for editing and rasterize at source resolution for validation. Count only pixels above `deltaThreshold`; return counts, ratios, a reason list, and `status: accepted | rejected | uncertain`. `rejected` can never be attached as the active accepted preview.

- [ ] **Step 4: Implement preview UI with deterministic valid and violating fixtures**

Provide `Careful`, `Balanced`, and `Bold`, finger paint/erase for protected regions, `Show changes only`, opacity, tap/hold original, and full state-preserving immersive mode. Display the validation reason before retry. The fixture client lets E2E choose a valid layer or the known lamp-grid violation.

- [ ] **Step 5: Verify safety behavior**

Run: `pnpm --filter @nextstroke/imaging test -- masks validatePreview && pnpm --filter @nextstroke/web test -- PreviewStep`  
Expected: PASS; the violation fixture never enables `Use this preview`.

- [ ] **Step 6: Commit**

```bash
git add packages/imaging apps/web/src/features/project/preview apps/web/src/services/preview tests/fixtures/previews
git commit -m "feat: add bounded preview validation"
```

### Task 5: Add execution steps, checkpoints, deletion, and offline E2E

**Files:**
- Create: `apps/web/src/features/project/execute/ExecuteStep.tsx`
- Create: `apps/web/src/features/project/execute/InstructionCard.tsx`
- Create: `apps/web/src/features/project/execute/executionReducer.ts`
- Create: `apps/web/src/features/project/execute/ExecuteStep.test.tsx`
- Create: `apps/web/src/features/project/check/CheckStep.tsx`
- Create: `apps/web/src/features/project/check/createCheckpoint.ts`
- Create: `apps/web/src/features/projects/ProjectList.tsx`
- Create: `apps/web/src/features/projects/DeleteProjectDialog.tsx`
- Create: `apps/web/src/features/projects/DeleteProjectDialog.test.tsx`
- Create: `apps/web/e2e/local-project-complete.spec.ts`
- Create: `apps/web/e2e/local-project-offline.spec.ts`
- Modify: `apps/web/src/sw.ts`
- Modify: `docs/README.md`
- Create: `docs/architecture/local-project-state.md`

**Interfaces:**
- Consumes: accepted `ChangePlan`, immutable capture/checkpoint repositories, Quick Compare engine.
- Produces: actions `done`, `skip`, `too-risky`, `show-another-way`; `createCheckpoint(projectId, file, previousCaptureId)`; Check stage comparison between prior capture and checkpoint; cascade delete confirmation.

- [ ] **Step 1: Write failing execution and deletion tests**

Assert only one instruction is primary at a time; each instruction includes tool, color/mix, pressure/water load, direction, placement, duration, and optional detail crop; all four actions persist; reload resumes at the same instruction; checkpoint source remains immutable; Check opens with prior/current images; deleting a project removes its records and exclusive blobs while shared fixture assets remain.

- [ ] **Step 2: Run tests and confirm missing steps fail**

Run: `pnpm --filter @nextstroke/web test -- ExecuteStep DeleteProjectDialog`  
Expected: FAIL because execution and project management are absent.

- [ ] **Step 3: Implement execution, checkpoint, check, and deletion UI**

Use Quick Compare for the Check view with checkpoint-specific labels. Require explicit destructive confirmation showing the project name; deletion is local and final in Phase 3. Keep export available before deletion.

- [ ] **Step 4: Extend offline caching without caching artwork**

Cache application code, material help, and deterministic UI resources only. Verify IndexedDB contains user assets while Cache Storage does not.

- [ ] **Step 5: Run complete local-flow tests**

Run: `pnpm check && pnpm build && pnpm --filter @nextstroke/web exec playwright test e2e/local-project-complete.spec.ts e2e/local-project-offline.spec.ts --project=chromium --project=webkit`  
Expected: PASS for a full project, reload at each stage, offline execution, checkpoint comparison, export, and deletion.

- [ ] **Step 6: Document and commit**

Document database ownership, immutable/derived records, recovery, deletion, and the fixture-service boundary; update the docs index.

```bash
git add apps/web packages/imaging docs
git commit -m "feat: complete local guided project workflow"
```

## Phase 3 final review

- [ ] Complete the whole flow with no network after fixture analysis is available.
- [ ] Inspect IndexedDB and Cache Storage to confirm storage boundaries.
- [ ] Demonstrate that the lamp-grid violation fixture cannot be accepted.
- [ ] Confirm every guided stage has loading, empty, offline, error, cancellation, and retry behavior where applicable.
- [ ] Run the real-iPhone checklist for capture, corner dragging, mask painting, immersive preview, and checkpoint comparison.
- [ ] Tag the merge commit `phase-3-guided-project` only after all gates pass.

