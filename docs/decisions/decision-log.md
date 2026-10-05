# Product Decision Log

**Purpose:** Preserve the known decision path so a future contributor or AI model can understand not only what was selected, but what was rejected and why.  
**Source:** Product conversation and approvals through 2026-10-03.  
**Rule:** Wording marked “reconstructed” preserves the substance when the exact original option label was not retained.

## D-001 — Expand beyond an overlay-only tool

- **Date:** 2026-10-03
- **Selected:** Physical-art next-step coach with Quick Compare retained as a standalone mode.
- **Alternatives:** Keep only the overlay/alignment utility; build a general-purpose AI art critic or generator.
- **Reason:** Overlay alone does not decide a safe next physical action; a generic generator does not preserve authorship or connect advice to execution.
- **Consequence:** The product needs guided analysis, bounded previews, instructions, checkpoints, and the existing comparison engine.
- **Reconsider when:** Research shows users primarily want comparison and do not complete guided projects.

## D-002 — Product name

- **Date:** 2026-10-03
- **Selected:** `NextStroke` and target repository `jonasyr/nextstroke`.
- **Alternatives:** Rename before implementation; continue name exploration.
- **Reason:** The name expresses the core promise and the owner explicitly chose to keep it after collision research.
- **Consequence:** Existing unrelated uses create a known brand/discovery risk.
- **Reconsider when:** Before paid launch, significant marketing, domain purchase, or trademark filing.

## D-003 — Primary MVP audience

- **Date:** 2026-10-03
- **Selected:** Beginners and hobby artists with an already-started analog artwork (`MVP A`).
- **Alternatives:** A professional-first workflow; a teacher/workshop-first workflow; a general image-editing audience (reconstructed categories).
- **Reason:** Beginners have the clearest need for safe, executable next steps and material-specific instruction.
- **Consequence:** Copy, risk labels, step detail, and defaults prioritize clarity over expert density.
- **Reconsider when:** Beta completion or usefulness differs strongly by experience level.

## D-004 — Role of AI

- **Date:** 2026-10-03
- **Selected:** Guided AI analysis as a supporting subsystem.
- **Alternatives:** No AI beyond deterministic comparison; an open-ended art chatbot; full automatic makeover.
- **Reason:** AI can identify candidate improvements, but the product must remain useful and differentiated through workflow, validation, and execution support.
- **Consequence:** AI starts only after explicit action and returns structured data before any image edit.
- **Reconsider when:** Model cost, latency, or quality fails the beta gates.

## D-005 — Initial material profiles

- **Date:** 2026-10-03
- **Superseded by:** D-023.
- **Originally selected:** Fineliner, colored pencil, and watercolor.
- **Alternatives:** Fineliner only; a broader set of media in the MVP.
- **Reason:** These cover the current artwork style and meaningful differences in stroke, pressure, layering, and water use without making the MVP universal.
- **Consequence:** Contracts and instructions use these three explicit profiles.
- **Reconsider when:** A fourth medium is repeatedly requested and can meet the same safety standard.

## D-006 — Reference image policy

- **Date:** 2026-10-03
- **Selected:** Reference image is optional.
- **Alternatives:** Require a reference; omit references entirely.
- **Reason:** The app must help finish a work even when the user has no ideal target, while still supporting comparison when one exists.
- **Consequence:** Analysis contracts and UI cannot assume a reference asset.

## D-007 — Account and storage model

- **Date:** 2026-10-03
- **Superseded for `v0.1` by:** D-026.
- **Originally selected:** Local-first use with an optional account for sync/backup in the public product.
- **Alternatives:** Mandatory account; device-only storage with no sync.
- **Reason:** Local use protects privacy and lowers friction; optional sync supports backup and device transfer.
- **Consequence:** IndexedDB is primary and server state cannot be the only copy.

## D-008 — Suggestions per analysis

- **Date:** 2026-10-03
- **Selected:** Show three ideas and let the user implement one.
- **Alternatives:** Present one prescribed answer; generate many ideas/previews at once.
- **Reason:** Three supplies meaningful choice without overwhelming a beginner or multiplying image-generation cost.
- **Consequence:** `SuggestionSet` contains exactly three candidates; preview generation waits for selection.

## D-009 — Target platform

- **Date:** 2026-10-03
- **Selected:** iPhone-first progressive web app.
- **Alternatives:** Generic desktop-first responsive web app; native iOS app.
- **Reason:** The artwork is photographed and used beside the physical work; a PWA gives direct mobile access without native-app scope.
- **Consequence:** Safari, touch, safe areas, fullscreen fallbacks, and real-device testing are release requirements.

## D-010 — Initial access model

- **Date:** 2026-10-03
- **Superseded for the first public MVP by:** D-026.
- **Originally selected:** Invite-only private beta with login.
- **Alternatives:** Public MVP; local prototype only; public account-optional release immediately.
- **Reason:** The team needs cost, safety, and usability evidence before exposing model-backed endpoints publicly.
- **Consequence:** Cloudflare Access gates beta deployment; account-optional local mode arrives at public `v1.0`.

## D-011 — System architecture

- **Date:** 2026-10-03
- **Superseded for `v0.1` by:** D-022, D-024, and D-026.
- **Originally selected:** Modular hybrid PWA: local image core plus server-side auth, sync, and AI orchestration.
- **Alternatives:** Entirely local/no backend; server-first application; native client.
- **Reason:** Deterministic imaging and offline comparison belong on-device, while secrets and AI calls require a server boundary.
- **Consequence:** TypeScript monorepo with separate `web`, `api`, `compare`, `imaging`, `contracts`, `ai`, and `ui` units.

## D-012 — Preview rendering and Canvas responsibility

- **Date:** 2026-10-03
- **Superseded by:** D-022 and D-025.
- **Originally selected:** Hybrid preview pipeline: an image model renders a narrowly scoped artistic addition; Canvas aligns, masks, composites, displays, and validates it.
- **Alternatives:** Canvas-only procedural painting; whole-image AI regeneration.
- **Reason:** Canvas cannot invent convincing material-aware artwork, while whole-image generation can alter successful details.
- **Consequence:** Preview is a separate transparent layer with an allowed mask and protected regions.

## D-013 — Safety and privacy level

- **Date:** 2026-10-03
- **Partially superseded by:** D-025 and D-026. Immutable originals, explicit transmission, and protected regions remain; difference validation is diagnostic and `v0.1` has no sync.
- **Originally selected:** Immutable originals, explicit transmission, protected regions, local difference validation, per-project opt-in sync.
- **Alternatives:** Stricter device-only beta; simplified masks/validation for faster development.
- **Reason:** The lighthouse lamp example proved that unintended changes are a core product failure, not a cosmetic defect.
- **Consequence:** Safety checks can reject an attractive preview; logs exclude image content.

## D-014 — Change-boundary control

- **Date:** 2026-10-03
- **Selected:** `Careful`, `Balanced`, and `Bold` based on area, contrast, step count, and physical risk.
- **Alternatives:** An opaque AI intelligence/creativity slider; no user control.
- **Reason:** The control should describe real execution consequences rather than anthropomorphize model capability.

## D-015 — Roadmap shape

- **Date:** 2026-10-03
- **Superseded by:** D-024 and D-026.
- **Originally selected:** Complete private-beta core in `v0.1`, learning improvements in `v0.2`, account-optional public release in `v1.0`, and AR/community only after validated demand.
- **Alternatives:** Smaller MVP without PDF/sync/material breadth; larger MVP with live camera, social features, or more media.
- **Reason:** The selected MVP proves the full differentiated loop without absorbing speculative expansion.

## D-016 — Repository license

- **Date:** 2026-10-03
- **Selected:** AGPL-3.0.
- **Alternatives:** MIT; no license.
- **Reason:** Publicly operated derivatives should contribute their changes while the code remains inspectable and reusable under clear terms.
- **Consequence:** Dependency/license checks must account for AGPL compatibility.

## D-017 — Repository and quality policy

- **Date:** 2026-10-03
- **Scope narrowed by:** D-024. Applies to retained code from Phase 1 onward; disposable Phase 0 experiment code is exempt.
- **Selected:** Full monorepo boundaries, strong `AGENTS.md`, durable product/security/privacy docs, and CI gates from the start.
- **Alternatives:** Simpler initial documentation/CI; stricter mandatory per-change reviewer and coverage rules.
- **Reason:** Image privacy, Safari behavior, and model boundaries are too important to remain implicit.

