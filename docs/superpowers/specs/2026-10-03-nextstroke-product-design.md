# NextStroke Product and System Design

**Status:** Approved direction; revised after independent feasibility review

**Date:** 2026-10-03

**Owner decisions:** `docs/decisions/decision-log.md` D-022 through D-045

**Feasibility evidence:** `docs/reviews/2026-10-03-independent-feasibility-review.md`

## 1. Product definition

NextStroke is an iPhone-first physical-art coach for beginners and hobby artists who have an already-started analog artwork. It helps them decide and execute the next feasible fineliner marks without replacing their work.

The product combines:

- offline Quick Compare for original/reference or checkpoint comparison;
- three small next-step options constrained by the selected tool and paper;
- explicit editable and protected regions;
- a controlled visual overlay where evidence supports one;
- beginner-readable physical instructions;
- checkpoint comparison after execution;
- visible uncertainty when only experimental inspiration is available.

The promise is **“the next feasible stroke with your actual tool”**, not automatic beautification and not a guarantee that a generative model understands the artwork perfectly.

## 2. Problem and differentiation

Beginners often know that an analog work is unfinished but cannot judge which small action is low-risk, how it would look, or whether it is feasible with the materials they own. Generic image generators can create attractive alternatives but commonly redraw successful details. Generic art chatbots do not connect advice to location, material, execution, and later comparison.

NextStroke differentiates through a closed physical loop:

1. inspect the real work;
2. select the real fineliner and paper context;
3. choose one of three bounded actions;
4. see a controlled overlay or clearly warned inspiration;
5. execute concrete steps on paper;
6. photograph the checkpoint and compare.

## 3. Audience

### Primary

Beginners and hobby artists with a started fineliner artwork and an iPhone.

### Not optimized for in `v0.1`

- professional production workflows;
- digital-only drawing;
- teachers managing classes;
- automatic restoration;
- colored pencil or watercolor guidance;
- unrestricted image editing.

## 4. Product principles

1. **Originals are immutable.** Suggestions and previews are additional artifacts.
2. **Comparison is useful without AI.** Quick Compare works offline and without an account.
3. **Physical feasibility beats visual spectacle.** Advice must match the selected tool and paper.
4. **Uncertainty is a product state.** “No controlled preview” is allowed.
5. **Models do not define truth.** Provider output is untrusted until locally bounded and accepted.
6. **Sources travel with material claims.** The interface can show where a fact came from.
7. **Local first means recoverable, not magically permanent.** Export is part of the storage model.
8. **iPhone Safari is tested on devices.** Emulation is supporting evidence only.

## 5. `v0.1` scope

### Included

- iPhone-first installable PWA;
- JPEG and PNG import with orientation and color normalization;
- optional single-page PDF import under explicit memory limits;
- original and optional reference/checkpoint upload;
- manual crop and four-corner perspective correction;
- automatic corner/alignment suggestion with confidence and manual fallback;
- opacity comparison, swipe/split option, tap and press-hold original reveal;
- pan, pinch zoom, reset, fit, and CSS immersive comparison;
- image export and local project-package backup;
- three fineliner-specific next-step suggestions;
- editable region plus protected geometry;
- Careful/Balanced/Bold control based on physical risk, area, contrast, and step count;
- controlled overlay when possible;
- experimental inspiration with warning when selected by the user;
- material-aware execution instructions;
- 10–20 curated black fineliner profiles, generic profile, paper context;
- optional personal calibration card;
- local projects and checkpoints in IndexedDB with export warning;
- explicit confirmation before any image is sent to a remote model.

### Excluded

- account, login, cloud sync, D1, or R2 project storage;
- colored-pencil or watercolor production support;
- AR camera overlay;
- community or marketplace;
- silent background upload;
- automatic destructive edits;
- claims of exact mask adherence or semantic safety from pixel percentages;
- conversion of a full generated composite into a claimed “true change layer”;
- native iPhone element-fullscreen as a requirement;
- large multi-page PDF project workflow;
- broad provider-neutral architecture before a provider passes Phase 0.

## 6. Main flows

### 6.1 Quick Compare

