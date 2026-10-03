# NextStroke Phase 0 Proof-of-Feasibility Plan

> **For agentic workers:** This is a timeboxed experiment. Code is disposable unless a later approved plan explicitly retains it. Do not generalize architecture during the experiment.

**Status:** Revised 2026-10-03 after documentation readiness review; awaiting owner approval.

**Goal:** Determine within a 10-working-day execution timebox whether NextStroke can produce understandable, physically executable fineliner guidance and a bounded visual preview on normal iPhone photos without unacceptable contour, device, latency, or cost failures.

**Architecture:** A local evaluation corpus, manual model runs in the owner's existing subscriptions, three independent preview strategies, a deterministic local compositor and boundary audit, a throwaway iPhone test page, and append-only result records. No production database, auth, sync, monorepo abstraction, paid API, deployed server, or polished navigation.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md` §15

**Decisions:** D-024, D-030 through D-035

## Global constraints

- Owner approval of this plan is required before any model run or participant session.
- No paid API calls and no additional spend (D-031). Models are used manually through the owner's ChatGPT Plus/Pro and Claude Pro/Max subscriptions. Do not automate, script, or scrape consumer apps.
- Before uploading any image to a consumer app, disable every setting that allows conversations to be used for model training, and record the setting state and date in the run log.
- Participant artwork is uploaded only with signed consent that names the services used (D-031, D-034).
- Do not commit personal artwork, participant data, provider outputs containing artwork, or credentials. The private experiment store lives outside git.
- Record every attempt and every rejection. Selecting results without reporting all attempts is cherry-picking and invalidates the run.
- Only fineliner. The corpus is 30 fineliner photographs (D-030).
- All provider output is untrusted. Only the local compositor can produce a `controlled` classification.
- Record service, app/model label shown in the UI, date, prompt-template revision, input and output dimensions, wall-clock latency, and attempt number for every call.

## Prerequisites (outside the timebox, all required before day 1)

- [ ] Owner approves this plan.
- [ ] Prompt templates for ideas, strategy S1, S2, and S3 are written, versioned, and frozen.
- [ ] Consent template covers: purpose, the named services (OpenAI ChatGPT, Anthropic Claude), that those services may retain uploads under their consumer terms, local storage location, deletion date (no later than 90 days after the Phase 0 decision), and withdrawal.
- [ ] Corpus sources confirmed: owner-made works and consenting volunteers only; no web-sourced artwork.
- [ ] 5–8 beginner participants scheduled for days 8–9.
- [ ] Two to three standardized starter drawings exist on real drawing paper, made by the owner and licensed for the study.
- [ ] Rating rubric and the thresholds in §15 of the spec are committed to the repository before any output is generated (pre-registration).
- [ ] Training-use settings in both subscriptions are disabled.
- [ ] Lab tooling is built and tested before day 1 (D-035): S3 stroke renderer, compositor with boundary audit, rating page with randomized IDs, and attempt-log form. It reuses existing open-source libraries where their licenses are AGPL-compatible.
- [ ] A Claude Project holds the frozen ideas + S3 instructions, so each case needs one chat.

## Fixed parameters (pre-registered)

| Parameter | Value |
| --- | --- |
| Corpus | 30 fineliner photos; at least 10 with an annotated critical contour inside or touching the editable region; at most 10 may be printed licensed line drawings (D-035) |
| Strategies | S1 masked full-composite edit, S2 direct transparent overlay, S3 structured strokes/SVG rendered locally |
| Attempts | S2 and S3: up to 3 per case, stopping at the first `controlled` screening result; S1: 1 attempt on 10 pre-selected cases. All attempts recorded |
| Futility stop | A strategy stops once it has 10 failed cases, because it can no longer reach 21 of 30 |
| Services | S1/S2: ChatGPT image editing/generation. Ideas and S3: Claude |
| Working image | Longest edge 2048 px, sRGB, orientation applied; every canvas ≤ 4096 × 4096 |
| Masks | `editableRegion`, `protectedGeometry`, `featherBand` (inside editable only), in source-normalized coordinates |
| Device | Owner's current iPhone on the current iOS major; iPhone 11-class remains an open risk (see Task 4) |
| Cost basis | API-equivalent estimate from the provider's published price on the run date, marked as estimate |
| Timebox | 10 working days from day 1 |

## Task 1 (day 1): Freeze corpus and annotations

- [ ] Capture or collect 30 ordinary handheld iPhone photographs of started fineliner works with varied light, shadow, perspective, paper tone, and line density.
- [ ] Up to 10 cases may be CC0 or CC BY line drawings (for example ArtPack or OpenSketch) printed on drawing paper and photographed the same way. Record source URL and license, mark these cases `printed` in the manifest, and choose the S1 subset before generation, covering both kinds.
- [ ] For each case record: anonymous ID, lighting, paper visibility, perspective, device, desired small change, editable region, protected geometry, critical contours.
- [ ] Store originals in the private experiment store; commit only the anonymized manifest without images.

## Task 2 (days 1–2): Ideas and instructions

- [ ] For each case, open one chat in the Claude Project and ask with the frozen template for exactly three bounded fineliner ideas, each with ordered physical instructions, using only the facts in the Phase 0 material sheet (Task 2a). Request the S3 strokes for the pre-registered change in the same chat (Task 3).
- [ ] Record the unedited output. The owner may veto an unsafe instruction but must log the veto and reason. Edited instructions are not used for the study.
- [ ] Rate each idea set: count of physically infeasible ideas (for example white highlights, washes, erasing ink), and count of material claims not present in the sheet.

