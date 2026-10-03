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