1. Choose original.
2. Choose reference or checkpoint.
3. Normalize both to a bounded working size.
4. Accept automatic alignment or adjust four points/transform manually.
5. Compare using opacity, split, original reveal, zoom, and pan.
6. Enter CSS immersive mode with current settings preserved.
7. Export the current comparison or return without creating a project.

Quick Compare must remain usable offline after the PWA shell is installed.

### 6.2 Guided project

1. Capture or import the artwork.
2. Correct perspective and confirm the working crop.
3. Select a known fineliner or generic profile and paper context.
4. Optionally complete the calibration card.
5. Describe intent, desired area, and what must remain untouched.
6. Receive exactly three bounded ideas.
7. Select one idea and confirm editable/protected regions.
8. Request a preview only after a transmission explanation and confirmation.
9. Review controlled overlay or experimental inspiration state.
10. Follow ordered physical steps.
11. Capture a checkpoint and compare it with the starting image.
12. Save locally and optionally export a project package.

## 7. Preview artifact model

```ts
type ArtifactTrust = "untrusted" | "diagnostic" | "controlled" | "experimental" | "rejected";

interface Provenance {
  sourceAssetHash: string;
  transformRevision: string;
  producer: string; // algorithm version, or service + model label
  promptRevision?: string;
  createdAt: string;
}

interface GeneratedComposite {
  kind: "generated-composite";
  assetId: string;
  providerRunId: string;
  provenance: Provenance;
  trust: "untrusted";
}

interface DerivedDifferenceOverlay {
  kind: "derived-difference-overlay";
  assetId: string;
  sourceCompositeId: string;
  provenance: Provenance;
  trust: "diagnostic";
}

interface ControlledOverlay {
  kind: "controlled-overlay";
  assetId: string;
  construction: "direct-alpha" | "structured-strokes" | "svg";
  editableMaskRevision: string;
  protectedGeometryRevision: string;
  provenance: Provenance;
  trust: "controlled";
}

interface ExperimentalInspiration {
  kind: "experimental-inspiration";
  assetId: string;
  source: "generated-composite" | "failed-overlay";
  sourceArtifactId: string;
  provenance: Provenance;
  trust: "experimental";
  warningCode: string;
}

interface RejectedCandidate {
  kind: "rejected-candidate";
  sourceArtifactId: string;
  reasonCode: string;
  trust: "rejected";
}
```

`GeneratedComposite` and `DerivedDifferenceOverlay` can never be promoted to `ControlledOverlay`, silently or with approval. A `GeneratedComposite`, even after original copyback, can become at most `ExperimentalInspiration`. Human approval records preference; it does not change the artifact's technical trust class.

### 7.1 Experimental inspiration export (D-033)

An `ExperimentalInspiration` image can be exported or shared only with a visible warning drawn into the exported pixels. A clean export is never offered. Exporting the physical instructions without the image is always allowed.

## 8. Image and safety pipeline

1. Keep the immutable source blob.
2. Apply orientation and convert a bounded working copy to defined sRGB behavior.
3. Store transform and crop revisions in source-normalized coordinates.
4. Maintain separate `editableRegion`, `protectedGeometry`, and `featherBand` masks. `protectedGeometry` takes priority over `editableRegion` where they intersect. `featherBand` lies entirely inside `editableRegion`, so blending never touches pixels outside it.
5. Send only the confirmed working crop, required context, and masks after explicit user action.
6. Treat provider output as untrusted.
7. Register provider output to the working source with confidence; fall back to manual alignment.
8. For a controlled output, copy original pixels outside the editable region and inside protected geometry. For overlays this means overlay alpha is zero there; for an exported composite at any resolution, those pixels come from the immutable original at that resolution.
9. Evaluate geometry, photometry, contour similarity, and artifact structure separately.
10. Ask the user to confirm artistic meaning.
11. Keep experimental candidates in a separate state with prominent warning.

A pixel ratio is a diagnostic signal, not a semantic certificate. Resampling, antialiasing, photo lighting, and registration can all change pixels without changing artistic content, while a critical line can be damaged inside an allowed region.

## 9. Material knowledge

The authoritative subsystem design is `docs/product/material-knowledge-base.md`.

Key invariants:

- `v0.1` is fineliner-only.
- Material claims include source, evidence level, conditions, confidence, and retrieval date.
- Manufacturer statements remain attributed claims.
- NextStroke tests include method, paper, environment, and revision.
- Community reports identify possible failures but cannot establish a safety claim.
- Recommendations are rule-filtered before an LLM explains them.
- Unknown tools use a conservative generic profile.
- Calibration is optional and produces relative, not absolute, measurements.

