# NextStroke Revised Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` only after the owner approves the active phase plan. Use test-driven development for retained code.

**Goal:** Prove the risky preview and physical-execution assumptions first, then deliver an offline-first fineliner coach without premature cloud infrastructure.

**Architecture:** Phase 0 is a disposable evidence lab. Production work begins only from passed evidence and keeps Quick Compare, material knowledge, coaching, imaging, and UI in separable units. `v0.1` stores projects locally; a minimal server exists only where secrets or paid model calls require it.

**Tech direction:** TypeScript, React, Vite with `vite-plugin-pwa`, Canvas 2D, IndexedDB/Dexie, Zod, Radix UI, opencv.js in a worker, perfect-freehand, pdfjs-dist, fflate, Vitest, Testing Library, Playwright plus real iPhone Safari. The full reuse list is spec §13.2 (D-036). Hosting is ChatGPT Sites (spec §13.1, D-038). Tooling: pnpm for TypeScript, uv for Python lab tooling, `scripts/setup.sh` as entry point (D-037). Exact versions are chosen after Phase 0.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Global constraints

- Public repository: `jonasyr/nextstroke`, intended AGPL-3.0.
- `v0.1` is fineliner-only.
- Quick Compare works without an account, network, or AI.
- Originals/checkpoints are immutable; final composites are local.
- Provider full images are untrusted and never called change layers.
- Controlled and experimental preview states remain distinct.
- Material advice uses sourced claims and deterministic feasibility rules.
- First public persistence is local plus export; no account or cloud sync.
- Real iPhone Safari is a release gate.
- No user art, secrets, proprietary catalog copies, or image-content telemetry in git or logs.
- Paid live-model tests require explicit owner approval and cost limits. Phase 0 uses no paid API (D-031).

## Phase order

| Phase | Plan | Outcome | Start gate |
| --- | --- | --- | --- |
| 0 | `2026-10-03-nextstroke-phase-0-proof-of-feasibility.md` | Evidence on preview, device, cost, and beginner execution | Owner approves experiment |
| 1 | `2026-10-03-nextstroke-phase-1-foundation.md` | Lean retained workspace derived from passed experiments | Every Phase 0 GO criterion passes or the owner records a pivot (no STOP outcome, D-032) |
| 2 | `2026-10-03-nextstroke-phase-2-quick-compare.md` | Offline comparison utility on real iPhones | Foundation green |
| 3 | `2026-10-03-nextstroke-phase-3-guided-project.md` | Fineliner knowledge, three ideas, instructions, calibration, local projects | Quick Compare useful and stable |
| 4 | `2026-10-03-nextstroke-phase-4-beta-cloud-ai.md` | Passed controlled-preview path, checkpoints, export, public beta hardening | Coach useful without generated preview |

Cloud accounts/sync are not Phase 4. They require demonstrated demand and a future design.

## Cross-phase ownership

| Interface | First owner | Rule |
| --- | --- | --- |
| Evaluation corpus and rubric | Phase 0 | Preserve all attempts; no best-of-only reporting |
| Preview artifact vocabulary | Spec / Phase 0 | Do not collapse composite, difference, controlled, and experimental artifacts |
| Workspace and contracts | Phase 1 | Freeze only interfaces supported by Phase 0 evidence |
| Compare transforms/rendering | Phase 2 | Framework-independent and shared by checkpoint view |
| Materials/evidence/rules | Phase 3 | Offline dataset, provenance required |
| Local project repository/export | Phase 3 | Recoverable failures and explicit backup |
| Checkpoint capture and comparison | Phase 3 (non-preview flow) | Phase 4 adds preview state to the same checkpoint view |
| Retained preview adapter | Phase 4 | Only the Phase 0 winner; provider output remains untrusted |

## Release gates

### Phase 0

- All numerical GO criteria in the spec pass, or the owner explicitly approves the documented pivot.
- The report includes every attempt, cost, latency, device outcome, and rejected result.
- No production interface is inferred from a failed strategy.

### Phase 1

- Fresh-clone quality commands pass.
- Contracts encode the accepted artifact vocabulary and sourced material model.
- No account, sync, D1, or R2 scaffolding exists.

### Phase 2

- Original/reference import, manual alignment, opacity, original reveal, CSS immersive mode, and export work offline.
- Automatic alignment exposes confidence and manual fallback.
- Real-device memory and gesture checklist passes on oldest supported (iPhone 11 class) and current iPhone; this closes the device risks left open in Phase 0: iPhone 11 class (D-034), background/resume during processing, 48 MP and HEIC photos, and the `persist()` result (D-043).

