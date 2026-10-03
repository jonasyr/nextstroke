# NextStroke Phase 1 Lean Foundation Plan

> **For agentic workers:** Start only after Phase 0 GO or an explicitly approved pivot. Use TDD and commit each independently reviewable task.

**Goal:** Create the smallest production workspace needed by the evidence-backed product path.

**Architecture:** A TypeScript workspace separates the PWA, runtime contracts, deterministic comparison/imaging, material knowledge, coaching rules, and shared UI. Add a minimal API only if the retained Phase 0 strategy requires secrets.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Constraints

- No account, login, D1, R2, sync queue, or generalized provider framework.
- Freeze only interfaces demonstrated in Phase 0.
- Preserve preview artifact vocabulary exactly.
- Material claims carry provenance and confidence.
- Quality commands run from repository root.

## Review focus

1. Runtime schemas must reject promotion of untrusted composites to controlled overlays.
2. Optional API packages must not leak secrets into the web bundle.
3. Material records without source/confidence must fail validation.
4. Browser-only packages must not make Node test imports fail.
5. The offline shell must not imply offline AI availability.

## Task 1: Bootstrap workspace and quality gates

- [ ] Select supported Node/pnpm versions based on current stable releases and document them.
- [ ] Create focused `apps/web` and `packages/{contracts,compare,imaging,materials,coaching,ui}` boundaries.
- [ ] Use pnpm and extend `scripts/setup.sh` (D-037).
- [ ] Add only the spec §13.2 libraries the first phases use (D-036) and run a dependency-license check on them.
- [ ] Add formatting, linting, typechecking, unit-test, build, dependency-license, and documentation-link commands.
- [ ] Add CI using synthetic/licensed fixtures only.

## Task 2: Define evidence-backed contracts

- [ ] Define IDs and schemas for immutable assets, revisions, masks, material claims, suggestions, instructions, and preview artifacts.
- [ ] Add negative tests for illegal trust transitions and unsourced material claims.
- [ ] Version persisted records and export manifests.
- [ ] Avoid contracts for cloud sync or unsupported media.

## Task 3: Create minimal PWA shell

- [ ] Add accessible routing for Home, Quick Compare, Projects, and Guided Project.
- [ ] Implement safe-area layout, CSS immersive container, loading/error/offline primitives, and install metadata.
- [ ] Add service-worker update/version handling without caching user artwork in a general response cache.
- [ ] Build to a plain static directory that deploys to ChatGPT Sites with hash routing and no required response headers (D-038); document the manual deploy steps.

## Task 4: Add repository governance

- [ ] Add root README, license decision note, contribution/security/privacy documents, issue templates, and exact verification commands.
- [ ] Link `AGENTS.md`, project state, spec, decision log, review, and plans.
- [ ] Verify a fresh clone can install, check, test, and build.

## Exit gate

- Fresh-clone commands are green.
- Contracts encode controlled versus experimental previews and sourced materials.
- No speculative cloud/sync code exists.
- The owner reviews the resulting interface map before Phase 2.
