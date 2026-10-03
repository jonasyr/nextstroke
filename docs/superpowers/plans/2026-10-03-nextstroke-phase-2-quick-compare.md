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

- [x] Write a behavior checklist from `legacy/fineliner-lupe/dist/app.js` and turn each item into an acceptance test: opacity 0–100, tap toggles original, press-hold reveal with pointer capture, two-finger pan/zoom (view 1–8×) versus reference transform in align mode (scale 0.4–2), fine-adjust tabs, 50% shortcut, PDF page picker (render edge ≤ 2400 px, document destroyed after use), PNG export of original/reference/comparison with share-sheet fallback, busy/importing guards, and the auto-align "no safe match, align manually" fallback.
- [x] Fix the legacy defects found in the 2026-10-03 review instead of porting them:
  - imports up to 40 MP are decoded and exported at full resolution, so 24 MP iPhone photos exceed the ~16.7 MP iOS canvas area and the comparison export can fail silently (`toBlob` returns null);
  - `contextmenu` and `selectstart` are suppressed document-wide instead of only in the workspace;
  - no web app manifest or service worker, so the app is not installable or offline;
  - auto-align optimizes only translation, scale (0.65–1.4), and rotation (±15°) by grayscale correlation at 160 px, which misses perspective differences.
- [x] Decide whether to keep the prototype's `document.modelContext.registerTool` agent-tool hook (WebMCP) as progressive enhancement.

## Task 1: Safe bounded import

- [x] Test orientation, transparency, color normalization, and decode pixel budget.
- [x] Downsample early in a worker with `OffscreenCanvas` while retaining the immutable original blob separately; the probe measured up to 285 ms main-thread blocks when decoding on the main thread.
- [x] Add HEIC capability detection/fallback and single-page PDF selection/release.

## Task 2: Deterministic renderer

- [x] Define finite source-normalized transforms and viewport projection.
- [x] Implement opacity, split comparison (own canvas clip, D-053), original reveal, fit/reset, and layered render.
- [ ] Verify current settings survive route and immersive-mode transitions. (Editor ↔ image screen: done, D-054; leaving the route: open.)

## Task 3: Touch and controls

- [x] Implement pan/pinch with explicit pointer lifecycle and cancellation, using an own pointer state machine (D-053; D-036 had named `@use-gesture` or `@panzoom/panzoom`).
- [x] Provide button alternatives for position, scale, rotation, opacity, fit, and reset.
- [x] Scope selection/drag/long-press suppression to the workspace.

## Task 4: Alignment

- [x] Implement manual four-point perspective alignment first.
- [x] Add automatic feature/homography proposal (opencv.js ORB + RANSAC in a worker, D-055; AKAZE is not in the prebuilt build) with confidence, owner-approved before real fixtures, tested on synthetic ones. The legacy correlation search is the fallback. ECC refinement is still open.
- [x] Suggest paper corners for both corner steps (own opencv.js detector, jscanify approach, D-055).
- [x] Reject low-confidence results without moving the user's layer.

## Task 5: Offline route and export

- [x] Complete no-project Quick Compare flow.
- [x] Add PNG/JPEG comparison export and native share when supported.
- [ ] Verify installed/offline behavior and service-worker update recovery.

## Status (2026-10-03)

Done and tested (unit tests plus Playwright in CI): legacy checklist (`docs/research/legacy-behavior.md`), bounded worker decode, HEIC native decode with an explained fallback message, single-page PDF via the pdf.js legacy build, renderer with opacity and tap/hold reveal, pinch/pan, alignment with button alternatives, cancellable correlation auto-align, four-point perspective with draggable corners and button nudges, PNG/JPEG export with share fallback, offline route, split view with a draggable divider and a slider (D-053), full-screen editor with paper corners on both images, a corner magnifier, and a compact bottom panel (D-054), opencv.js in a worker for paper-corner suggestions and ORB + RANSAC auto-align with the correlation search as fallback, precached for offline use (D-055).

Open:
- opencv.js (D-055) on the iPhone: load time, memory, and detection and alignment on real photos; ECC refinement; a trimmed build if the 13 MB precache or memory hurts.
- Settings survive the editor and the image screen, but not leaving the compare route: the state lives in the page and is lost on navigation. Keep it in a module-level store or accept it; decide with the iPhone review.
- HEIC decoding where the browser cannot: `heic-to` fallback not added; Safari decodes HEIC natively, so this is measured on the iPhone first.
- Perspective warp runs on the main thread (about 3 MP of bilinear sampling); move it to the worker if the iPhone shows a stall.
- Owner review of the new editor on the iPhone (first test 2026-10-03 rated the old page unusable).
- Exit gate items below need real iPhones.

## Exit gate

- Core flow works offline on current and oldest supported real iPhone.
- Carried over from Phase 0 (D-043): background/resume during processing, a 48 MP photo, a HEIC photo, and the `persist()` result are tested on a real iPhone.
- Ten repeated sessions show no crash/reload under defined test images.
- Manual alignment always recovers from failed automatic alignment.
- Original reveal works by tap and press/hold without hiding controls unexpectedly.