### Phase 3

- A beginner can receive three fineliner-feasible ideas and follow one without generated preview.
- Deferred Phase 0 beginner gate (D-048): with 5–8 beginners on standardized starters, at least 70% understand the instruction and at least 60% do not worsen the work. Phase 4 does not start before this passes.
- Every material fact has provenance or is explicitly generic/unknown.
- Calibration is optional and skippable.
- Local project reload, backup export, and database-failure recovery are exercised.

### Phase 4

- Only the preview strategy that passed Phase 0 is retained: S3 structured strokes, built as the hybrid S1 template → S3 stroke plan (D-048, D-051), with median latency under 60 s and holdout reconfirmation.
- Controlled overlays obey original-copy boundaries.
- Experimental inspiration is visibly distinct and never called safe.
- Checkpoint comparison closes the physical loop.
- Public deployment on ChatGPT Sites has rate/cost limits, privacy copy (including Sites analytics), accessibility, and real-iPhone evidence.

## Estimated solo sequence

| Stage | Optimistic | Realistic | Pessimistic |
| --- | ---: | ---: | ---: |
| Phase 0 | 1 week | 2 weeks | 3–4 weeks |
| Reduced MVP after GO | 5–7 weeks | 9–13 weeks | 16–24 weeks |
| Stable public v1 | 24–32 weeks | 40–60 weeks | 70–100+ weeks |

Estimates include device testing and user research. They are not promises.

## Estimated model and operating cost

| Stage | Range | Basis |
| --- | --- | --- |
| Phase 0 | USD 0 additional | Manual runs in existing ChatGPT and Claude subscriptions (D-031) |
| Phase 0, if repeated through the API | about USD 10–20 | About 180 image edits at about USD 0.02–0.04 each plus about 90 text/vision calls; estimate from OpenAI published pricing checked 2026-10-03, to be measured |
| Per accepted preview in production | about USD 0.03–0.30 | Depends on strategy: S3 strokes cost cents, image strategies about USD 0.02–0.04 per attempt at medium quality plus retries |
| Small local beta | USD 10–100 per month plus model usage | Static hosting, minimal API, cost ceilings |

All figures are estimates from the 2026-10-03 review and published prices; Phase 0 and the Phase 4 API reconfirmation replace them with measured values.

## Feature track: templates and the NextStroke collection (D-070)

Approved by the owner on 2026-10-07. A *Vorlage* (template) is what the user draws after and compares against; *inspiration* is only looked at. The same image may serve both, but the UI always says which. Research and measured counts: `docs/research/2026-10-07-open-ink-drawings.md`.

| Step | What | Phase and plan | Preconditions |
| --- | --- | --- | --- |
| T1 | Optional template in a coach project: pick from camera, photos or files; stored as an immutable `reference` asset with its own paper corners; shown in the project view and in "Vorher und jetzt"; "Im Schnellvergleich öffnen" opens drawing and template (or start and checkpoint) already aligned | Phase 3, Task 6 | Done 2026-10-07 |
| T2 | Goal "Näher an die Vorlage": local, deterministic comparison of the straight drawing and template; proposes areas where the template is clearly darker (fineliner can only add ink); ideas refer to the template | Phase 3, Task 7 | T1; after the beginner study, not part of its gate |
| T3 | NextStroke collection as a template and inspiration source: a few hundred curated public-domain (CC0) pen-and-ink drawings, filterable by motif, technique and difficulty; each image keeps source, object id, licence and retrieval date; images load on demand, a chosen template is stored in the project, Quick Compare stays fully offline | Phase 4, Task 6 | A 30-image sample reviewed by the owner; hosting decided |
| T4 | "Sieht ähnlich aus wie meins": similarity search over the collection (image embeddings) | Explicitly later (Phase 4 plan) | T3; a separate approved design |
| T5 | Opt-in user gallery of modern fineliner work | Explicitly later | Accounts, consent and moderation (master plan: later) |

## Context and decision maintenance

- Update `docs/project-state.md` after each gate.
- Record every changed owner decision in `docs/decisions/decision-log.md` with alternatives.
- Keep failed experiment evidence; do not erase it when pivoting.
- Update `AGENTS.md` only for durable contributor/agent rules.
- A new AI should begin with `docs/handoffs/continue-planning-prompt.md`.

## Whole-product verification direction

Once retained code exists, the root verification command must cover formatting, linting, types, unit tests, build, browser E2E, license checks, and documentation links. Playwright WebKit supports automation but never replaces the real-iPhone checklist.

No phase starts automatically. The owner reviews the active written plan and its evidence first.
