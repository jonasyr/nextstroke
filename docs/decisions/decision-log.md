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
- **Consequence:** A failed candidate may appear with prominent warning and physical guidance. It is not called safe or exact, and default export includes its warning or excludes it as a clean instruction layer.

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