## 10. Data model

Core local entities:

- `Project`
- `ImmutableAsset`
- `WorkingImageRevision`
- `TransformRevision`
- `MaskRevision`
- `ToolSelection`
- `PaperSelection`
- `CalibrationSample`
- `SuggestionSet`
- `SelectedSuggestion`
- `PreviewAttempt`
- `ControlledOverlay`
- `ExperimentalInspiration`
- `ExecutionPlan`
- `Checkpoint`
- `ExportManifest`

Every derived artifact records its source asset hash, algorithm or model version, prompt/schema version where applicable, transform revision, and creation time.

## 11. Storage and privacy

- Projects and blobs are local in `v0.1`.
- IndexedDB is best-effort storage and may be evicted; the UI communicates this.
- Use `navigator.storage.estimate()`, `persisted()`, and `persist()` when supported.
- Project-package export is available early, not postponed to cloud work.
- Reopening after backgrounding retries database access idempotently.
- No user image or image-derived description enters logs or analytics.
- A remote analysis/preview call requires a visible explanation of what will be sent.
- Server processing, if used, retains no project asset by default and follows a documented deletion window.
- ChatGPT Sites (D-038) records traffic analytics (visitors, page views) automatically and offers no data residency. Privacy copy discloses this; image processing stays on the device.
- A NextStroke server's retention is not the model provider's retention. Provider retention is disclosed as the provider documents it; for example, OpenAI documents up to 30 days of abuse-monitoring retention for image edits unless zero data retention is approved (verified 2026-10-03). Privacy copy never says "not retained" without a matching provider contract.

Cloud accounts and synchronization require a future design amendment covering identity, conflicts, deletion, retention, backups, and applicable data-protection obligations.

## 12. Mobile and accessibility

- Support the current and previous major iOS versions at release time, verified again before launch. On 2026-10-03 these are iOS 27 and iOS 26, both supporting iPhone 11 and later, so iPhone 11 is the oldest real-device target.
- Element Fullscreen is not available on iPhone Safari (verified 2026-10-03); CSS immersive mode is the only iPhone path.
- Every canvas stays at or below 4096 × 4096; the default working image has a 2048 px longest edge until Phase 0 evidence changes it.
- Define a working image pixel budget; file-size limits alone are insufficient.
- Decode and downsample early, reuse canvases, release `ImageBitmap`, PDF, and OpenCV resources.
- Use CSS immersive mode as the reliable iPhone path.
- All touch interactions have button alternatives.
- Handle pointer cancellation, browser blur, orientation change, background/resume, and safe areas.
- Prevent selection, native image drag, and disruptive long-press only inside the interaction workspace.
- Keep at least 44-by-44 CSS-pixel targets, visible focus, screen-reader labels, and sufficient contrast.
- Never disable page zoom globally.

## 13. Architecture direction

After Phase 0, the retained product may use a TypeScript workspace with:

- `apps/web`: React/Vite PWA and browser adapters;
- `apps/api`: minimal secrets boundary for model calls only when required;
- `packages/contracts`: versioned runtime schemas;
- `packages/compare`: transforms and deterministic comparison state;
- `packages/imaging`: decoding, masks, alignment, compositing, export;
- `packages/materials`: sourced dataset, evidence model, rule engine;
- `packages/coaching`: suggestion and instruction contracts;
- `packages/ui`: accessible visual components.

Phase 0 is allowed to use disposable scripts and a thin server endpoint. It must not prematurely freeze production interfaces.

### 13.1 Hosting constraint (D-038)

Every build must deploy to ChatGPT Sites. The web app therefore:

- is a plain static directory, deployed in static mode unless a server-side secret is needed (then Worker mode);
- needs no custom response headers; runs opencv.js single-threaded without `SharedArrayBuffer`;
- uses hash routing or a single route;
- falls back to `fetch` + `WebAssembly.instantiate` if `.wasm` is not served as `application/wasm`;
- treats the deployment probe in Phase 0 Task 6 as the evidence for these assumptions (first iPhone run passed, `docs/research/2026-10-03-sites-probe-iphone.md`);
- decodes and downscales photos in a worker (`OffscreenCanvas`), because main-thread decoding of a 12 MP photo blocked for up to 285 ms on the probe device.

