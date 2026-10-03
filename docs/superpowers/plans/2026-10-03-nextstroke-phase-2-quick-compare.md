# NextStroke Phase 2 Quick Compare Plan

> **For agentic workers:** Implement as an independently useful offline product slice. Do not couple it to guided coaching or a model provider.

**Goal:** Reproduce and improve the original Fineliner Lupe comparison workflow on iPhone Safari.

**Behavioral reference:** `legacy/fineliner-lupe/dist/` (D-029). Port behavior with tests; do not copy the bundle.

**Architecture:** Framework-independent decode, transform, alignment, render, gesture-state, and export modules feed a thin React route. Automatic alignment is cancellable and confidence-scored; manual control always remains available.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Constraints

- JPEG/PNG are required; HEIC capability is tested and gets a documented fallback.
- PDF support is one selected page under a memory budget, not general document editing.
- Working pixel limits govern memory; file-size limits alone are insufficient.
- CSS immersive mode is the iPhone standard path.
- Page zoom remains enabled; interaction suppression is scoped to the canvas.

## Review focus

1. EXIF rotation, Display-P3 input, transparency, huge dimensions, and decode failure.
2. Perspective differences that need homography rather than translation/scale/rotation.
3. Pointer cancellation, a third pointer, blur, background/resume, and orientation change.
4. Repeated canvas/bitmap/PDF operations on real iPhones.
5. Export and share fallbacks under transient user-activation rules.

## Task 0: Characterize the legacy prototype

- [ ] Write a behavior checklist from `legacy/fineliner-lupe/dist/app.js` and turn each item into an acceptance test: opacity 0–100, tap toggles original, press-hold reveal with pointer capture, two-finger pan/zoom (view 1–8×) versus reference transform in align mode (scale 0.4–2), fine-adjust tabs, 50% shortcut, PDF page picker (render edge ≤ 2400 px, document destroyed after use), PNG export of original/reference/comparison with share-sheet fallback, busy/importing guards, and the auto-align "no safe match, align manually" fallback.
- [ ] Fix the legacy defects found in the 2026-10-03 review instead of porting them:
  - imports up to 40 MP are decoded and exported at full resolution, so 24 MP iPhone photos exceed the ~16.7 MP iOS canvas area and the comparison export can fail silently (`toBlob` returns null);
  - `contextmenu` and `selectstart` are suppressed document-wide instead of only in the workspace;
  - no web app manifest or service worker, so the app is not installable or offline;
  - auto-align optimizes only translation, scale (0.65–1.4), and rotation (±15°) by grayscale correlation at 160 px, which misses perspective differences.
- [ ] Decide whether to keep the prototype's `document.modelContext.registerTool` agent-tool hook (WebMCP) as progressive enhancement.

## Task 1: Safe bounded import

- [ ] Test orientation, transparency, color normalization, and decode pixel budget.
- [ ] Downsample early in a worker with `OffscreenCanvas` while retaining the immutable original blob separately; the probe measured up to 285 ms main-thread blocks when decoding on the main thread.
- [ ] Add HEIC capability detection/fallback and single-page PDF selection/release.

## Task 2: Deterministic renderer

- [ ] Define finite source-normalized transforms and viewport projection.
- [ ] Implement opacity, split comparison (img-comparison-slider), original reveal, fit/reset, and layered render.
- [ ] Verify current settings survive route and immersive-mode transitions.

## Task 3: Touch and controls

- [ ] Implement pan/pinch with explicit pointer lifecycle and cancellation, using `@use-gesture` or `@panzoom/panzoom` (D-036).
- [ ] Provide button alternatives for position, scale, rotation, opacity, fit, and reset.
- [ ] Scope selection/drag/long-press suppression to the workspace.

## Task 4: Alignment

- [ ] Implement manual four-point perspective alignment first.
- [ ] Add automatic feature/homography proposal (opencv.js AKAZE/ORB + RANSAC, ECC refinement, in a worker; D-036) with confidence and cancellation only after fixtures exist. Keep the legacy correlation search as a cheap first guess if tests show it helps.
- [ ] Reject low-confidence results without moving the user's layer.

## Task 5: Offline route and export

- [ ] Complete no-project Quick Compare flow.
- [ ] Add PNG/JPEG comparison export and native share when supported.
- [ ] Verify installed/offline behavior and service-worker update recovery.

## Exit gate

- Core flow works offline on current and oldest supported real iPhone.
- Ten repeated sessions show no crash/reload under defined test images.
- Manual alignment always recovers from failed automatic alignment.
- Original reveal works by tap and press/hold without hiding controls unexpectedly.
