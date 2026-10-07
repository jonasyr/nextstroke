# NextStroke Phase 3 Fineliner Coach and Local Projects Plan

> **For agentic workers:** This phase must deliver value without generated imagery. Preview is not a prerequisite for coaching usefulness.

**Goal:** Build the local guided loop with sourced fineliner knowledge, exactly three feasible ideas, optional calibration, physical instructions, checkpoints, and backup export.

**Architecture:** A versioned offline material dataset and deterministic rule engine constrain structured coaching output. IndexedDB repositories store immutable assets and project revisions; export creates a portable manifest plus assets.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

**Material design:** `docs/product/material-knowledge-base.md`

## Constraints

- Fineliner only.
- Exactly three ideas per completed analysis.
- Unknown tools use conservative generic rules.
- Every product-specific fact has provenance.
- Calibration is optional and produces relative measurements only.
- Local persistence failure remains recoverable through in-memory continuation/export when possible.

## Review focus

1. Missing, stale, conflicting, or manufacturer-only material claims.
2. Advice that requires an unavailable color, opacity, erasure, or medium.
3. IndexedDB quota, migration, background wakeup, and eviction messaging.
4. Calibration photos with uneven light, blur, or no reliable scale.
5. Export during low-memory/storage conditions.

## Task 1: Curated material dataset and rule engine

- [x] Add 10–20 sourced black fineliner profiles plus generic profile (17 pens, 96 claims, D-064).
- [x] Add paper categories and condition-scoped claims (seven generic categories; claims carry optional conditions).
- [x] Validate sources, confidence, retrieval date, and licensing note at build time (`validateDataset`, run as a test).
- [x] Implement deterministic feasibility filters for techniques and instructions (`feasibility`; instructions follow in Task 3).

## Task 2: Optional calibration card

- [ ] Render printable/on-screen calibration instructions.
- [ ] Capture line, hatching, cross-hatching, stippling, overdraw, and blank-paper cells.
- [ ] Reject poor captures and fall back without blocking the project.
- [ ] Store relative observations with device/photo context and no absolute-color claim.

## Task 3: Structured coaching

- [x] Define input schema for intent, target area, protected details, skill level, tool, and paper (`CoachRequestSchema`).
- [x] Return exactly three bounded ideas with risk level, required technique, and Careful/Balanced/Bold classification (D-014; deterministic, D-065).
- [x] Generate ordered physical instructions from rule-approved facts only.
- [x] Show source/evidence summaries in accessible language ("Woher wissen wir das?" in the steps view, with the pen brand, link, retrieval date and the general spacing rule).

## Task 4: Local project repository and export

- [x] Store immutable originals/checkpoints and versioned derived state (`packages/projects`, D-066).
- [x] Use storage estimate/persistence APIs when supported and explain best-effort storage (`storageStatus`, `describeStorage`; asked on the first save in Task 5).
- [x] Reopen safely after backgrounding and migrations (`IdbStore`, unit-tested with fake-indexeddb; real-browser check with Task 5).
- [x] Export/import a versioned project package with integrity hashes, zipped with fflate (D-036).

## Task 5: Complete non-preview guided flow

