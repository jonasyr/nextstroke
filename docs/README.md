# NextStroke Documentation Index

This is the canonical map of NextStroke's product and engineering context. Humans and AI agents should start here rather than infer intent from code or chat history.

The working historical comparison app is stored at `legacy/fineliner-lupe/`; its README explains how to run it.

## Required reading order

1. [Current project state](project-state.md) — what is approved, what exists, and what happens next.
2. [Origin and evolution](product/origin-and-evolution.md) — how Fineliner Lupe became NextStroke and why the first plan changed.
3. [Decision log](decisions/decision-log.md) — choices, alternatives, superseded decisions, and reconsideration triggers.
4. [Independent feasibility review](reviews/2026-10-03-independent-feasibility-review.md) — external evidence and failure analysis; informative where later decisions supersede its recommendations.
5. [Approved product and system design](superpowers/specs/2026-10-03-nextstroke-product-design.md) — authoritative scope and invariants.
6. [Material knowledge base](product/material-knowledge-base.md) — source model, provenance, and calibration design.
7. [Revised master implementation plan](superpowers/plans/2026-10-03-nextstroke-master-implementation-plan.md) — phase order and gates.
8. The active or proposed phase plan:
   - [Phase 0: Proof of Feasibility](superpowers/plans/2026-10-03-nextstroke-phase-0-proof-of-feasibility.md)
   - [Phase 1: Lean Foundation](superpowers/plans/2026-10-03-nextstroke-phase-1-foundation.md)
   - [Phase 2: Quick Compare](superpowers/plans/2026-10-03-nextstroke-phase-2-quick-compare.md)
   - [Phase 3: Fineliner Coach and Local Projects](superpowers/plans/2026-10-03-nextstroke-phase-3-guided-project.md)
   - [Phase 4: Controlled Preview and Local Beta](superpowers/plans/2026-10-03-nextstroke-phase-4-beta-cloud-ai.md)
9. [Documentation readiness review](reviews/2026-10-03-documentation-readiness-review.md) — contradiction table, verified claims, and Phase 0 readiness.
10. [Context-free continuation prompt](handoffs/continue-planning-prompt.md) — handoff for an AI that sees only the repository.

## Authority order

If documents disagree, use this order:

1. A newer explicitly approved decision entry
2. The approved product and system design
3. `docs/project-state.md`
4. Accepted Architecture Decision Records
5. The revised master implementation plan
6. The active phase plan
7. Historical product/review documents
8. Code comments and issue discussions

Implementation plans explain how to build the approved design; they do not silently override it.

## Where information belongs

| Information | Canonical location |
| --- | --- |
| Product promise, scope, invariants | `docs/superpowers/specs/` |
| Current status and next gate | `docs/project-state.md` |
| Original app and product evolution | `docs/product/origin-and-evolution.md` |
| Material facts, provenance and calibration | `docs/product/material-knowledge-base.md` |
| Decision options and rationale | `docs/decisions/decision-log.md` |
| One major technical choice | `docs/decisions/NNNN-*.md` |
| Task order, files, tests, commits | `docs/superpowers/plans/` |
| Privacy model and data flow | `docs/privacy/README.md` |
| License status and dependency policy | `docs/legal/license.md` |
| Web app build and deployment | `apps/web/README.md` |
| Package interfaces and boundaries | `docs/architecture/interface-map.md` |
| Current version targets | `docs/roadmap/` (created when needed; until then spec §16) |
| Experiment results | `docs/research/` |
| Contributor and agent rules | root `AGENTS.md` and `CONTRIBUTING.md` |
| Existing working prototype | `legacy/fineliner-lupe/` |
| Independent audits | `docs/reviews/` |
| Context-free handoffs | `docs/handoffs/` |

## Maintenance rule

Every pull request that changes product behavior, privacy, architecture, external services, or a committed roadmap decision must update the appropriate document in the same pull request. A decision is not durable if it exists only in a chat, issue, or commit message.

After every phase gate, update `docs/project-state.md`. Preserve old review evidence and mark superseded decisions instead of deleting the history.