## D-018 — Mobile navigation

- **Date:** 2026-10-03
- **Selected:** Guided project flow plus independently accessible Quick Compare.
- **Alternatives:** One combined flow; tool-heavy start page with direct editing controls.
- **Reason:** Beginners need a clear next action, while returning users must retain instant access to comparison.

## D-019 — Beta measurement

- **Date:** 2026-10-03
- **Superseded metrics by:** D-024 and the revised specification Phase 0 gates.
- **Originally selected:** Measure completion, comprehension, usefulness, mask adherence, speed, stability, privacy, and Safari compatibility without inspecting image content.
- **Alternatives:** Qualitative interviews only; stricter initial numeric gates.
- **Reason:** Release decisions need observable evidence, but privacy rules exclude image-content analytics.
- **Consequence:** The approved spec contains exact gates and a minimum evidence threshold.

## D-020 — Implementation plan structure

- **Date:** 2026-10-03
- **Superseded by:** D-024.
- **Originally selected:** Master plan plus four independently testable phase plans.
- **Alternatives:** One large plan; two larger client/cloud plans.
- **Reason:** Repository foundation, Quick Compare, guided local workflow, and cloud/AI integration have distinct review and failure boundaries.
- **Consequence:** A later phase cannot start until the previous phase exit gate is green.

## D-021 — Documentation as product infrastructure

- **Date:** 2026-10-03
- **Selected:** Preserve origin, every known decision and option, approved designs, implementation plans, and a canonical documentation index in the repository.
- **Alternatives:** Keep only current-state docs; rely on chat/issue history for rationale.
- **Reason:** Future humans and AI models need a stable map of intent and must not reverse critical decisions by guessing.
- **Consequence:** Behavior or architecture changes update documentation in the same pull request.

## D-022 — Product core after feasibility review

- **Date:** 2026-10-03
- **Selected:** Coach + controlled layer.
- **Alternatives:** AI-preview-first product; comparison-only product.
- **Reason:** Quick Compare and material-aware coaching are feasible and independently useful. Whole-image generation cannot honestly guarantee preservation of existing marks or yield a true transparent change layer.
- **Consequence:** The product leads with three physically executable next-step options, sourced material constraints, instructions, and a locally composited overlay. Full-image generation is secondary and untrusted.
- **Reconsider when:** A provider contract and independent evaluation demonstrate repeatable transparent-overlay output and contour preservation on the target corpus.

## D-023 — Fineliner-only `v0.1`

- **Date:** 2026-10-03
- **Selected:** Fineliner only for the first reliable release.
- **Alternatives:** Fineliner plus colored pencil; fineliner, colored pencil, and watercolor.
- **Reason:** Each medium requires separate physical rules and evaluation. Watercolor adds irreversible pigment, water, and paper-state behavior; treating media as a simple enum hides the real quality work.
- **Consequence:** Colored pencil is a later gated expansion. Watercolor requires separate field research before planning.
- **Reconsider when:** Fineliner meets its own evidence gates and a material-specific study is approved.

## D-024 — Phase 0 before production architecture

- **Date:** 2026-10-03
- **Selected:** Run a strict 1–2 week proof of feasibility on 30 ordinary iPhone photographs before building the production architecture.
- **Alternatives:** Three-day desk test; immediately build the polished MVP.
- **Reason:** The previous plan delayed its highest-risk live-provider experiment until after foundation, comparison, local workflow, sync, and cloud work.
- **Consequence:** Phase 0 compares three preview strategies without cherry-picking and has explicit GO/PIVOT/STOP thresholds. Failed gates prevent automatic progression.

## D-025 — Controlled and experimental preview states

- **Date:** 2026-10-03
- **Selected:** Distinguish controlled overlays from experimental inspiration.
- **Alternatives:** Hide every failed preview; repeatedly regenerate until something looks acceptable.
- **Reason:** The owner wants the best uncertain idea to remain visible, but uncertainty must not become a false safety claim.
- **Consequence:** A failed candidate may appear with prominent warning and physical guidance. It is not called safe or exact. Export behavior is specified by D-033.

## D-026 — Local projects and export before accounts or sync

- **Date:** 2026-10-03
- **Selected:** The first public version stores projects locally and supports explicit export/backup.
- **Alternatives:** Optional account and sync in the MVP; session-only state.
- **Reason:** Accounts, conflict handling, cloud deletion, retention, and privacy expand the MVP without testing the core product value.
- **Consequence:** IndexedDB remains best-effort and the UI must recommend export. Account and sync work requires demonstrated demand and a separate plan.

## D-027 — Sourced material knowledge in the MVP

- **Date:** 2026-10-03
- **Selected:** Ship a small curated fineliner/paper knowledge base with 10–20 common black fineliners and a conservative generic profile.
- **Alternatives:** Let the LLM rely on general knowledge; postpone material intelligence; build a large commercial catalog first.
- **Reason:** Sourced tool constraints make recommendations executable and differentiate NextStroke from a generic art chatbot.
- **Consequence:** Claims include provenance, conditions, evidence level, confidence, and retrieval date. The LLM may explain selected claims but may not invent material facts.

## D-028 — Optional personal calibration card

- **Date:** 2026-10-03
- **Selected:** Offer a two-minute pen-and-paper calibration card as an optional recommended step.
- **Alternatives:** Require calibration; postpone calibration until after MVP.
- **Reason:** Paper and individual pen behavior materially affect line width, darkness, bleed, and layering, but mandatory setup would delay first value.
- **Consequence:** Uncalibrated users receive more conservative advice. Camera-derived measurements are relative and must not be presented as absolute colorimetry.

## D-029 — Preserve the existing Fineliner Lupe prototype

- **Date:** 2026-10-03
- **Selected:** Import the exact tracked static Site implementation into `legacy/fineliner-lupe/`.
- **Alternatives:** Leave the app in a separate private workspace; discard it and rebuild only from documentation; copy only selected snippets.
- **Reason:** The public repository must preserve the actual working upload, comparison, alignment, gesture, PDF, immersive-view, and export behavior that motivated NextStroke.
- **Consequence:** The imported `dist/` app and its local PDF.js assets are a runnable behavioral reference. New production architecture remains governed by Phase 0 and must not treat the compact legacy bundle as the desired module structure.

## D-030 — Phase 0 corpus is fineliner-only

- **Date:** 2026-10-03
- **Supersedes:** The 15 fineliner / 10 colored-pencil / 5 watercolor split in the earlier spec and Phase 0 plan.
- **Selected:** 30 fineliner photographs.
- **Alternatives:** 20 fineliner plus 10 colored pencil; keep 15/10/5.
- **Reason:** Only fineliner can qualify `v0.1`. With 15 cases one case moves the success rate by 6.7 points; 30 cases make the 70% gate less noisy and spend no effort on media that cannot affect the decision.
- **Consequence:** Colored pencil and watercolor evidence moves entirely to their own later gates.
- **Reconsider when:** A colored-pencil study is approved after fineliner passes.

## D-031 — Phase 0 runs manually on existing subscriptions

- **Date:** 2026-10-03
- **Selected:** No additional spend. Image strategies run manually in ChatGPT (Plus/Pro); ideas, instructions, and structured strokes run manually in Claude (Pro/Max).
- **Alternatives:** Paid API with a small cap of about USD 20; a hybrid of the two; pausing Phase 0.
- **Reason:** The owner has no budget for API usage. Manual runs can still show feasibility if every attempt is logged.
- **Consequence:** No API calls, deployed server, or automation of consumer apps. Model versions cannot be pinned; the UI model label and date are recorded instead. Cost becomes an API-equivalent estimate. Training-use settings are disabled before uploads, and consent names the services. Phase 4 must reconfirm the retained strategy through the production API path on a fresh holdout set before a public beta.
- **Reconsider when:** A budget for API evaluation becomes available, or manual evidence is too noisy to decide.

## D-032 — No STOP outcome in Phase 0