### Task 2a: Phase 0 material sheet

- [ ] Write a short sheet for the pens used in the corpus and study, plus the generic profile, with each claim's source, evidence level, and retrieval date per `docs/product/material-knowledge-base.md`.
- [ ] This sheet is throwaway evidence, not the shipped dataset.

## Task 3 (days 2–4): Run three preview strategies

The change requested for every strategy is the case's pre-registered desired change from Task 1, so strategies are compared on identical tasks.

- [ ] Order of attempts: after each S2/S3 attempt, the owner screens it immediately against spec §15.3. If it screens `controlled`, no further attempts run for that case and strategy. The next-day re-review in Task 5 can still downgrade it, and no attempts are added afterwards.
- [ ] Apply the futility stop from the fixed parameters and record the case at which it triggered.
- [ ] **S1 masked full composite:** ChatGPT image edit with the area selection matching the editable region, one attempt on each of the 10 pre-selected cases. This is the comparative baseline. Its outputs can be classified only `experimental` or `rejected`, never `controlled` (spec §7).
- [ ] **S2 direct transparent overlay:** ask for a transparent PNG containing only the new marks, with the original supplied as visual reference.
- [ ] **S3 structured strokes:** ask Claude for polylines in normalized coordinates with width, darkness, and order, in a fixed JSON schema; render locally and deterministically.
- [ ] Save every raw output and failure in the private store with the metadata listed above.
- [ ] Render every candidate over transparent, white, checkerboard, and original backgrounds.
- [ ] Never call an RGB-difference extraction a true alpha or change layer; it is a `DerivedDifferenceOverlay`, diagnostic only.

## Task 4 (days 4–5): Deterministic compositor and boundary audit

- [ ] Normalize working color, size, and orientation and record transforms.
- [ ] For S2/S3, set overlay alpha to zero outside `editableRegion` and inside `protectedGeometry`. For S1, register the output to the working image and copy original pixels outside `editableRegion` and inside `protectedGeometry`. If S1 output cannot be registered (dimensions or crop changed beyond the registration tolerance), classify it `rejected`.
- [ ] Automated boundary audit: pixels outside `editableRegion` and inside `protectedGeometry` in the composite are bit-identical to the working image. A failure is a compositor bug and blocks every `controlled` label until fixed.
- [ ] Measure geometry, photometry, contour similarity, and feather-band change separately as diagnostics. None of them is a safety certificate.
- [ ] Line-survival check: on at least 5 cases with 0.05–0.1 mm lines, confirm that the 2048 px working image keeps every line a rater considers relevant. If not, record the failing size and raise the budget only within the canvas limit.

## Task 5 (days 5–7): Rating and classification

- [ ] Ratings are pass/fail per criterion with a written reason. Candidate files carry randomized IDs and no strategy label. Blinding is partial because strategies look different, so record this limitation.
- [ ] The owner rates every candidate. If a second rater is available, they independently rate at least one third of the candidates; the stricter rating wins and agreement is reported.
- [ ] Apply the definitions and classification rules in spec §15.2 and §15.3.
- [ ] One day later, the owner re-reviews every `controlled` candidate against the annotations. Defects found only now count as "unnoticed" for the PIVOT trigger.

## Task 6 (days 6–7): iPhone pipeline

- [ ] Serve a throwaway static page over HTTPS on the local network or from free static hosting approved by the owner. It uses pre-generated candidates and makes no model calls.
- [ ] On the owner's current iPhone, complete ten import → normalize → composite → compare → export cycles with corpus images at full camera resolution.
- [ ] Background and resume the page during decode, compositing, and local persistence; repeat once as a Home Screen web app.
- [ ] Record reloads, crashes, decode failures, canvas failures, export failures, and main-thread blocks longer than 100 ms.
- [ ] Test HEIC import through `<img>` and `createImageBitmap` and record the result.
- [ ] The iPhone 11-class test is not available in Phase 0. Record it as an open risk; it must pass before the Phase 2 exit gate.

## Task 7 (days 8–9): Beginner comprehension and execution

- [ ] 5–8 beginners using black fineliners, without developer explanation.
- [ ] Every participant works on a standardized starter first, with previews generated in advance. Afterwards, a participant may optionally use their own started work if they consent to upload; previews for own work are generated manually during or after the session, and the waiting time is recorded.
- [ ] Show three ideas, the preview state (controlled, experimental, or no preview), material-sheet context, and execution steps.
- [ ] "Understands" means the participant correctly states location, tool, and the first two steps without prompting.
- [ ] Photograph before and after. The owner and, if available, a second rater judge "worse/same/better" using the rubric; any "worse" counts as worse.
- [ ] Record chosen idea, time, completion, regret, perceived authorship, and whether they would use it.

## Task 8 (day 10): Decide without extending the timebox

Apply spec §15.4 exactly. Criteria that have no evidence when the timebox ends count as unmet. There is no STOP outcome (D-032): any unmet GO criterion leads to PIVOT, and the owner selects and records the pivot before Phase 1.

## Required report

Create `docs/research/phase-0-results.md` containing methods, deviations, corpus summary without images, all aggregate outcomes per strategy split by hand-drawn and printed cases, the attempt at which each case succeeded, any futility stop, failure categories, device matrix including the untested iPhone 11 class, cost estimates and latency distribution, rater agreement, participant limitations, the manual-subscription limitations, recommendation, and the exact owner decision. Do not begin Phase 1 until that decision is committed.