### 13.2 Reused libraries (D-036)

| Need | Library | License |
| --- | --- | --- |
| Warp, homography, ECC alignment, edges | opencv.js (`@techstark/opencv-js`, later trimmed), in a Web Worker; the manual four-point warp is own code (D-053) | Apache-2.0 |
| Paper corner detection | Own detector on opencv.js, jscanify as reference; manual corners always available | MIT |
| Natural strokes for structured overlays | perfect-freehand | MIT |
| Pinch and pan | Own pointer state machine in `packages/compare` (D-053) | — |
| Split comparison | Own canvas clip in the comparison renderer (D-053) | — |
| PDF page render | pdfjs-dist | Apache-2.0 |
| HEIC fallback | heic-to, unmodified and lazy-loaded | LGPL-3.0 |
| Accessible UI primitives | Radix UI | MIT |
| Project-package zip | fflate (JSZip as alternative) | MIT |
| Optional mask handles | Konva | MIT |
| Later, if Phase 0 shows need | TEED contours; SlimSAM-77 via transformers.js | MIT; Apache-2.0 |

## 14. Failure behavior

| Failure | Required behavior |
| --- | --- |
| Unsupported/oversized image | Explain limit; preserve project; offer lower-resolution retry |
| PDF memory risk | Render only selected page; release resources; offer image conversion |
| Auto-alignment low confidence | Keep current images and open manual control |
| Database unavailable | Keep current session in memory when possible; offer immediate export |
| No network | Quick Compare and existing local projects remain available |
| Provider timeout | Preserve request state; allow deliberate retry; prevent duplicate billing where possible |
| Controlled overlay fails | Offer physical instruction and optionally warned experimental inspiration |
| Material fact missing | Use conservative generic rule and disclose uncertainty |
| Calibration skipped | Continue with conservative recommendations |
| Original-copy boundary violated | Reject controlled state; never silently accept |

## 15. Phase 0 gates

Owner decisions: D-024, D-030, D-031, D-032, D-034, D-035. The operational checklist is the Phase 0 plan.

### 15.1 Corpus and method

- 30 ordinary iPhone photographs of started fineliner works (D-030); at least 10 have an annotated critical contour inside or touching the editable region. At most 10 may be photographs of printed CC0/CC BY line drawings (D-035); web-sourced drawings are allowed and kept private (D-042). Results are reported per source.
- Strategies: S1 masked full-composite edit, S2 direct transparent overlay, S3 structured strokes/SVG rendered locally.
- S2 and S3: up to three attempts per case, stopping at the first `controlled` screening result. S1: one attempt on 10 pre-selected cases. A strategy stops after 10 failed cases because it can no longer reach GO. Every attempt is reported (D-035).
- Models are run manually through existing subscriptions without additional spend (D-031). Cost is an API-equivalent estimate from published pricing on the run date.
- Thresholds and definitions are committed before any output is generated.

### 15.2 Definitions

- **Case success for a strategy:** one of at most three attempts is classified `controlled` after the next-day re-review. Reporting every attempt is required; this is the realistic-retry model, not cherry-picking. Cases not run because of a futility stop count as failures.
- **Critical contour destruction:** an annotated critical contour is visibly removed, broken, altered, or obscured in the final composite so that the artist would need to redraw or rescue it.
- **Understandable in isolation:** shown alone on white, a rater can say what to draw and where without seeing the composite.
- **Unnoticed change:** a contour or paper defect in a `controlled` candidate that the owner's next-day re-review or a second rater finds after classification.
- **Understands the instruction:** a participant correctly states location, tool, and the first two steps without prompting.
- **Worsens the work:** any rater judges the after photograph worse than the before photograph under the rubric.

### 15.3 Classification

- **controlled:** an S2 or S3 candidate that passes the automated boundary audit and every rubric criterion: correct location, matches the requested change, no critical contour destruction, no paper texture, global cast, shadow, or large opaque area in the layer, plausible for a black fineliner, physically executable, and understandable in isolation.
- **experimental:** any S1 candidate that is registered and passes the boundary audit after copyback; any S2 or S3 candidate that fails a rubric criterion but is on-task and readable.
- **rejected:** off-task or unreadable output, failed registration, or content that cannot be shown.