- **Date:** 2026-10-03
- **Selected:** Phase 0 has GO and PIVOT outcomes only. Any unmet GO criterion leads to PIVOT; the owner selects and records the pivot.
- **Alternatives:** The review's rule (stop the guided coach below 60% beginner execution and continue Quick Compare alone); a STOP that always requires an owner decision.
- **Reason:** Owner choice. The owner decides the direction after reading the Phase 0 report instead of committing to a predefined stop.
- **Consequence:** The continuation prompt's request for STOP criteria is answered by this decision. The default pivot for preview failures remains the spec's pivot product; other pivots are chosen and recorded by the owner.
- **Reconsider when:** A pivot also fails its own evaluation.

## D-033 — Experimental inspiration export

- **Date:** 2026-10-03
- **Clarifies:** D-025, which allowed either a warning or exclusion; project state and Phase 4 wording conflicted.
- **Selected:** An experimental image can be exported or shared only with a visible warning drawn into the pixels. Clean export is never offered. Instruction-only export is always allowed.
- **Alternatives:** Never exportable; clean export after explicit confirmation.
- **Reason:** A warning that lives only in app UI disappears as soon as the image leaves the app.
- **Reconsider when:** Beta users show that the burned-in warning blocks a legitimate need.

## D-034 — Phase 0 beginner study materials and device scope

- **Date:** 2026-10-03
- **Selected:** Every participant first works on an owner-made standardized starter drawing with pre-generated previews; afterwards a participant may optionally use their own work with consent. Phase 0 device testing uses the owner's current iPhone only.
- **Alternatives:** Standardized starters only; participants' own work only. For devices: borrowing an iPhone 11-class device before Phase 0.
- **Reason:** Standardized starters make the worsening rubric comparable; optional own work adds realism. Only a current iPhone is available.
- **Consequence:** The iPhone 11-class test is an open Phase 0 risk and must pass before the Phase 2 exit gate.
- **Reconsider when:** An iPhone 11-class device becomes available before Phase 0 starts.

## D-035 — Reduce Phase 0 manual effort

- **Date:** 2026-10-03
- **Selected:** S2/S3 attempts stop at the first `controlled` screening result (up to 3); a strategy stops after 10 failed cases; S1 runs once on 10 pre-selected cases; ideas and S3 strokes share one Claude chat per case; lab tooling is built before day 1; up to 10 of 30 cases may be photographs of printed CC0/CC BY line drawings.
- **Alternatives:** Exactly 3 attempts for every case and strategy (about 300 manual interactions); a paid API run of about USD 10–20.
- **Reason:** The manual budget route (D-031) made Phase 0 about 15–25 hours of manual generation. These rules cut it to roughly 6–9 hours without changing GO thresholds. All rules are pre-registered, and every attempt is still reported.
- **Consequence:** S1 evidence is thinner but S1 cannot satisfy GO. Printed toner is not fineliner ink, so printed cases are reported separately. A next-day downgrade of a first-attempt success is not retried, which makes the gate slightly stricter.
- **Reconsider when:** A budget for scripted API runs becomes available.

## D-036 — Reuse existing open-source libraries

- **Date:** 2026-10-03
- **Selected:** Build on existing libraries instead of writing equivalents: opencv.js (Apache-2.0; prebuilt `@techstark/opencv-js` first, trimmed build later, in a Web Worker) for perspective warp, AKAZE/ORB + RANSAC homography, ECC refinement, and edges; jscanify (MIT) as reference for an own corner detector with manual fallback; perfect-freehand (MIT) for stroke rendering; `@use-gesture` or `@panzoom/panzoom` (MIT) for pinch and pan; img-comparison-slider (MIT) for split view; pdfjs-dist (Apache-2.0); native HEIC with heic-to (LGPL-3.0, unmodified, lazy-loaded) as fallback; Radix UI primitives (MIT) for accessible controls; fflate (MIT) for project-package zip export, with JSZip (MIT/GPL-3.0 dual) as alternative; Konva (MIT) only if mask handles need it. Later, only if Phase 0 shows a need: TEED (MIT) for contour suggestions and SlimSAM-77 (Apache-2.0) via transformers.js for region suggestions.
- **Alternatives:** Writing these components ourselves; commercial scanner SDKs.
- **Reason:** These libraries already solve the hard platform and math problems, are maintained, and are compatible with AGPL-3.0 distribution. Commercial SDKs cost money and conflict with the license.
- **Consequence:** Masks stay in framework-independent bitmaps of our own. Every dependency's license is checked again when it is added. Avoid PiDiNet (research-only rider), heic2any (stale decoder), jsfeat and tracking.js (unmaintained), and full SAM/SAM2 or DexiNed on device (too large). Model weights need provenance checks before use.
- **Reconsider when:** A library becomes unmaintained, changes license, or fails real-iPhone memory tests.

## D-037 — Tooling: uv for Python, pnpm for TypeScript, one setup script

- **Date:** 2026-10-03
- **Selected:** Python tooling (Phase 0 desktop analysis such as compositing, boundary audit, and metrics) uses uv with a `pyproject.toml` and lockfile. The web app uses Node with pnpm. `scripts/setup.sh` is the single idempotent entry point: it checks tools, prepares the legacy prototype, and runs `uv sync` or `pnpm install --frozen-lockfile` only when the matching manifest exists.
- **Alternatives:** pip/venv or Poetry; npm or yarn; per-directory setup instructions.
- **Reason:** Owner preference for uv; lockfiles make runs reproducible; one script keeps setup simple for humans and agents.
- **Consequence:** No Python or Node manifest exists until Phase 0 tooling is approved. The setup script must stay idempotent and non-interactive.

## D-038 — ChatGPT Sites is the required host