- [x] Implement Capture → Straighten → Tool → Intent → Ideas → Execute → Check. Done: start screen with the coach, Quick Compare and the projects list (D-067), pure flow state with the circle area and protected spots (`apps/web/src/coach/flow.ts`). Tool, goal (circle area, protected spots under "Weitere Optionen"), three ideas and tickable steps with "Woher wissen wir das?" are done; the photo becomes the project original and the request, ideas and chosen idea are saved as revisions (`apps/web/src/coach/GuidedFlow.tsx`, e2e `guided.spec.ts` in Chromium and WebKit). The photo's paper corners are found and snapped with the Quick Compare rules (D-061, D-062), with a loupe while dragging; "Weiter" straightens the sheet locally from the immutable original, saves the corners as `paperCorners`, and marks on the straight view are carried back to the original's coordinates for the coach request. A checkpoint photo gets its own corners, is straightened into the start's frame and stored as an immutable checkpoint with `paperCorners`; "Vorher und jetzt" compares both with a divider. The project view (`#/projects/<id>`) shows start and checkpoints, the last idea, "Als Datei sichern" (the verified package), deleting with a second tap, and "Weiterzeichnen", which reopens the flow at the goal with the straight sheet and the last choices; "Projekt aus Datei öffnen" on the start screen imports a package as a copy. E2E: `guided.spec.ts`, `guided-project.spec.ts` in Chromium and WebKit.
- [x] Reuse Quick Compare for checkpoint inspection: "Im Schnellvergleich öffnen" in the project view (Task 6).
- [ ] Test with 5–8 beginners without developer explanation.
- [ ] This study is also the deferred Phase 0 beginner gate (D-048): use standardized starters first, define "understands" and "worsens" as in spec §15.2, and record it in the Phase 0 results report.

## Task 6: Template in a project (D-070, track step T1)

- [x] Offer an optional template after the drawing's photo (camera, photos, files, PDF page); no extra screen for people without one. A quiet card "Vorlage (optional)" under the photo; picking opens its own corner step (whole image when no sheet is found), then returns.
- [x] Store it as an immutable `reference` asset (`referenceAssetId`, `referenceCorners`; `setReference` in `packages/projects` deletes a replaced image unless another project uses it), straightened into the drawing's frame like a checkpoint.
- [x] Project view: the template card; add, change or remove it (removing asks for a second tap).
- [x] "Vorher und jetzt" can show the template: "Vergleichen mit Vorher | Vorlage".
- [x] "Im Schnellvergleich öffnen" from the project view (`#/compare/<id>`): the latest drawing and the template, or the latest checkpoint and the start, aligned at the saved corners without re-running automatic alignment; "Zurück" returns to the project. This closes Task 5's open Quick Compare item.
- [x] Export/import carries the template; e2e `template.spec.ts` in Chromium and WebKit.

## Task 8: Rule-based stroke-plan preview (D-071)

Before the beginner study; the study tests instruction plus preview.

- [ ] Sheet format (A5, A4, A3; default A4) on "Stift und Papier", so millimetres become positions on the photo.
- [ ] Deterministic plan builder in `packages/coaching`: per technique and level, fills inside the marked area on the side away from the light, spacing from the coach, protected details excluded; no preview (with a reason) for contour and line weight, or without a marked area.
- [ ] Local renderer: the plan over the straight photo as a controlled overlay; original pixels outside the area and inside protected details untouched.
- [ ] Preview in the steps view (zoomed to the marked area, opacity, "Original" hold, light direction) and small previews on the three idea cards; labelled as the instruction on the user's sheet, never as the result.
- [ ] Tests for builder and renderer; e2e in Chromium and WebKit.

## Task 7: Goal "Näher an die Vorlage" (D-070, track step T2)

After the beginner study; not part of the exit gate.

- [ ] Local, deterministic comparison of the straight drawing and template: tone difference per region, robust to paper colour and light (relative, like the test card).
- [ ] Propose the areas where the template is clearly darker as the marked area; the user confirms or moves it.
- [ ] Ideas and steps refer to the template ("wie in der Vorlage"); no claim that the result will match.
- [ ] When the template is a photo rather than a drawing, show the comparison only and give no area hints.

## Exit gate

The first two criteria are hard gates carried over from Phase 0 (D-048). If either fails, Phase 4 does not start and the owner selects and records a further pivot.

- At least 70% of study participants understand the instruction (with its stroke-plan preview, D-071) unaided.
- At least 60% execute without worsening the work under the approved rubric.
- No user-facing material claim lacks provenance or explicit generic status.
- Calibration can be completed, skipped, or rejected without blocking progress.
- Reload, export/import, quota failure, and database reopen have tested outcomes.
