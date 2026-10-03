# NextStroke Phase 4 Controlled Preview and Local Beta Plan

> **For agentic workers:** The historical filename is retained for stable links; this phase no longer includes project cloud sync. Implement only the preview path approved by Phase 0 evidence.

**Goal:** Add the evidence-backed controlled-preview path, visibly separate experimental inspiration, close the checkpoint loop, and harden a local-first public beta.

**Architecture:** The browser remains authority for masks, original-copy boundaries, compositing, trust classification, and project state. A minimal stateless API protects model credentials and enforces cost/rate limits if the retained strategy needs a paid provider.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Constraints

- No account, project sync, D1, or R2 asset store.
- Do not implement a strategy that failed Phase 0.
- Provider outputs remain untrusted.
- Experimental inspiration is never called safe, exact, or controlled.
- Every upload requires explicit confirmation.
- Model IDs, prompt/schema versions, costs, and retention behavior are recorded without image-content logs.

## Review focus

1. Provider changes behavior or returns full images instead of alpha.
2. Registration fails because of lighting, perspective, or source mismatch.
3. Protected geometry intersects desired marks or feather band.
4. Timeout/retry creates duplicate cost or inconsistent project state.
5. Warning labels disappear in immersive mode, share, or export.

## Task 1: Retain one preview adapter

- [ ] Implement only the Phase 0-approved direct-alpha or structured-stroke/SVG adapter.
- [ ] If full-composite generation is retained, classify it experimental by default.
- [ ] Validate runtime responses and record version/cost/latency metadata.

## Task 2: Local safety compositor

- [ ] Use editable, protected, and feather masks in source-normalized coordinates.
- [ ] Copy original pixels outside editable and inside protected regions.
- [ ] Separate geometry, photometry, contour, and human-approval results.
- [ ] Prevent illegal promotion to controlled state.

## Task 3: Preview UX

- [ ] Show trust state persistently in standard and immersive views.
- [ ] Provide opacity, original reveal, and changes-only backgrounds for controlled overlays.
- [ ] For experimental inspiration, show warning and physical instruction; export or share only with the warning drawn into the image, never clean; instruction-only export is always allowed (D-033).
- [ ] Support “no controlled preview available” as a complete outcome.

## Task 4: Minimal API and cost controls

- [ ] Explain transmitted data before request and send only confirmed working assets.
- [ ] Add authentication suitable for protecting the service endpoint without introducing user project accounts.
- [ ] Add rate limit, idempotency, request size, timeout, retry, and cost ceilings.
- [ ] Document provider retention and deletion behavior before beta.

## Task 5: Public beta hardening

- [ ] Complete checkpoint capture and Quick Compare loop.
- [ ] Verify local backup export and recovery copy.
- [ ] Run accessibility, offline/update, privacy, and real-iPhone matrices.
- [ ] Publish only after owner review of evidence and operating-cost limits.

## Exit gate

- Controlled previews meet Phase 0-derived criteria on a fresh holdout set run through the production API path, because Phase 0 evidence was manual (D-031).
- Experimental state remains distinct in every display/share/export path.
- No project image is stored by the service beyond documented transient processing.
- Real-device, accessibility, privacy, and cost gates are green.

## Explicitly later

Optional accounts, multi-device sync, D1/R2 project storage, colored pencil, watercolor, community, and AR each require a separate approved design and plan.
