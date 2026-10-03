# NextStroke Documentation Index

This is the canonical map of NextStroke's product and engineering context. Humans and AI agents should start here rather than infer intent from code or chat history.

## Required reading order

1. [Origin and evolution](product/origin-and-evolution.md) — what existed first and why NextStroke became a broader product.
2. [Decision log](decisions/decision-log.md) — choices made, alternatives considered, and triggers for reconsideration.
3. [Approved product and system design](superpowers/specs/2026-10-03-nextstroke-product-design.md) — authoritative scope and invariants.
4. [Master implementation plan](superpowers/plans/2026-10-03-nextstroke-master-implementation-plan.md) — phase order and cross-phase gates.
5. The active phase plan:
   - [Phase 1: Foundation](superpowers/plans/2026-10-03-nextstroke-phase-1-foundation.md)
   - [Phase 2: Quick Compare](superpowers/plans/2026-10-03-nextstroke-phase-2-quick-compare.md)
   - [Phase 3: Guided Project](superpowers/plans/2026-10-03-nextstroke-phase-3-guided-project.md)
   - [Phase 4: Beta Cloud and AI](superpowers/plans/2026-10-03-nextstroke-phase-4-beta-cloud-ai.md)

## Authority order

If documents disagree, use this order:

1. A newer explicitly approved design amendment
2. The approved product and system design
3. Accepted Architecture Decision Records
4. The active implementation plan
5. The decision log and product history
6. Code comments and issue discussions

Implementation plans explain how to build the approved design; they do not silently override it.

## Where information belongs

| Information | Canonical location |
| --- | --- |
| Product promise, scope, invariants | `docs/superpowers/specs/` |
| Original app and product evolution | `docs/product/origin-and-evolution.md` |
| Decision options and rationale | `docs/decisions/decision-log.md` |
| One major technical choice | `docs/decisions/NNNN-*.md` |
| Task order, files, tests, commits | `docs/superpowers/plans/` |
| Privacy model and data flow | `docs/privacy/` |
| Current version targets | `docs/roadmap/` |
| Contributor and agent rules | root `CONTRIBUTING.md` and `AGENTS.md` |

## Maintenance rule

Every pull request that changes product behavior, privacy, architecture, external services, or a committed roadmap decision must update the appropriate document in the same pull request. A decision is not durable if it exists only in a chat, issue, or commit message.
