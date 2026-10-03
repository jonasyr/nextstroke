# NextStroke Phase 0 Proof-of-Feasibility Plan

> **For agentic workers:** This is a timeboxed experiment. Code is disposable unless a later approved plan explicitly retains it. Do not generalize architecture during the experiment.

**Goal:** Determine within 1–2 weeks whether NextStroke can produce understandable, physically executable fineliner guidance and a bounded visual preview on normal iPhone photos without unacceptable contour, device, latency, or cost failures.

**Architecture:** Use a local evaluation corpus, a thin model-call boundary, three independent preview strategies, a deterministic local compositor, and append-only result records. No production database, auth, sync, monorepo abstraction, or polished navigation.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Global constraints

- Owner approval is required before paid calls or participant testing.
- Obtain participant/asset consent and document allowed use.
- Do not commit personal artwork or provider credentials.
- Save every seed/attempt and rejection; no cherry-picking.
- Only fineliner results determine the product GO decision.
- Treat all provider composites as untrusted.
- A controlled label requires deterministic original-copy boundaries.
- Record model/version, prompt/schema revision, dimensions, latency, and cost.

## Review focus

1. Ordinary handheld photos with shadows, perspective, paper texture, and existing dense linework.
2. Critical contours partly inside or near the editable region.
3. Transparent outputs containing opaque paper, halos, or global color casts.
4. Oldest supported iPhone under ten repeated import/process/export cycles and background/resume.
5. Beginner interpretation and physical execution without developer help.

## Task 1: Freeze corpus, consent, and rubric

**Deliverables:** corpus manifest, consent record template, rubric, critical-contour annotations, and cost budget.

- [ ] Collect 30 normal iPhone photographs: 15 fineliner, 10 colored pencil, 5 watercolor for comparative research.
- [ ] For each image record lighting, paper visibility, perspective, device class, desired small change, editable region, and critical contours.
- [ ] Define blind rating scales for location, contour preservation, paper/lighting preservation, material plausibility, isolation clarity, and physical executability.
- [ ] Assign stable anonymous IDs; keep original personal files outside git.
- [ ] Set maximum paid-call budget and stop when reached.
- [ ] Pre-register metrics and thresholds before generating outputs.

## Task 2: Run three preview strategies

**Strategies:**

1. masked full-composite inpainting;
2. direct transparent overlay generation;
3. structured stroke/SVG instructions rendered deterministically.

- [ ] Use the same cases, instructions, and disclosed number of attempts per strategy.
- [ ] Preserve all raw responses and failures in the private experiment store.
- [ ] Render every candidate over transparent, white, checkerboard, and original backgrounds.
- [ ] Reject overlay candidates containing paper texture, global casts, shadows, or large unintended opaque areas.
- [ ] Never name an RGB-difference extraction a true alpha/change layer.

## Task 3: Implement deterministic boundary evaluation

- [ ] Normalize working color/size/orientation and record transforms.
- [ ] Separate editable, protected, and feather masks.
- [ ] Copy original pixels outside editable and inside protected regions for candidate composites.
- [ ] Measure geometry, photometry, contour similarity, and boundary leakage separately.
- [ ] Add human review for semantic damage inside the editable region.
- [ ] Classify each result as controlled, experimental, or rejected under the spec vocabulary.

## Task 4: Test iPhone pipeline

- [ ] Select oldest intended supported iPhone and one current model.
- [ ] Define maximum working edge/pixel budget before the run.
- [ ] Complete ten import → normalize → preview/composite → compare → export cycles per device.
- [ ] Background/resume the PWA during decode, evaluation, and local persistence.
- [ ] Track reloads, crashes, decode failures, peak-memory proxy, blocked-main-thread intervals, and export failures.
- [ ] If testing PDF, render only one selected page and immediately release resources.

## Task 5: Test beginner comprehension and execution

- [ ] Recruit 5–8 beginners using fineliner.
- [ ] Show three ideas, the preview state, sourced tool context, and execution steps without developer explanation.
- [ ] Record comprehension, chosen action, time, execution completion, regret, perceived authorship, and whether the result worsened under the rubric.
- [ ] Compare calibration-card users with skipped-calibration users as qualitative evidence only.

## Task 6: Decide without extending the timebox

**GO only if every condition holds:**

- [ ] At least 70% of fineliner cases produce one acceptable bounded preview without best-seed cherry-picking.
- [ ] Zero critical contour destruction occurs in outputs labeled controlled.
- [ ] At least 80% of accepted overlays are understandable in isolation.
- [ ] At least 70% of beginners understand the instruction without help.
- [ ] At least 60% execute without worsening the work under the rubric.
- [ ] Defined device cycles complete without crash/reload.
- [ ] Median end-to-end preview is under 60 seconds and USD 0.30 including realistic retry behavior.

**PIVOT when any condition holds:**

- [ ] More than 10% of accepted candidates contain unnoticed contour/paper changes.
- [ ] More than 50% of cases require mask repair or repeated attempts.
- [ ] Reported quality depends on selecting only favorable seeds.
- [ ] Full-composite difference is the only usable visual route.

**Pivot target:** Quick Compare + sourced critique + manually confirmed stroke/SVG plan + checkpoint comparison.

## Required report

Create `docs/research/phase-0-results.md` containing methods, corpus summary, all aggregate outcomes, failure gallery references, device matrix, cost/latency distribution, participant limitations, recommendation, and the exact owner decision. Do not begin Phase 1 until that decision is committed.