- **Date:** 2026-10-03
- **Selected:** Every deployable build must run on ChatGPT Sites (OpenAI's hosting; the legacy prototype already deploys there via `.openai/hosting.json`). Static mode is the default; Worker mode is allowed only if a server-side secret is required.
- **Alternatives:** GitHub Pages, Cloudflare Pages, or another static host.
- **Reason:** Owner constraint; hosting is included in the existing ChatGPT plan.
- **Consequence:** Facts verified from learn.chatgpt.com/docs/sites on 2026-10-03: public beta with unpublished plan limits; sites are private until public publishing is enabled; HTTPS at the origin root of `<slug>.<owner>.chatgpt.site` (each site its own origin); traffic analytics recorded automatically; no data residency; Worker mode supports secrets, environment variables, and outbound HTTPS; deployment only through ChatGPT, not CI. Not documented and therefore to be tested on a real deployment: `.wasm` MIME type, file and deploy size limits, custom headers (third-party reports say `_headers` is ignored in static mode, so no COOP/COEP and no threaded WASM), SPA fallback, injected provider scripts, service worker and manifest behavior, and iPhone Home Screen install. The app must work single-threaded, use hash routing or a single route, set no requirement on custom headers, and keep its build a plain static directory.
- **Reconsider when:** A deployment probe fails a deciding criterion, the beta ends or changes terms, or usage limits remove public access.

## D-039 — Architecture and automated quality guardrails

- **Date:** 2026-10-03
- **Selected:** Modular, testable architecture enforced by tools, applied to Phase 0 lab code as well as retained code:
  - pure domain logic (masks, compositing rules, classification, decisions, material rules) separate from I/O, UI, and providers, with ports and adapters at the edges;
  - one responsibility per module; dependencies point inward toward domain code and are checked automatically;
  - test-driven development; domain modules aim for full branch coverage;
  - Python: Ruff for lint and format, mypy in strict mode, pytest, all through uv;
  - TypeScript (from Phase 1): Biome for lint and format, `tsc --strict`, dependency-cruiser for module boundaries, Vitest;
  - pre-commit hooks run format, lint, type checks, and the documentation link check; GitHub Actions CI runs the same checks plus tests on every push and pull request;
  - git workflow in `CONTRIBUTING.md`: short-lived branches, Conventional Commits, pull requests into `main` with green CI, no history rewrites on shared branches, lockfiles committed.
- **Alternatives:** ESLint + Prettier; manual review only; quality tooling deferred to Phase 1.
- **Reason:** Owner request to keep the product from "going rogue". Automated checks stop drift between plan and code cheaply, including in disposable experiment code that feeds the GO decision.
- **Consequence:** Supersedes D-017's "from the start" scope note for tooling: lab code is disposable but still linted, typed, and tested. CI uses only free GitHub Actions minutes for a public repository.
- **Reconsider when:** A tool blocks iPhone or ChatGPT Sites compatibility, or its license changes.

## D-040 — Product language

- **Date:** 2026-10-03
- **Selected:** The `v0.1` user interface is German. English follows later. From Phase 1, all user-facing strings live in a message catalog keyed by ID, with `de` as the only shipped locale.
- **Alternatives:** English first; both languages in `v0.1`.
- **Reason:** Owner choice; the existing prototype and first users are German-speaking.
- **Consequence:** Documentation, code, identifiers, and commit messages stay English. Material-claim paraphrases and instructions are written in German for `v0.1`. Phase 0 study materials are German.
- **Reconsider when:** English-speaking users are recruited for a beta.

## D-041 — Phase 0 plan approved

- **Date:** 2026-10-03
- **Selected:** The owner approved the revised Phase 0 plan, including the values proposed in the readiness review: study data deleted no later than 90 days after the Phase 0 decision, a 2048 px working edge, at least 10 cases with critical contours inside or touching the editable region, and a 100 ms main-thread threshold.
- **Also decided:** The legacy demo images (`legacy/fineliner-lupe/dist/original.png`, `improved.png`) are not used as fixtures or corpus cases, because the artwork is not fineliner-only.
- **Consequence:** Phase 0 is the active phase. Execution starts with prerequisites; the lab code lives in `lab/` on its own branch and is disposable unless a later plan retains it.

## D-042 — Web-sourced corpus images allowed in Phase 0

- **Date:** 2026-10-03
- **Supersedes:** The Phase 0 prerequisite "owner-made works and consenting volunteers only; no web-sourced artwork".
- **Selected:** Corpus cases may be fineliner drawings saved from Pinterest. They are prepared with `nextstroke-lab prepare` (orientation, sRGB, 2048 px cap, 3:2 crop) and stay in the private store.
- **Alternatives:** The owner's own rough starters; printed CC0/CC BY drawings photographed by hand; volunteers' works with consent.
- **Reason:** Owner choice; the owner has no own fineliner works and wants to start quickly.
- **Consequence:** The artists have not consented, so these images are never committed, never used as test fixtures, never shown in the report, and are deleted with the other study data. Pinterest images are usually finished, clean, or edited and often small, while the product targets ordinary handheld photos of started works; GO evidence from them is therefore weaker. Mitigations: mark `source: web` in the manifest, report results split by source, prefer printing some pins on drawing paper and photographing them by hand, and rely on the Phase 4 holdout of real, consented photos before any public beta. Standardized study starters may be printed web drawings on real drawing paper.
- **Reconsider when:** Results differ strongly between web and photographed cases, or consented real photos become available.

## D-043 — First probe run accepted as Phase 0 device evidence

- **Date:** 2026-10-03
- **Selected:** The first ChatGPT Sites probe run on the owner's iPhone 13 mini (iOS 26.5.2, Home Screen app; ten 12 MP cycles without crash or reload) satisfies the Phase 0 device criterion. No second run.
- **Alternatives:** Redeploy the multi-image probe and repeat with background/resume, a 48 MP or HEIC photo, and the `persist()` answer.
- **Reason:** Owner choice; the ChatGPT Sites usage credits for redeployment are used up.
- **Consequence:** Background/resume during processing, 24/48 MP and HEIC decoding, the `persist()` answer, and the iPhone 11 class are untested and move to the Phase 2 real-device exit gate. The Phase 0 report lists them as limitations.
- **Reconsider when:** Sites credits are available again before Phase 2, or a later test crashes on large photos.

## D-044 — Phase 0 corpus is the 12 supplied images; 7 count toward GO

- **Date:** 2026-10-03
- **Supersedes:** The 30-case corpus size in D-030 and spec §15.1.
- **Selected:** The owner supplied 12 images and no more. Seven are fineliner on paper and form the GO corpus (Pinterest pins 7921, 7922, 7924, 7925, 7926, 7928, 7930). Five are comparison-only: the owner's lighthouse (PNG and a handheld HEIC photo; fineliner with colored pencil and watercolor), 7927 (ballpoint with colored pencil), 7923 (digital drawing), 7929 (no paper texture, likely digital). Gates keep their percentages: GO needs ceil(70% × eligible cases), 5 of 7; a strategy stops after more failures than the corpus can absorb (3 of 7); S1 runs once on every eligible case.
- **Alternatives:** Collect more images to reach 30; count all 12 including mixed media and digital drawings.
- **Reason:** Owner choice. Counting mixed media or digital work would evaluate `v0.1` on materials it does not support (D-023).
- **Consequence:** With 7 cases one case moves the success rate by 14 percentage points; a GO is weak evidence and the report must say so. The Phase 4 holdout of real, consented photos carries more weight. `nextstroke-lab decide --corpus-size 7` applies the scaled gate.
- **Reconsider when:** More eligible images become available before the run starts.

## D-045 — Phase 0 generation: contextless Claude subagents for S3, OpenAI API for S1/S2

- **Date:** 2026-10-03
- **Supersedes:** The manual-subscription generation route of D-031 (the no-spend rule stays for everything except the capped OpenAI run).
- **Selected:**
  - Ideas and S3 strokes run as contextless Claude subagents inside Claude Code: each gets only the frozen `ideas-s3-v1` instructions (with material sheet and stroke schema), the case's two messages, and the case image. Both messages are answered in one turn (a single-turn approximation of the two-message chat). Every attempt is a fresh subagent.
  - S1 and S2 run through the OpenAI Images API (GPT Image 2.5) with a hard cost cap of USD 5. The key is injected by the cloud environment's proxy credential for `api.openai.com`; it never appears in chat, code, logs, or git.
  - Because the owner is not available for immediate screening, the orchestrating agent screens attempts for the stop-at-first-success rule (D-035). Final ratings remain the owner's blinded ratings.
- **Alternatives:** Manual runs in the ChatGPT and Claude apps; Anthropic API for S3 (no key available); GPT text model for S3.
- **Reason:** Manual runs were too slow for the owner; only an OpenAI key is available.
- **Consequence:** S3 cost and latency are estimates (no API billing); subagents run on the session model rather than a pinned API model. S1/S2 cost and latency are measured. The orchestrator knows the masks, but subagents do not. Screening by the orchestrator is recorded per attempt so the owner can audit it.
- **Reconsider when:** An Anthropic API key becomes available, or owner ratings disagree with the orchestrator's screening.

## D-046 — OpenAI run parameters for Phase 0 S1/S2

- **Date:** 2026-10-03
- **Refines:** D-045.
- **Selected:**
  - Model `gpt-image-2.5-sunburst`, the GPT Image 2.5 variant OpenAI recommends when editing precision matters (the other variant, `-flare`, targets fast everyday generation). Quality `medium`, `moderation` left at the default `auto`, one image per call.
  - Both strategies use `POST /v1/images/edits` with the case's working photo resized to the standard 3:2 size (`1536x1024` or `1024x1536`). S1 sends the editable region as the mask (transparent where the model may paint), `background=opaque`, prompt `s1-v1`. S2 sends no mask, `background=transparent`, prompt `s2-v1`. The frozen prompt text comes from the same functions that write `prompts-per-case.md`.
  - Cost is computed from the response's `usage` at the published per-token prices (text input USD 5, image input USD 8, output USD 30 per million tokens, checked 2026-10-03). Cached input and text output are charged at the higher rate, so the measured cost never underestimates. Before every call the runner refuses if spend so far plus a reserve (max of USD 0.50 and 1.5 × the most expensive call) would exceed USD 5.
  - A provider refusal is logged as a failed attempt and counts toward the three S2 attempts; it needs no screening.
  - The post-hoc comparison case c08b, whose corrected mask is not owner-reviewed, runs only with `--allow-unreviewed`, which writes the caveat into the attempt notes.
- **Alternatives:** `gpt-image-2.5-flare`; `moderation=low`; `high` quality; generations endpoint without a reference image for S2.
- **Reason:** Placement precision is what S2 is judged on; medium quality matches the runbook's cost basis; the reference photo is required for S2 to know where to draw.
- **Consequence:** Results describe this model variant and quality only. One benign case (c01, S2 attempt 1) was refused by moderation (`safety_violations=[abuse]`), so refusals on harmless art are a real provider risk to report.
- **Reconsider when:** Owner ratings show S2 failing on placement in ways a different variant or quality might fix, or refusals recur.

## D-047 — Rating round 2 skipped; round 1 is final

- **Date:** 2026-10-03
- **Supersedes:** The second blinded rating pass of Phase 0 Task 5 (seed 2, next day).
- **Selected:** The owner's round-1 ratings (`ratings-1.json`, rated on the phone through a private claude.ai page with the same blinded IDs) are final. `decide` runs without `--rereview`. It evaluates only the GO cases c01–c07 (`--cases`). Attempts after the first one the owner rated controlled are ignored, since D-035 stops there and they ran only because the orchestrator's screening was stricter (S2 c02, S2 c07). Measured cost from the log replaces the flat estimate; S3 uses an estimate of USD 0.02 per attempt.
- **Alternatives:** Rate pack 2 the next day as planned.
- **Reason:** Owner choice, to move on.
- **Consequence:** The "unnoticed changes" criterion is not measured (reported as 0 because there is no second pass, not because none exist), and rater consistency is unknown. The report must state both. With round 1 only: S3 6 of 7, S2 5 of 7, S1 0 of 7 cases controlled. `decide` returns PIVOT with S3 as the best strategy and one unmet criterion: no beginner study evidence.
- **Reconsider when:** A later re-rating disagrees with round 1.

## D-048 — Phase 0 outcome: PIVOT, S3 retained, beginner study moves to the Phase 3 exit gate

- **Date:** 2026-10-03
- **Selected:**
  - Phase 0 ends in PIVOT (spec §15.4): S3 met every technical GO criterion (6 of 7 cases, no contour destruction, 6 of 6 understandable, 32 s, about USD 0.02), but no beginner study was run.
  - S3 (structured strokes rendered locally) is the only preview strategy Phase 4 may retain. S2 is not retained. S1 stays experimental inspiration only.
  - The two beginner criteria (at least 70% of 5–8 participants understand the instruction, at least 60% do not worsen the work) become a hard Phase 3 exit gate, measured with the real coach on standardized starters. No Phase 4 preview work and no public test start before they pass.
  - Phase 1 may start. Report: `docs/research/phase-0-results.md`.
- **Alternatives:** Run the beginner study now and close Phase 0 as GO; retain S2 alongside S3.
- **Reason:** Owner choice, to move on without recruiting participants now. S2 has no margin (5 of 7), misplaces strokes and drew one refusal on harmless art.
- **Consequence:** The biggest open product risk, whether the coach actually helps a beginner draw, is untested until the end of Phase 3. Phases 1–3 must not assume it. Phase 4 still reconfirms S3 through the production API path on a fresh holdout of real, consented photos.
- **Reconsider when:** The Phase 3 beginner gate fails (then the owner selects a further pivot), or S3 fails the Phase 4 holdout.

## D-049 — Follow-up test: shading tasks and v2 prompts

- **Date:** 2026-10-03
- **Refines:** D-048. S2 is not retained for the simple additions Phase 0 tested; whether S3 or S2 wins on larger changes such as shading is open until this test reports.
- **Selected:**
  - A separate experiment root (`lab/private/x2/`, private) with 7 shading tasks on the GO images (c01h–c07h, Claude-drafted masks, not owner-reviewed) and the 7 original simple tasks.
  - Prompts `s1-v2` and `s2-v2` follow OpenAI's GPT Image 2.5 prompting guide (checked 2026-10-03): English, labeled sections, numbered image roles, "change only" plus an explicit preserve list, a transparent-output prompt that describes no background, and a second input image showing the allowed area outlined in magenta. Quality `high`, model unchanged (`gpt-image-2.5-sunburst`).
  - S3 gains hatch fills (stroke-plan schema version 2): a polygon plus angle, spacing, width and an optional cross pass, rendered deterministically.
  - One attempt per strategy and case: S1-v2, S2-v2 and S3-v2 on c01h–c07h, plus S2-v2 on the 7 simple tasks to measure the prompt effect against S2-v1. The owner rates all candidates in one blinded round. The USD 5 cap of D-045 still covers all OpenAI spend.
  - Pixel-identical regions come from local compositing, not from the prompt: the guide says to composite edits into the original when a region must stay pixel-identical, which the copyback and overlay compositing already do.
- **Alternatives:** Keep D-048 unchanged; retest only with v1 prompts.
- **Reason:** Owner's concern that Phase 0 tested only very simple additions, that shading will be harder for stroke plans, and that prompt quality matters.
- **Consequence:** One attempt per case measures first-attempt quality only. Masks are drafts; the owner sees them in the rating view. The result may change which strategy Phase 4 retains; Phase 1 does not depend on it.
- **Reconsider when:** The results are in.

## D-050 — Hybrid test: S1 image as template, S3 stroke plan as controlled layer

- **Date:** 2026-10-03
- **Selected:** For the seven shading cases, a contextless Claude subagent transfers the new strokes of the S1-v2 composite (the template) into an S3 stroke plan (prompt `s3-from-s1-v1`, experiment root `lab/private/x3/`). Inputs: the photo, the photo with the allowed area outlined, the S1 template, and a zoomed crop of the template with a coordinate grid. One attempt per case, owner-rated. The S1 image stays experimental inspiration; only the rendered stroke plan can be controlled. No new OpenAI calls.
- **Alternatives:** Allow S1 as a controlled route (changes product rule 3); keep S3 alone.
- **Reason:** Owner choice after D-049: S1 looked most natural, S3 was safest but mechanical.
- **Consequence:** If the hybrid is controlled and looks natural, the preview route becomes S1 (inspiration) + S3 transfer (controlled), at about USD 0.07 per image call plus the stroke-plan call. The S1 template depends on OpenAI and inherits its refusal and server-error risk.
- **Reconsider when:** The results are in.

## D-051 — Phase 4 preview route: hybrid S1 template → S3 stroke plan

- **Date:** 2026-10-03
- **Refines:** D-048 (S3 retained). The retained controlled route is S3 stroke plans, now preferably transferred from an S1 template.
- **Selected:**
  - Phase 4 builds the hybrid preview route: a masked OpenAI edit (S1) produces a template image; a stroke-plan model transfers the template's new strokes into an S3 plan (strokes and hatch fills); the browser renders that plan and composites it locally. Only the rendered plan can be controlled.
  - The S1 template may be shown only as labeled experimental inspiration (D-033), never as the controlled result.
  - If the template call is refused or fails, the route falls back to plain S3 (stroke plan from the photo alone); if that fails too, "no controlled preview available" is a complete outcome.
  - S2 (direct transparent layer) is not built.
  - New Phase 4 gates: median latency per controlled preview under 60 s on the production path (the lab measured 70 s; candidates are a faster image model or quality, a faster transfer model, and showing the inspiration while the plan is computed) and reconfirmation of the hybrid on a fresh holdout of real, consented photos with owner-reviewed masks.
- **Alternatives:** Plain S3 only (D-048); allowing S1 as controlled (would change product rule 3).
- **Reason:** Owner choice after D-049/D-050: the hybrid was controlled most often on shading (5 of 7) and fit the drawing's style in 6 of 7 cases, while plain S3 looked mechanical and S2 misplaced strokes.
- **Consequence:** Phase 4 needs a server-side secret for OpenAI plus a stroke-plan model, so the minimal API of Phase 4 Task 4 is required. Two provider calls per preview raise cost (about USD 0.07 plus the plan call) and latency. Phases 1–3 are unchanged, except that contracts must represent an S1 template as an untrusted, experimental asset linked to the controlled stroke plan derived from it.
- **Reconsider when:** The latency gate or the holdout reconfirmation fails.

## D-052 — Phase 1 toolchain versions

- **Date:** 2026-10-03
- **Selected:** Node 24 LTS in CI, Node 22.12 or newer supported locally (`engines`); pnpm 12.8.1 via `packageManager`; TypeScript 6.0.3; Vite 8.3, React 19.3, Vitest 5.0 with V8 coverage at 90%, Biome 2.5, dependency-cruiser 18.5, zod 4.6 for runtime contracts. All checked against the npm registry and nodejs.org on 2026-10-03.
- **Alternatives:** TypeScript 7.0.2 (the native compiler). It type-checks the workspace, but dependency-cruiser cannot use its API yet and would miss type-only imports in boundary checks.
- **Reason:** Current stable releases (D-037, D-039) with every quality gate fully working.
- **Consequence:** Upgrade to TypeScript 7 once dependency-cruiser supports it. zod is a general runtime dependency, not one of the spec §13.2 reused libraries; the license check covers it like the rest.
- **Reconsider when:** dependency-cruiser supports TypeScript 7, or Node 26 becomes LTS.

## D-053 — Quick Compare draws split, gestures and manual warp itself

- **Date:** 2026-10-03
- **Refines:** D-036 for three Phase 2 parts: split view, pinch and pan, and the manual four-point warp.
- **Selected:** One canvas renderer draws everything. The split view clips the reference to the right of a divider stored as a fraction of the original's width, so it follows pan and zoom and appears in exports. Pinch, pan, tap and hold come from the pure state machine in `packages/compare/src/gestures.ts`. The manual four-point warp uses an own homography from four points and a bilinear inverse-mapping warp (`packages/imaging/src/warp.ts`).
- **Alternatives:** img-comparison-slider (a web component that compares two DOM images), `@use-gesture` or `@panzoom/panzoom`, opencv.js `warpPerspective` for the manual warp.
- **Reason:** The comparison is one canvas with an aligned, possibly warped reference layer. A DOM slider over two images cannot show that layer without a second render path. The gesture libraries move DOM elements, while the canvas needs pointer events turned into view and layer changes; that state machine is small and tested without a browser. A four-point homography plus bilinear sampling is about 100 lines with tests and avoids loading opencv.js (about 10 MB) before it is needed.
- **Consequence:** No new dependency. opencv.js stays planned for automatic homography (AKAZE/ORB + RANSAC, ECC) once fixtures exist, and can take over the warp in a worker if the iPhone shows the main-thread warp stalling. Spec §13.2 lists the own implementations for these rows.
- **Reconsider when:** The split view needs a DOM element (for example, comparing two plain images without a layer), or gesture edge cases on the iPhone exceed the state machine.

## D-054 — Quick Compare as a full-screen editor with paper corners on both images

- **Date:** 2026-10-03
- **Refines:** D-053 and spec §6.1 after the owner's first real-iPhone test on ChatGPT Sites.
- **Selected:** Quick Compare has two screens. The import screen shows one card per image with a styled picker (no native "Choose File" text). Once both images are loaded, a full-screen editor opens: a small top bar (back to images, save), the image filling the space, and one bottom panel that switches between viewing (overlay or split with one slider, hold original, 50 %, reference), alignment, and paper corners. The editor itself is the CSS immersive mode (spec §12), so the separate "Vollbild" mode is removed. Perspective alignment places four paper corners on the reference first, then the same four corners on the original; the homography maps the one quad onto the other. Corner steps show one image at a time, zoomed out slightly so every ring is reachable, with ring handles, the quad outline, a grab offset, and a 3× magnifier above the finger while dragging.
- **Alternatives:** The previous single scrolling page with every control (the owner rated it unusable); corners only on the original that map the reference's image edges (fails when the reference has a margin or the drawing does not fill the photo); automatic paper detection first (needs fixtures and opencv.js, still planned as a suggestion).
- **Reason:** On the iPhone the image sat below the fold with controls far away from it, and the photo's paper edge rarely matches the image edge. Matching the paper on both images is what makes a hand-held photo line up.
- **Consequence:** Legacy buttons for zoom in/out and the standalone "Original" button are gone; pinch, wheel and keys zoom, a fit button appears when zoomed, and tap or hold on the image reveals the original. Settings survive closing and reopening the editor because both screens share one state. Automatic paper-corner detection becomes a suggestion for the same two steps once fixtures exist.
- **Reconsider when:** The real-iPhone review shows the two-step corner flow is too slow for beginners, or automatic detection is reliable enough to make the manual steps a correction only.

## D-055 — opencv.js in a worker for paper detection and feature alignment

- **Date:** 2026-10-03
- **Refines:** D-036, D-053 and D-054. The owner approved using opencv.js now instead of waiting for real fixtures; synthetic fixtures stand in until real photos are reviewed.
- **Selected:** `@techstark/opencv-js` 5.0.0-release.1 (Apache-2.0, published 2026-06-24, so within pnpm's default `minimumReleaseAge`; the same 5.0 line the iPhone probe loaded), emitted unchanged as a hashed build asset and loaded with `importScripts` in a classic Web Worker (`apps/web/src/compare/vision.worker.ts`) when the editor opens, never before. The service worker precaches it like every build file, so it works offline. Every accept or reject decision is pure code in `packages/compare/src/vision.ts`; the worker only calls opencv.js.
  - **Paper detection** (jscanify approach, own code): grayscale copy with the longer edge at most 1024 px, 5 × 5 Gaussian blur, Canny 50/150, 3 × 3 dilation, all contours, `approxPolyDP` at 2 % of the perimeter. A sheet is a convex 4-gon covering at least 20 % of the image whose area explains at least 90 % of its contour (the confidence) and that is at least 24 gray levels brighter just inside its edges than just outside (samples 1.5 % of the shorter side away; at least half of them inside the image). The largest such quad wins; corners are ordered top-left, top-right, bottom-right, bottom-left. The brightness check rejects the outline of a dense drawing on a flat scan, which the first fixture run detected as a sheet.
  - **Corner steps:** detected corners pre-place the rings of a step only while that step is untouched and had no earlier corners (`corners-suggest`); a failed detection keeps the image-corner rings and says "Blatt nicht erkannt. Bitte die Ecken selbst setzen."
  - **Feature alignment:** ORB with 2000 features (AKAZE is not in the prebuilt build), brute-force Hamming kNN with Lowe ratio 0.75, `findHomography` with RANSAC at 3 px. Accepted only with at least 25 inliers and an inlier share of at least 0.3, all reference corners in front of the camera, a convex mapped quad with unchanged winding, an area between 5 % and 400 % of the original, and corners within one image size around it. The result is stored as `corners` for the whole reference (`corners-set`), so the existing own warp (D-053) renders and exports it.
  - **Fallbacks:** feature homography, then the legacy correlation search, then "Kein sicherer Abgleich. Bitte manuell ausrichten." If opencv.js cannot load or the worker fails, vision is unavailable for the session and Quick Compare behaves as before (product rule 1). "Bilderkennung wird geladen …" shows while the user waits for it.
- **Measured (headless Chromium, synthetic fixtures in `apps/web/e2e/fixtures.ts`: a drawn sheet photographed at a known perspective on a dark textured table, plus the flat sheet):** detected paper corners within 0.1 % of the image size of the truth, homography corners within 0.25 %; no false sheet on the flat reference. opencv.js loads in 390–640 ms in the worker; paper detection takes about 70 ms and feature alignment about 300–340 ms at 1024 px.
- **Size:** the build and the precache grow by 13,307,098 bytes (opencv.js 13,298,869 bytes, 3.75 MB gzipped; the worker 5.7 kB; the main bundle 2.5 kB), from 2.08 MB to 15.38 MB. The first visit downloads it during service-worker install.
- **Alternatives:** wait for real fixtures (owner chose not to); jscanify as a dependency (it wraps opencv.js anyway and would hide the decisions from tests); AKAZE (needs a custom opencv.js build); loading opencv.js from the network on demand without precaching (breaks offline use); main-thread opencv.js (blocks the UI).
- **Reason:** The legacy correlation search cannot express perspective, and placing eight rings by hand is slow on a phone. ORB + RANSAC and contour detection are the standard tools and need no custom math; a worker keeps the 13 MB runtime and its work off the main thread.
- **Consequence:** ECC refinement is not built yet. Each deployment that changes any file re-runs the service worker's `addAll`; with `must-revalidate` the unchanged opencv.js should revalidate rather than download again, which needs confirming on ChatGPT Sites. Vision runs only in the built app (classic worker with `importScripts`); in `vite dev` it may be unavailable, which the fallbacks cover. Memory and time on the iPhone, and detection on real photos, are part of the Phase 2 exit gate. A trimmed opencv.js build stays planned (D-036) if the size or memory hurts.
- **Reconsider when:** real iPhone photos show false sheets or rejected good matches, the iPhone shows memory pressure or slow loads, or a trimmed build with AKAZE and ECC is worth maintaining.

## D-056 — Quick Compare UI from the researched brief and the approved prototype

- **Date:** 2026-10-04
- **Refines:** D-054 (editor layout), D-036 and spec §13.2 (icons and UI primitives), legacy rows C1–C3, C6, V2–V4 (`docs/research/legacy-behavior.md`).
- **Selected:** The design brief in `docs/research/2026-10-04-ui-ux-brief.md`, as the owner approved it in the clickable prototype on 2026-10-04 ("Prototyp design is fine we take it").
  - **No global navigation in v0.1.** The app opens on the start screen: two cards, "Vorlage" (reference) first, then "Deine Zeichnung" (the photo, the spec's "original"), and one prominent "Vergleichen". Projects and guided coaching keep their routes but are not linked until they exist.
  - **Full-screen editor:** a top bar with icon-only back, undo, redo, export and "Mehr"; the image; one bottom panel with three modes at the bottom edge (Vergleich, Ausrichten, Ecken; icon plus word), each with one primary control. Vergleich: "Überlagern | Teilen", a "Zeichnung" eye toggle, and one slider (Vorlage opacity, or the split position) with thumbnails of both images at its ends. Ausrichten: arrow pad, size and rotation steppers, "Fein | Grob", "Automatisch", "Zurücksetzen", Abbrechen/Fertig. Ecken: two steps (Vorlage, then Zeichnung), numbered rings 1–4, a corner selector, arrow pad with a 1 px/10 px step button, "Automatisch", "Ganzes Bild", "Zurücksetzen".
  - **Visible twins for every gesture** (WCAG 2.5.1, 2.5.7): a floating zoom capsule (−, percentage to fit, +), the eye toggle, steppers and arrow pads; tap and hold on the image still show only the drawing.
  - **Monochrome, dark UI**, one accent (#8fb0ff) for the selected state and the one prominent action per view; no badge text over the image, only a "Nur Zeichnung" pill while revealed and short toasts.
  - **Undo/redo** of what the user adjusted (opacity, split, layer, corners) instead of confirmations; "Alles zurücksetzen" in "Mehr". Opening Ausrichten keeps the current opacity unless the Vorlage would be invisible; "Abbrechen" restores the layer.
  - **Automatic alignment on opening a new pair:** paper corners on the drawing (and on the Vorlage, else its image corners), else the feature homography, else a hint to use "Ecken". It stops as soon as the user aligns or places corners. The Vorlage's paper is clipped to its corners, and the fine adjustment applies on top of the perspective.
  - **One hint strip per mode**, shown until closed (localStorage, tolerant of blocked storage); no tutorial.
  - **Icons:** `lucide-react` 1.49.0 (ISC), pinned below the newest release because of pnpm's `minimumReleaseAge`. **No UI primitive library yet:** native buttons, `aria-pressed` toggle groups in `fieldset`s, native range inputs and radio buttons cover every control; Base UI (named by the brief) or Radix (D-036) only when a control needs it.
  - Default opacity 50 % instead of the legacy 65 %; the legacy "Original", "50 %", "Referenz" buttons, the badge, the parameter tabs and the "gestures move the reference" checkbox are gone.
- **Alternatives:** The D-054 editor (labelled buttons everywhere; the owner rated it poor), Base UI or Radix from the start, an all-light theme, a three-tab bar now.
- **Reason:** The owner rejected the previous UI. Five research strands (photo editors, scanners, art-helper apps, UX evidence, iOS PWA constraints) converged on the photo-editor layout, scanner-style corner editing and visible alternatives for gestures; the owner approved the prototype built from them.
- **Consequence:** UI copy uses "Vorlage" and "Zeichnung"; internal names stay `reference` and `original`. The usability test plan in the brief (three rounds of five beginners on a real iPhone) becomes part of the Phase 2 exit review. Open: a bundled demo pair ("Beispiel ansehen"), the Wake Lock and Dynamic Type checks on the iPhone, the light theme.
- **Reconsider when:** The beginner test shows a task failing for two of five participants, or Projects and Coach ship and need a tab bar.

## D-057 — Content alignment before paper corners; straight-line fallback for gappy outlines

- **Date:** 2026-10-04
- **Refines:** D-055 (paper detection), D-056 (automatic alignment on opening).
- **Trigger:** The owner's first real pair (a painted canvas board photographed on a white table, and a photo of a finished version of the same motif) found no paper corners. Debugging on those photos (kept local, not committed): the board edges are white on white, so Canny at 50/150 left gaps and no closed contour reached 15 % of the image; the board in the Vorlage photo also runs off the image edge. The ORB feature homography, however, aligned the two drawings correctly.
- **Selected:**
  - **Order on opening:** feature (content) alignment first; paper corners only if that fails, and only when the closed-outline detector is sure (confidence ≥ 0.95); otherwise the hint to use "Ecken". A guess is never applied without the user seeing it.
  - **Corner step 2 ("Automatisch" and the first visit):** the content alignment carries the Vorlage's rings into the drawing (`quadThroughCorners`), so both quads correspond; the paper outline is the fallback.
  - **Second paper detector** (`chooseLineQuad`, pure, unit-tested): at 512 px with a 7 × 7 blur and Canny 15/45, OpenCV's standard Hough lines (threshold 0.2 × the shorter side) give near-horizontal and near-vertical candidates (≤ 35° tilt, 8 per direction); the image border may stand in for one side. Each side's cover is sampled against the 5 × 5-dilated edges (each measured side ≥ 0.6, mean ≥ 0.7); the quad with the highest mean² · √area wins. Its confidence is capped at 0.9, so the corner step always says "Ecken prüfen". It runs only when the closed-outline detector finds nothing.
  - The hold timer fires 20 ms after the 280 ms hold threshold, because a timer can fire a fraction early by the gesture clock and the hold then never started (found by a timing-dependent test).
- **Alternatives:** Lowering the contour detector's thresholds alone (still needs a closed outline), `HoughLinesP` (returned a single segment per photo in opencv.js 5.0), applying line guesses automatically.
- **Reason:** Comparing drawings needs the drawings aligned; the paper outline is a proxy that fails on white-on-white setups. Content alignment worked on the owner's pair; the line detector found the Vorlage's board, and its known failure (a white table taken for the board) is flagged for checking instead of applied.
- **Consequence:** On the owner's pair, step 2's carried corners sit a few percent off the board corners because the two drawings differ; that is the best fit for the drawings and the rings stay draggable. Real-photo fixtures with known corners are still needed to tune the thresholds.
- **Reconsider when:** Real fixtures show the content alignment misleading on early, sparse drawings, or the line detector picking tables often.

## D-058 — One "Ausrichten" mode with one automatic button

- **Date:** 2026-10-04
- **Refines:** D-056 (three editor modes), D-057 (order of automatic alignment).
- **Trigger:** Owner feedback: automatic alignment was only reachable inside the corner flow; asked for one overall automatic button, then position, size, rotation and the manual corners, simpler but with every function kept.
- **Selected:** The editor has two modes, "Vergleich" and "Ausrichten". Ausrichten shows, top to bottom: "Automatisch" (accessible name "Automatisch ausrichten") next to "Ecken setzen"/"Ecken ändern"; the arrow pad, whose centre toggles the step (1 px/10 px, also for size 0.2 %/2 % and rotation 0.1°/1°); size and rotation steppers; "Zurücksetzen"; the opacity slider. The automatic button runs one pipeline: content alignment, else sure paper corners, else the correlation search (which clears corners, as it is affine), else an unsure paper guess flagged "An vermuteten Blattecken ausgerichtet – bitte unter „Ecken ändern“ prüfen", else "Keine sichere Ausrichtung". Opening a pair runs the first two steps only. The corner flow opens from Ausrichten and returns there; "Abbrechen" in Ausrichten restores the layer and the corners from before. The corner steps keep their own "Automatisch" for re-detecting the rings of one image.
- **Alternatives:** Keeping a separate "Ecken" mode (automatic alignment hidden there), a single list of all controls.
- **Reason:** One place for alignment, automatic first and manual refinement below it, matches how the owner works and the brief's "one mode, one primary control".
- **Consequence:** The "Fein | Grob" segmented control is gone; the pad centre is the step toggle in both Ausrichten and the corner steps.

## D-059 — Calm Ausrichten: modal top bar, two-finger view, AAA text

- **Date:** 2026-10-04
- **Refines:** D-056 (editor layout, contrast), D-058 (Ausrichten layout).
- **Trigger:** Owner feedback on the iPhone: the Ausrichten panel felt cramped (a header row inside the panel, an "Ansicht" toggle floating on the image next to the zoom capsule), not professional, and asked whether the UI meets WCAG AAA.
- **Selected:** Ausrichten and the corner steps are modal edits. Their top bar replaces the editor bar: "Abbrechen" (or "Zurück" in step 2) leading, undo/redo centred, the prominent "Fertig"/"Weiter" trailing, as in Apple Photos' edit mode. The panel has no header row; it shows "Automatisch" and "Ecken setzen", then a "Feinjustieren" section (a divider, a small caption, "Zurücksetzen" on its trailing edge) with the arrow pad and the size and rotation steppers (label above the value), then the opacity slider. Spacing is on an 8-pt grid (16 px between groups); every button target is at least 44 × 44 px (WCAG 2.5.5 AAA). The "Ansicht" toggle is gone: while aligning, one finger moves the Vorlage and two fingers zoom and pan the view; a pure two-finger view change records no undo step. Text tokens meet AAA (≥ 7:1): `--muted` changed from #98a1ab (5.7–6.6:1) to #aab3bd (≥ 7.08:1 on bg, surface, surface-2); the accent (#8fb0ff, ≥ 7.03:1) and the accent ink on the accent (8.34:1) already did. Disabled icons use #6b727b (exempt from contrast, still visible).
- **Alternatives:** Keeping the toggle (a mode switch the user has to remember); two-finger scale and rotation of the Vorlage (collides with zooming the view, and the steppers are more precise).
- **Reason:** One way to move the Vorlage, one way to move the view, no hidden mode; the edit's commit and cancel sit where iOS users look for them, and the panel is left with only alignment controls.
- **Consequence:** Scaling and rotating the Vorlage is by stepper only (or "Automatisch"/corners). The corner steps show their title ("Vorlage"/"Zeichnung", "Ecken n/2") as the first line of the panel.

## D-060 — Placed corners stay; content corrects the rest

- **Date:** 2026-10-04
- **Refines:** D-055 (vision), D-058 (Ausrichten pipeline).
- **Trigger:** Owner feedback on the iPhone: "Automatisch" overlaid the lighthouse pair very well although the drawing's rings looked wrong, while corners placed by hand almost perfectly still left the overlay slightly off. The owner wants to place corners by hand where detection fails and let the rest be automatic, keeping the corners.
- **Findings:** (1) A bug: after a content alignment on opening (`corners` = where the Vorlage's image corners land), corner step 1 replaced the Vorlage quad with its paper corners but step 2 kept the old drawing quad, so the pair no longer matched and the Vorlage was stretched. (2) Paper corners align the sheet, not the drawing on it: placement on the sheet, a slight bend and lens distortion leave a residual that four corners cannot remove. (3) On this pair (watercolour Vorlage, coloured fineliner drawing) ORB features are scarce; after the corner pre-warp the global match fell below the inlier floor, and a local feature search gave inliers but a wrong homography.
- **Selected:** Step 2 carries the drawing's corners along whenever step 1 changed the Vorlage's corners (`pairedRef`, `carryQuad`). "Fertig" in corner step 2, and "Automatisch" whenever corners exist, run a refinement: the Vorlage is warped by the corners into the drawing's grid (512 px), cut into an 8 × 10 grid of blocks, and only blocks wholly on the paper and not blank are searched within 8 % around their own place by normalized cross-correlation (score ≥ 0.5). A robust similarity (every pair proposes, most blocks within 3 px win, least-squares refit; at least 8 blocks and half of the found ones) gives the correction: corners already removed the perspective, and a column of matches along a tower cannot pin a full homography. The correction is applied to the drawing's corners only when every image corner moves by at most 6 %; the Vorlage's corners stay, the fine layer resets, and one undo step returns to the placed corners. Otherwise the corners stay untouched and the status says so. On the owner's pair with deliberately misplaced rings, the doubled lantern and windows became single.
- **Status texts:** "Am Bildinhalt ausgerichtet …" (content alignment), "Am Bildinhalt nachjustiert – deine Ecken bleiben die Grundlage", "Ecken übernommen – kein sicherer Feinabgleich am Bildinhalt", "Ecken aus dem Bildinhalt übernommen" (step 2 rings carried by content).
- **Alternatives:** Full homography from block shifts or local ORB matches (unstable on this pair, measured); ECC on intensities (photometric differences between Vorlage and drawing); replacing corners by a fresh content alignment (discards the user's work).
- **Consequence:** "Automatisch" with corners present never discards them; to start over, "Ecken ändern" → "Zurücksetzen" or "Alles zurücksetzen". Snapping single rings and the per-corner check followed in D-061.

## D-061 — Rings snap onto paper corners; a guess is checked corner by corner

- **Date:** 2026-10-04
- **Refines:** D-054 (corner steps), D-057 (paper guesses), D-060.
- **Trigger:** Owner feedback: even when automatic detection is unsure about one corner, it should still place the others correctly, and a ring placed by hand should find the exact corner.
- **Selected:** One local corner finder (`cornerNear`) serves two uses. (1) When a dragged ring is released, the paper corner within 5 % of the longer image side replaces the drop point ("An der Blattecke eingerastet", its own undo step); nudges with the arrow pad never snap. (2) An unsure paper guess (confidence below 0.95) is checked ring by ring: a ring with a clear corner nearby moves onto it, the others stay and are flagged: amber, dashed rings and "Ecke 3 prüfen" / "Ecken 1 und 3 prüfen" / "Ecken prüfen". Touching a flagged ring clears its flag. The finder takes the edge directions from the two neighbouring rings, tries lines at ± 4° in 1° steps at every offset across each edge, and scores a line by the mean brightness step across it over 1.5 search radii; the best line must reach twice the median step of its search, nearer lines are preferred (a sheet on a board has nested edges), and the two edges' crossing gives the corner with sub-pixel offset.
- **Alternatives:** Canny + Hough lines in a window around the ring (implemented and measured first): on the owner's drawing (canvas on a white board) the top edge produced no line at any Canny threshold, and histogram equalisation turned canvas texture into dozens of 45° lines. Harris corners (texture and drawing strokes give many).
- **Evidence:** Owner's lighthouse pair, iPhone-size browser: a ring dropped about 10 px off the drawing's faint canvas corner and off the Vorlage's corner snapped onto them; the Vorlage's guess went from "Ecke 4 prüfen" to all four confirmed. Synthetic photo in the e2e worker test: four rings 2 % off snap within 0.6 %.
- **Consequence:** A user who wants a ring exactly where no corner is can still place it with the arrow pad, or undo the snap. Ring positions of a sure detection are unchanged.

## D-062 — Full content alignment behind the small correction; corrected snaps stay corrected

- **Date:** 2026-10-05
- **Refines:** D-060, D-061.
- **Trigger:** Owner's first iPhone test of D-060/D-061 with the lighthouse pair: (1) after placing both quads on the sheets, "Fertig" reported "kein sicherer Feinabgleich", although the content alignment on opening had overlaid the pair well; (2) a ring that snapped to a wrong spot snapped back there every time the owner dragged it away, which makes correcting it frustrating.
- **Selected:** (1) The small correction stays first. When it finds none, the full content alignment (as on opening) carries the Vorlage's corners into the drawing, the small correction polishes that, and the status says "Am Bildinhalt ausgerichtet – die Ecken der Vorlage bleiben". A hand drawing sits on its sheet differently from the Vorlage's motif on its own; that offset exceeds the 6 % cap of the small correction but not the content alignment. Only when both find nothing do the placed corners stay unchanged. (2) Every snap is remembered per ring for the current corner flow; a corner the ring already snapped to, and which the user then dragged away from, is never offered again. Starting a new corner flow forgets them.
- **Consequence:** With a reliable content match, the drawing's rings follow the content, not the drawing's sheet; the Vorlage's rings stay as placed. One undo step returns to the placed corners.

