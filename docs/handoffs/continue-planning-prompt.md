# Context-Free Continuation Prompt

Copy the prompt below into another capable coding AI. Give it access to this repository but no chat transcript.

---

You are taking over the NextStroke repository at `https://github.com/jonasyr/nextstroke`. You have no reliable conversational context. Treat the repository documents as the only source of truth and begin with context gathering, not implementation.

Your mission is to independently validate and finish the revised product specification and implementation plans after a feasibility review. Do not write product code until the documentation gates below are satisfied and the repository owner explicitly approves the active phase plan.

## Mandatory first actions

1. Read the root `AGENTS.md` completely.
2. Read `docs/README.md` and follow its required reading order.
3. Read these files completely:
   - `docs/project-state.md`
   - `docs/product/origin-and-evolution.md`
   - `docs/product/material-knowledge-base.md`
   - `docs/decisions/decision-log.md`
   - `docs/reviews/2026-10-03-independent-feasibility-review.md`
   - `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`
   - `docs/superpowers/plans/2026-10-03-nextstroke-master-implementation-plan.md`
   - every phase plan referenced by the master plan
4. Inspect git status, recent commits, repository tree, and any open code. Do not assume application code exists.
5. Inspect `legacy/fineliner-lupe/` completely enough to understand the existing static app, its hosted configuration, bundled PDF.js runtime, and supported behaviors. Treat it as a behavioral reference, not the target architecture.
6. Build a contradiction table: document/section, conflicting claim, current authority, proposed resolution.
7. Verify unstable technical claims against current primary sources. For platform and API behavior use official documentation first; use papers for research limits, GitHub/WebKit issues for reproducible failures, and forums only as anecdotal risk evidence.

## Confirmed owner decisions you must preserve

- Product core: `Coach + controlled layer`.
- `v0.1` supports fineliner only.
- Phase 0 proof of feasibility comes before production infrastructure.
- Quick Compare remains a first-class offline mode.
- First public storage is local projects plus export; no account or sync.
- A clearly warned experimental inspiration preview may be shown when no controlled preview succeeds, but it must not be described as safe or exact.
- The MVP includes a small sourced fineliner/paper knowledge base.
- Personal pen-and-paper calibration is optional but recommended.
- Original and checkpoint images remain immutable.
- Provider full-image output is untrusted.
- No LLM may invent pen or paper properties.
- iPhone Safari is a real-device release target.

## Review requirements

Check whether the revised documents:

1. test the riskiest hypothesis in Phase 0 within 1–2 weeks;
2. compare direct transparent overlay, deterministic SVG/stroke rendering, and full-composite inpainting without cherry-picking;
3. define exact GO, PIVOT, and STOP criteria;
4. distinguish `GeneratedComposite`, `ControlledOverlay`, `DerivedDifferenceOverlay`, and `ExperimentalInspiration`;
5. hard-copy the original outside editable regions and inside protected geometry;
6. avoid claiming semantic safety from a pixel-difference percentage;
7. define memory-bounded iPhone image processing and real-device tests;
8. keep Quick Compare useful without AI;
9. defer accounts, cloud sync, generalized provider abstraction, colored pencil, and watercolor;
10. define evidence provenance, confidence, licensing, and offline delivery for the material knowledge base;
11. preserve a legitimate “no controlled preview available” outcome;
12. give a solo developer realistic time and model-cost ranges.

## Expected output before any implementation

Produce:

- a concise repository state summary;
- a list of contradictions or missing decisions ranked BLOCKER/HIGH/MEDIUM/LOW;
- proposed documentation patches;
- a revised Phase 0 checklist if any item is ambiguous;
- a recommendation of `READY FOR OWNER REVIEW` or `NOT READY`, with reasons;
- exact files changed and verification commands run.

Use small, reviewable commits. Never silently change confirmed owner decisions. Ask the owner with clickable or otherwise easy-to-answer choices when a genuine product tradeoff remains. Do not create cloud resources, spend money, upload artwork, or call paid models without explicit approval.

Only after the owner approves the written Phase 0 plan may you propose an execution method. Phase 0 code is throwaway experimental code unless the owner later approves retaining it.

---
