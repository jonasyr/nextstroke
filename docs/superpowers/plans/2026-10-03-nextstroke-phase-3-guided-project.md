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

- [ ] Add 10–20 sourced black fineliner profiles plus generic profile.
- [ ] Add paper categories and condition-scoped claims.
- [ ] Validate sources, confidence, retrieval date, and licensing note at build time.
- [ ] Implement deterministic feasibility filters for techniques and instructions.

## Task 2: Optional calibration card

- [ ] Render printable/on-screen calibration instructions.
- [ ] Capture line, hatching, cross-hatching, stippling, overdraw, and blank-paper cells.
- [ ] Reject poor captures and fall back without blocking the project.
- [ ] Store relative observations with device/photo context and no absolute-color claim.

## Task 3: Structured coaching

- [ ] Define input schema for intent, target area, protected details, skill level, tool, and paper.
- [ ] Return exactly three bounded ideas with risk level, required technique, and Careful/Balanced/Bold classification (D-014).
- [ ] Generate ordered physical instructions from rule-approved facts only.
- [ ] Show source/evidence summaries in accessible language.

## Task 4: Local project repository and export

- [ ] Store immutable originals/checkpoints and versioned derived state.
- [ ] Use storage estimate/persistence APIs when supported and explain best-effort storage.
- [ ] Reopen safely after backgrounding and migrations.
- [ ] Export/import a versioned project package with integrity hashes, zipped with fflate (D-036).

## Task 5: Complete non-preview guided flow

- [ ] Implement Capture → Straighten → Tool → Intent → Ideas → Execute → Check.
- [ ] Reuse Quick Compare for checkpoint inspection.
- [ ] Test with 5–8 beginners without developer explanation.
- [ ] This study is also the deferred Phase 0 beginner gate (D-048): use standardized starters first, define "understands" and "worsens" as in spec §15.2, and record it in the Phase 0 results report.

## Exit gate

The first two criteria are hard gates carried over from Phase 0 (D-048). If either fails, Phase 4 does not start and the owner selects and records a further pivot.

- At least 70% of study participants understand the instruction unaided.
- At least 60% execute without worsening the work under the approved rubric.
- No user-facing material claim lacks provenance or explicit generic status.
- Calibration can be completed, skipped, or rejected without blocking progress.
- Reload, export/import, quota failure, and database reopen have tested outcomes.
