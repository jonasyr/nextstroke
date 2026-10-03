# NextStroke Phase 2 Quick Compare Plan

> **For agentic workers:** Implement as an independently useful offline product slice. Do not couple it to guided coaching or a model provider.

**Goal:** Reproduce and improve the original Fineliner Lupe comparison workflow on iPhone Safari.

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

## Task 1: Safe bounded import

- [ ] Test orientation, transparency, color normalization, and decode pixel budget.
- [ ] Downsample early while retaining the immutable original blob separately.
- [ ] Add HEIC capability detection/fallback and single-page PDF selection/release.

## Task 2: Deterministic renderer

- [ ] Define finite source-normalized transforms and viewport projection.
- [ ] Implement opacity, split comparison, original reveal, fit/reset, and layered render.
- [ ] Verify current settings survive route and immersive-mode transitions.

## Task 3: Touch and controls

- [ ] Implement pan/pinch with explicit pointer lifecycle and cancellation.
- [ ] Provide button alternatives for position, scale, rotation, opacity, fit, and reset.
- [ ] Scope selection/drag/long-press suppression to the workspace.

## Task 4: Alignment

- [ ] Implement manual four-point perspective alignment first.
- [ ] Add automatic feature/homography proposal with confidence and cancellation only after fixtures exist.
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

