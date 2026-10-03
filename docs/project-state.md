# Current Project State

**Updated:** 2026-10-03

**Repository:** `https://github.com/jonasyr/nextstroke`

**Branch:** `main`

**Implementation status:** Working legacy comparison prototype imported; disposable Phase 0 lab in progress under `lab/`; production rewrite not started

**Active phase:** Phase 0 proof of feasibility, approved 2026-10-03 (D-041). Done: lab tooling, hosting probe, material sheet draft, corpus prepared and annotations owner-approved (8 cases incl. one comparison case). S3 and ideas done via subagents (D-045; orchestrator screening 7/7 GO cases controlled on attempt 1, owner ratings pending). Next: S1/S2 via OpenAI API in a new session (`docs/handoffs/2026-10-03-phase-0-openai-run.md`), rating, beginner study

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

## Evidence status

- 2026-10-03 ChatGPT Sites probe on a real iPhone (iOS 26.5.2, Home Screen app): every hosting criterion passed, including offline service worker, `.wasm` MIME, single-threaded opencv.js, and ten 12 MP cycles without crash. Open: background/resume, `persist()`, 24/48 MP and HEIC inputs, exact device model. See `docs/research/2026-10-03-sites-probe-iphone.md`.

- The existing Fineliner Lupe prototype is preserved at `legacy/fineliner-lupe/` and can be served directly from its `dist/` directory.
- An independent review concluded `GO, ABER PLAN ÄNDERN`.
- Core comparison, manual alignment, local projects, and structured analysis are feasible.
- Exact mask following, true alpha-layer recovery from a generated full image, and semantic safety from pixel-diff alone are not established.
- There is no known complete open database of artist fineliners, paper interaction, and executable techniques. NextStroke must curate a small evidence-backed dataset.

Full review: `docs/reviews/2026-10-03-independent-feasibility-review.md`.

## Current milestone

The documentation readiness review is complete and the revised Phase 0 plan awaits owner approval. Phase 0 then compares, under the attempt and futility rules of D-035:

1. S1 masked full-composite editing followed by hard original copyback (baseline; at most experimental);
2. S2 direct transparent overlay generation;
3. S3 structured strokes/SVG rendered deterministically.

Only S2 or S3 can satisfy GO. Full-composite generation remains an experimental inspiration path.

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

- all revised documents are internally consistent;
- Phase 0 has exact dataset, metrics, costs, privacy handling, and decision outcomes (done in the 2026-10-03 readiness review);
- the owner has reviewed and approved the Phase 0 plan;
- implementation has not silently expanded beyond the approved experiment.
