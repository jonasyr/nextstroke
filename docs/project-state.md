# Current Project State

**Updated:** 2026-10-03

**Repository:** `https://github.com/jonasyr/nextstroke`

**Branch:** `main`

**Implementation status:** Working legacy comparison prototype imported; disposable Phase 0 lab in progress under `lab/`; production rewrite not started

**Active phase:** Phase 0 closed 2026-10-03 with PIVOT (D-048): S3 retained as the only preview strategy (6 of 7 cases controlled, all technical criteria met); the beginner criteria were not measured and become a hard Phase 3 exit gate. Report: `docs/research/phase-0-results.md`. Next: Phase 1 lean foundation (`docs/superpowers/plans/2026-10-03-nextstroke-phase-1-foundation.md`) Follow-up shading test (D-049) done: S3 4/7 controlled but looks mechanical, S2-v2 2/7 (placement), S1-v2 best looking but experimental by rule; owner decision on the preview route pending.

**Latest review:** `docs/reviews/2026-10-03-documentation-readiness-review.md`

## One-sentence product definition

NextStroke is an iPhone-first physical-art coach that compares an artwork with a reference or checkpoint and recommends the next physically executable fineliner action using sourced tool knowledge, explicit uncertainty, and overlays that never replace the immutable original.

## Confirmed decisions from the 2026-10-03 review session

1. **Product core:** Coach + controlled layer.
2. **Material scope:** Fineliner only for `v0.1`; colored pencil follows only after separate evidence; watercolor is later research.
3. **Sequence:** A timeboxed Phase 0 precedes production infrastructure.
4. **Unsafe result behavior:** The best failed candidate may be shown only as clearly labeled experimental inspiration, accompanied by a physical instruction. It is never described as safe, and it is exportable only with a warning drawn into the image (D-033).
5. **Storage:** Local projects plus explicit export. No account or cloud sync in the first public version.
6. **Knowledge:** A curated, sourced fineliner and paper knowledge base is part of the MVP.
7. **Calibration:** A two-minute personal pen-and-paper test card is optional but recommended.
8. **Existing capability retained:** Quick Compare remains a first-class offline mode with original/reference uploads, alignment, opacity control, tap/hold original reveal, immersive comparison, and image export.
9. **Phase 0 corpus:** 30 fineliner photographs (D-030).
10. **Phase 0 budget:** No additional spend; manual runs in the owner's ChatGPT and Claude subscriptions (D-031).
11. **Phase 0 outcomes:** GO or PIVOT only; no STOP outcome (D-032).
12. **Phase 0 study and devices:** standardized starter drawings plus optional own work; owner's current iPhone only, iPhone 11-class test deferred to the Phase 2 exit gate (D-034).
13. **Phase 0 effort:** stop-at-first-success attempts, futility stop, reduced S1 baseline, combined Claude chats, pre-built lab tooling, and up to 10 printed licensed drawings (D-035).
14. **Libraries:** reuse the vetted open-source stack in spec §13.2 (D-036).
15. **Tooling:** uv for Python, pnpm for TypeScript, `scripts/setup.sh` (D-037).
16. **Hosting:** every build must deploy to ChatGPT Sites; static mode, no required headers (D-038).
17. **Quality guardrails:** modular ports-and-adapters design, TDD, automatic lint/format/type checks in pre-commit and CI, git workflow in `CONTRIBUTING.md` (D-039).
18. **Language:** German UI for `v0.1`, English later, message catalog from Phase 1 (D-040).
19. **Phase 0 approved** with the review's proposed values; legacy demo images are not fixtures (D-041).
20. **Corpus sources:** Pinterest drawings allowed, kept private, reported separately (D-042).
21. **Device evidence:** first probe run accepted for Phase 0; remaining device checks move to the Phase 2 exit gate (D-043).
22. **Corpus size:** 12 supplied images; 7 fineliner cases count toward GO (5 of 7 needed), 5 are comparison-only (D-044).
23. **Generation route:** S3/ideas via contextless Claude subagents; S1/S2 via OpenAI API with proxy-injected key, cap USD 5 (D-045).
24. **OpenAI run parameters:** `gpt-image-2.5-sunburst`, medium quality, edits endpoint with reference photo, measured cost from `usage`, refusals count as attempts (D-046).
25. **Rating:** round 2 skipped; round-1 owner ratings are final (D-047).
26. **Phase 0 outcome:** PIVOT; S3 is the only retained preview strategy; beginner study is the Phase 3 exit gate before any Phase 4 preview work or public test (D-048).

## Evidence status

- 2026-10-03 ChatGPT Sites probe on a real iPhone (iOS 26.5.2, Home Screen app): every hosting criterion passed, including offline service worker, `.wasm` MIME, single-threaded opencv.js, and ten 12 MP cycles without crash. Open: background/resume, `persist()`, 24/48 MP and HEIC inputs, exact device model. See `docs/research/2026-10-03-sites-probe-iphone.md`.

- The existing Fineliner Lupe prototype is preserved at `legacy/fineliner-lupe/` and can be served directly from its `dist/` directory.
- An independent review concluded `GO, ABER PLAN ÄNDERN`.
- Core comparison, manual alignment, local projects, and structured analysis are feasible.
- Exact mask following, true alpha-layer recovery from a generated full image, and semantic safety from pixel-diff alone are not established.
- There is no known complete open database of artist fineliners, paper interaction, and executable techniques. NextStroke must curate a small evidence-backed dataset.

Full review: `docs/reviews/2026-10-03-independent-feasibility-review.md`.

## Current milestone

Phase 0 is closed with PIVOT (D-048). Of the three strategies, S3 structured strokes rendered locally met every technical criterion and is the only preview path Phase 4 may retain. S2 is not retained. S1 full-composite editing stays an experimental inspiration path only. Whether the coach helps beginners is untested; the beginner criteria are a hard Phase 3 exit gate.

Next is Phase 1, the lean foundation. Freeze only interfaces Phase 0 supports: S3 stroke plans, not transparent-layer or full-composite contracts beyond the experimental label.

The prototype is not Phase 0 evidence by itself. It is the reference for upload, comparison, gestures, alignment, immersive viewing, and export behavior.

## Do not build yet

- account system or Cloudflare Access integration;
- D1/R2 project sync;
- generalized provider abstraction;
- watercolor support;
- colored-pencil production support;
- semantic claims such as “99% safe” based on pixel ratios;
- alpha reconstruction marketed as a true change layer;
- native element fullscreen as an iPhone requirement.

## Definition of the next successful handoff

- Phase 1 workspace and quality gates exist and pass from a fresh clone;
- contracts encode the preview vocabulary with S3 stroke plans as the only controlled route;
- no account, sync, D1, or R2 scaffolding exists;
- the Phase 3 beginner gate from D-048 is still open and not assumed passed.
