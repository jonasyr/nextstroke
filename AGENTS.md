# NextStroke Agent Guide

Read `docs/README.md` before changing code or plans. This repository is currently documentation-first: no application implementation has been approved yet.

## Current state

- Product direction was revised after an independent feasibility review on 2026-10-03.
- The approved core is **Coach + controlled layer**, not whole-image AI makeover.
- `v0.1` targets fineliner only.
- Phase 0 is a 1–2 week proof of feasibility and must pass before production architecture is expanded.
- First public storage is local plus export. Accounts, cloud sync, colored pencil, and watercolor are later work.
- A small sourced fineliner/paper knowledge base and optional calibration card are part of the MVP.

See `docs/project-state.md` for the exact handoff state and `docs/decisions/decision-log.md` for rationale.

## Non-negotiable product rules

1. Quick Compare remains usable without an account, network, or AI.
2. Original and checkpoint assets are immutable.
3. Provider-generated full images are untrusted assets, never accepted change layers.
4. Final comparison composites are rendered locally from the immutable original plus a controlled overlay.
5. Pixels outside the editable region and inside protected geometry are copied from the original.
6. A preview may be shown as experimental inspiration when it fails the controlled-overlay bar, but it must be visibly labeled and never called safe.
7. Advice must be physically executable with the selected fineliner and paper profile.
8. Material facts require provenance. An LLM may explain sourced facts but may not invent product properties.
9. iPhone Safari requires real-device testing. Playwright WebKit is useful but is not an iPhone Safari release gate.
10. A legitimate outcome is that no controlled preview can be produced.

## Required workflow

1. Confirm the active phase in `docs/project-state.md`.
2. Read the governing spec and the active phase plan.
3. Do not start Phase 1 until Phase 0 evidence meets every GO criterion.
4. Use test-driven implementation for retained code.
5. Keep source files focused and framework-independent logic outside React components.
6. Update the decision log, project state, spec, and plan in the same change whenever scope, architecture, privacy, external services, or quality gates change.
7. Never commit secrets, user artwork, unlicensed fixtures, provider responses containing personal images, or image-content telemetry.

## Document authority

When documents conflict, use this order:

1. The newest approved decision entry
2. `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`
3. `docs/project-state.md`
4. Accepted Architecture Decision Records
5. The revised master plan
6. The active phase plan
7. Historical documents and the independent review
8. Code comments and issue discussions

This matches `docs/README.md`.

Historical rationale is evidence, not current scope. Do not silently revive superseded requirements.

## Stop conditions

Stop and request a product decision when a change would:

- weaken immutable-original or explicit-upload guarantees;
- describe an experimental preview as exact or safe;
- add a new material to `v0.1`;
- add account, sync, or cloud storage before demonstrated demand;
- move forward after a failed Phase 0 gate without documenting the selected pivot;
- use a material claim without a source and confidence level.