S1 can never be `controlled`. Pixel ratios are reported as diagnostics only.

### 15.4 Decision

**GO** requires one strategy, S2 or S3, to meet every criterion; that strategy is the only preview path Phase 4 may retain:

- at least 70% of GO-eligible cases are case successes (21 of 30 as planned; 5 of 7 for the supplied corpus, D-044);
- zero critical contour destruction among `controlled` candidates;
- at least 80% of `controlled` candidates are understandable in isolation;
- at least 70% of beginner participants understand the instruction;
- at least 60% of beginner participants execute without worsening the work;
- no crash or reload in the ten-cycle real-device run on the available device;
- median latency per case success, including attempts used, under 60 seconds and estimated cost under USD 0.30.

**PIVOT** applies when any GO criterion is unmet, including when evidence is missing at the end of the timebox, or when any of these triggers holds for the best strategy:

- more than 10% of `controlled` candidates contain unnoticed contour or paper changes;
- more than 50% of cases need mask repair or have no `controlled` result on the first attempt;
- reported quality depends on unreported selection;
- S2 and S3 both fail while S1 is the only usable visual route.

The default pivot target for preview failures is Quick Compare + sourced critique + manually confirmed stroke/SVG plan + checkpoint comparison. For beginner, device, or cost failures, the owner selects and records the pivot. There is no STOP outcome (D-032); the owner decides after reviewing the report.

**Outcome (D-048):** PIVOT. S3 met every technical criterion and is the only retained preview strategy; the beginner criteria above were not measured and become the Phase 3 exit gate. Report: `docs/research/phase-0-results.md`. Follow-up tests (D-049, D-050) led to the retained route: an S1 template transferred into an S3 stroke plan, with the template shown only as experimental inspiration (D-051).

Phase 0 evidence is manual and partly unblinded. Before a public beta, Phase 4 must reconfirm the retained strategy through the production API path on a fresh holdout set, and the iPhone 11-class device test must pass before the Phase 2 exit gate.

## 16. Roadmap

1. **Phase 0 — Proof of feasibility:** test core preview, iPhone memory, cost, and beginner execution.
2. **Phase 1 — Lean foundation:** create only the architecture required by passed experiments.
3. **Phase 2 — Quick Compare:** ship the independent offline comparison value.
4. **Phase 3 — Fineliner coach:** add sourced materials, three ideas, optional calibration, and physical instructions.
5. **Phase 4 — Controlled preview and local beta:** add only the preview path that passed Phase 0, local projects, checkpoints, export, and public hardening.
6. **Later:** accounts/sync on demonstrated demand, then colored pencil behind its own gate, then possible watercolor research.

## 17. Success measures

Early product evidence emphasizes task outcomes, not vanity metrics:

- Quick Compare completion without help;
- time to align and inspect;
- instruction comprehension;
- physical execution success and regret rate;
- rate of controlled versus experimental versus absent previews;
- provider retries, cost, and latency;
- crashes/reloads, memory failures, database reopen failures;
- use and effect of calibration;
- percentage of user-facing material claims with valid provenance.

Small betas produce qualitative signals, not statistically credible “99% safe” claims.

## 18. Governance

- Public repository: `jonasyr/nextstroke`.
- Intended license: AGPL-3.0, subject to dependency and distribution review before release.
- Root `AGENTS.md` and `docs/README.md` are mandatory entry points.
- Product, privacy, architecture, provider, or roadmap changes update documents in the same change.
- No real user artwork, credentials, beta lists, or proprietary copied catalogs enter the repository.
- Synthetic or explicitly licensed fixtures only.
- Live paid-model evaluations never run automatically in pull-request CI.

## 19. Open decisions intentionally deferred

- exact retained framework/package versions after Phase 0;
- which preview strategy, if any, graduates from the experiment;
- exact initial fineliner catalog after license/source review;
- whether a minimal API is needed for analysis as well as preview;
- cost controls on the hosting plan's usage limits (the host itself is ChatGPT Sites, D-038);
- account and sync architecture;
- colored-pencil and watercolor scope.

These are deferred because evidence, not convenience, must decide them.
