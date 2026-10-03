# NextStroke Phase 2 Quick Compare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing Fineliner Lupe behavior as an offline-capable, tested Quick Compare feature optimized for iPhone Safari.

**Architecture:** Pure packages decode inputs, model transforms, render Canvas frames, estimate alignment, and export results. React owns only screens and browser adapters. The private `site-workspace/dist/app.js` is a behavioral reference; its minified structure is not copied into the new codebase.

**Tech Stack:** TypeScript, Canvas 2D, PDF.js, React, Vitest, Testing Library, Playwright Chromium/WebKit, Vite PWA service worker.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Global Constraints

- Quick Compare works without login, network, or AI after the PWA shell is cached.
- Original and overlay assets remain separate and immutable.
- Preserve current state across normal and immersive fullscreen views.
- Support image input and one chosen page from a PDF up to documented limits.
- Touch gestures act only inside the image workspace and do not globally disable Safari or accessibility behavior.
- Existing capabilities are migration acceptance criteria, not optional enhancements.
- Update `docs/product/origin-and-evolution.md` and the decision log if behavior intentionally diverges from the original tool.

## Review Focus

1. EXIF-rotated JPEG/HEIC, transparent PNG, 70MB rejection, and multi-page PDF cancellation must produce deterministic import results; Task 1 tests them.
2. Zero-sized canvas, extreme aspect ratios, device-pixel ratios above 3, and non-finite transforms must never create an invalid render; Task 2 tests them.
3. Pointer cancellation, a third touch, blur, and fullscreen exit must release all transient gesture state; Task 3 tests them.
4. Blank or dissimilar images must return `insufficient-confidence` rather than a destructive auto-alignment; Task 4 tests it.
5. Export after fullscreen, original-peek, or offline reload must match visible persistent state without baking a transient peek; Task 5 tests it.

---

### Task 1: Implement safe image and PDF import

**Files:**
- Create: `packages/imaging/tsconfig.json`
- Create: `packages/imaging/src/errors.ts`
- Create: `packages/imaging/src/decode/types.ts`
- Create: `packages/imaging/src/decode/decodeImageFile.ts`
- Create: `packages/imaging/src/decode/pdfDocument.ts`
- Create: `packages/imaging/src/decode/normalizeBitmap.ts`
- Create: `packages/imaging/src/index.ts`
- Create: `packages/imaging/test/decodeImageFile.test.ts`
- Create: `packages/imaging/test/pdfDocument.test.ts`
- Create: `tests/fixtures/images/manifest.json`
- Create: `tests/fixtures/pdfs/manifest.json`

**Interfaces:**
- Consumes: `AssetId` and asset metadata schemas from Phase 1.
- Produces: `decodeImageFile(file: File, options: DecodeOptions, signal?: AbortSignal): Promise<DecodedImage>`; `openPdf(file: File, signal?: AbortSignal): Promise<PdfHandle>`; `PdfHandle.pageCount`; `PdfHandle.renderPage(pageNumber: number, options: RenderPageOptions, signal?: AbortSignal): Promise<DecodedImage>`; typed `ImportErrorCode`.

- [ ] **Step 1: Add synthetic and licensed input fixtures**

Create tiny fixtures for landscape JPEG, EXIF-rotated portrait JPEG, transparent PNG, a high-dimension low-byte image, a two-page PDF, and malformed input. Record generator/license and expected dimensions in each manifest; include no personal artwork.

- [ ] **Step 2: Write failing decoder tests**

Assert normalized orientation and dimensions, alpha preservation, MIME sniffing rather than extension trust, `FILE_TOO_LARGE` above `70 * 1024 * 1024`, `PIXEL_LIMIT_EXCEEDED` above the configured decoded-pixel limit, page numbers bounded `1..pageCount`, cancellation as `ABORTED`, and disposal of PDF resources.

- [ ] **Step 3: Run tests and confirm missing decoders fail**

Run: `pnpm --filter @nextstroke/imaging test -- decodeImageFile pdfDocument`  
Expected: FAIL because the public functions are absent.

- [ ] **Step 4: Implement decoding and normalization**

Use browser decoding with orientation applied, normalize to `ImageBitmap` plus width/height/MIME, and render PDF pages through `pdfjs-dist` at a bounded scale. Revoke object URLs and close bitmaps/PDF handles on success, failure, or abort.

- [ ] **Step 5: Verify import tests and memory cleanup spies**

Run: `pnpm --filter @nextstroke/imaging test -- decodeImageFile pdfDocument && pnpm --filter @nextstroke/imaging typecheck`  
Expected: PASS, including abort and cleanup assertions.

- [ ] **Step 6: Commit**

```bash
git add packages/imaging tests/fixtures
git commit -m "feat: add safe image and PDF import"
```

### Task 2: Build the deterministic comparison renderer

**Files:**
- Create: `packages/compare/tsconfig.json`
- Create: `packages/compare/src/types.ts`
- Create: `packages/compare/src/transform.ts`
- Create: `packages/compare/src/fit.ts`
- Create: `packages/compare/src/renderComparison.ts`
- Create: `packages/compare/src/exportComparison.ts`
- Create: `packages/compare/src/index.ts`
- Create: `packages/compare/test/transform.test.ts`
- Create: `packages/compare/test/renderComparison.test.ts`
- Create: `packages/compare/test/exportComparison.test.ts`

**Interfaces:**
- Consumes: decoded immutable base and overlay bitmaps from Task 1.
- Produces: `LayerTransform { x: number; y: number; scale: number; rotationDeg: number }`; `ViewTransform { x: number; y: number; zoom: number }`; `ComparisonState { opacity: number; layer: LayerTransform; view: ViewTransform }`; `normalizeComparisonState(input): ComparisonState`; `renderComparison(ctx, sources, state, viewport, mode): void`; `exportComparison(sources, state, kind): Promise<Blob>`.

- [ ] **Step 1: Write failing transform and render tests**

Assert defaults `{ opacity: 0.7, layer: { x: 0, y: 0, scale: 1, rotationDeg: 0 }, view: { x: 0, y: 0, zoom: 1 } }`; clamp opacity `0..1`, scale `0.4..2`, rotation `-30..30`, zoom `1..8`; replace non-finite values with defaults; cap render DPR at `3`; and preserve base aspect ratio for portrait and landscape sources.

- [ ] **Step 2: Run tests and confirm missing renderer fails**

Run: `pnpm --filter @nextstroke/compare test`  
Expected: FAIL because comparison functions are absent.

- [ ] **Step 3: Implement pure transforms, Canvas rendering, and export**

`mode` is `mixed | original | overlay | changes-only`. Rendering must not mutate state or source bitmaps. Export ignores temporary UI peek state and accepts only the persisted comparison state plus explicit export `kind`.

- [ ] **Step 4: Verify pixel snapshots and type checking**

Run: `pnpm --filter @nextstroke/compare test && pnpm --filter @nextstroke/compare typecheck`  
Expected: PASS; synthetic pixel assertions match for original, overlay, and 50% mixed modes.

- [ ] **Step 5: Commit**

```bash
git add packages/compare
git commit -m "feat: add deterministic comparison engine"
```

### Task 3: Implement resilient touch and fullscreen interaction state

**Files:**
- Create: `packages/compare/src/gestures.ts`
- Create: `packages/compare/test/gestures.test.ts`
- Create: `apps/web/src/features/compare/useCanvasGestures.ts`
- Create: `apps/web/src/features/compare/useImmersiveMode.ts`
- Create: `apps/web/src/features/compare/CompareCanvas.tsx`
- Create: `apps/web/src/features/compare/CompareCanvas.module.css`
- Create: `apps/web/src/features/compare/CompareCanvas.test.tsx`

**Interfaces:**
- Consumes: `ComparisonState` and normalization from Task 2.
- Produces: pure `beginGesture`, `updateGesture`, `endPointer`, and `cancelGesture` reducers; React `useCanvasGestures({ mode, state, onChange, onPeekChange })`; `useImmersiveMode(targetRef)` with native-fullscreen attempt and CSS fallback.

- [ ] **Step 1: Write failing gesture reducer tests**

Assert one-pointer pan, two-pointer zoom, manual overlay translation in alignment mode, pinch scale, 280ms hold-to-peek, tap-to-toggle-original, movement cancelling hold, third-pointer restart without jumps, and full cancellation on blur/pointercancel/lost capture. Every output number must remain finite.

- [ ] **Step 2: Run gesture tests and confirm failure**

Run: `pnpm --filter @nextstroke/compare test -- gestures`  
Expected: FAIL because gesture reducers are absent.

- [ ] **Step 3: Implement pure reducers and thin DOM hooks**

Use Pointer Events and pointer capture. Apply `touch-action: none`, `user-select: none`, `-webkit-user-drag: none`, and context-menu prevention only to `.imageWorkspace`. Keyboard-accessible controls remain available for every gesture action.

- [ ] **Step 4: Add and run component tests**

Test native fullscreen success, rejected fullscreen with immersive CSS fallback, exact state preservation, Escape/exit cleanup, and accessible original-peek button behavior.

Run: `pnpm --filter @nextstroke/web test -- CompareCanvas && pnpm --filter @nextstroke/compare test -- gestures`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/compare/src/gestures.ts packages/compare/test/gestures.test.ts apps/web/src/features/compare
git commit -m "feat: add touch and immersive comparison controls"
```

### Task 4: Port automatic alignment into a cancellable package service

**Files:**
- Create: `packages/imaging/src/alignment/grayscale.ts`
- Create: `packages/imaging/src/alignment/scoreTransform.ts`
- Create: `packages/imaging/src/alignment/estimateAlignment.ts`
- Create: `packages/imaging/test/estimateAlignment.test.ts`
- Create: `apps/web/src/features/compare/useAutoAlignment.ts`
- Create: `apps/web/src/features/compare/useAutoAlignment.test.ts`

**Interfaces:**
- Consumes: decoded base/overlay images and initial `LayerTransform`.
- Produces: `estimateAlignment(base, overlay, initial, options, signal): Promise<AlignmentResult>` where result is `{ status: 'aligned'; transform; confidence } | { status: 'insufficient-confidence'; previous } | { status: 'aborted'; previous }`.

- [ ] **Step 1: Write failing alignment tests**

Generate synthetic line art with known translations, scale, and rotation. Assert estimates within `2px`, `0.02` scale, and `0.5°`; blank/dissimilar images return `insufficient-confidence`; abort returns the exact previous transform; progress callbacks are monotonic and stop after abort.

- [ ] **Step 2: Run tests and confirm missing estimator fails**

Run: `pnpm --filter @nextstroke/imaging test -- estimateAlignment`  
Expected: FAIL because the estimator is absent.

- [ ] **Step 3: Implement coarse-to-fine normalized correlation**

Port the proven behavioral approach from `../site-workspace/dist/app.js` into focused pure modules: bounded grayscale samples, normalized correlation, coarse-to-fine search across translation/scale/rotation, cooperative yields, abort checks, and a documented confidence threshold. Never mutate the caller's initial transform.

- [ ] **Step 4: Verify estimator and hook behavior**

Run: `pnpm --filter @nextstroke/imaging test -- estimateAlignment && pnpm --filter @nextstroke/web test -- useAutoAlignment`  
Expected: PASS; a second run cancels the first and stale results cannot overwrite current state.

- [ ] **Step 5: Commit**

```bash
git add packages/imaging/src/alignment packages/imaging/test/estimateAlignment.test.ts apps/web/src/features/compare/useAutoAlignment.ts apps/web/src/features/compare/useAutoAlignment.test.ts
git commit -m "feat: add safe automatic image alignment"
```

### Task 5: Deliver the Quick Compare route, export, and offline shell

**Files:**
- Create: `apps/web/src/features/compare/QuickComparePage.tsx`
- Create: `apps/web/src/features/compare/QuickComparePage.module.css`
- Create: `apps/web/src/features/compare/ImportSheet.tsx`
- Create: `apps/web/src/features/compare/AlignmentSheet.tsx`
- Create: `apps/web/src/features/compare/CompareControls.tsx`
- Create: `apps/web/src/features/compare/ExportSheet.tsx`
- Create: `apps/web/src/features/compare/quickCompareReducer.ts`
- Create: `apps/web/src/features/compare/quickCompareReducer.test.ts`
- Create: `apps/web/public/manifest.webmanifest`
- Create: `apps/web/src/sw.ts`
- Create: `apps/web/e2e/quick-compare.spec.ts`
- Create: `apps/web/e2e/offline-compare.spec.ts`
- Create: `docs/testing/iphone-safari-checklist.md`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/vite.config.ts`

**Interfaces:**
- Consumes: Tasks 1–4 public interfaces.
- Produces: route `/compare`; state actions `loadBase`, `loadOverlay`, `setOpacity`, `setLayerTransform`, `setViewTransform`, `peek`, `resetView`, `autoAlign`, `export`; installed offline shell; share/download adapter.

- [ ] **Step 1: Write failing reducer and end-to-end tests**

Reducer tests assert imports never replace the other layer, stale async load versions are ignored, opacity changes render immediately, opening alignment temporarily recommends 50% without losing the user's stored opacity, and reset affects view only. E2E covers image/PDF import, page choice, manual and automatic alignment, tap/hold original, pinch/pan, fullscreen fallback, export, reload, and offline reopening.

- [ ] **Step 2: Run tests and confirm route failure**

Run: `pnpm --filter @nextstroke/web test -- quickCompareReducer && pnpm --filter @nextstroke/web exec playwright test e2e/quick-compare.spec.ts --project=webkit`  
Expected: FAIL because `/compare` and reducer are absent.

- [ ] **Step 3: Implement the mobile-first route and controls**

Use a full-height safe-area layout. Keep the Canvas visible while adjusting. Offer `Original`, `50%`, and `Suggestion` presets, an opacity slider, alignment sheet, fit/zoom controls, fullscreen, and export. Prefer `navigator.share({ files })` when supported and fall back to an object-URL download.

- [ ] **Step 4: Implement caching and offline behavior**

Precache only the application shell and required PDF worker/font assets. Do not cache user images through the service worker. Offline reload must restore the route and allow fresh local imports.

- [ ] **Step 5: Run automated and manual acceptance**

Run: `pnpm check && pnpm build && pnpm --filter @nextstroke/web exec playwright test --project=chromium --project=webkit`  
Expected: PASS. Then complete `docs/testing/iphone-safari-checklist.md` on a real iPhone for current and previous major iOS when devices are available; record device/iOS/date without user images.

- [ ] **Step 6: Update documentation and commit**

Update the documentation index with Quick Compare implementation docs and record any intentional divergence from Fineliner Lupe.

```bash
git add apps/web packages/compare packages/imaging docs tests/fixtures
git commit -m "feat: deliver offline Quick Compare"
```

## Phase 2 final review

- [ ] Run all root checks and Chromium/WebKit E2E.
- [ ] Compare every Quick Compare invariant in the design spec to an automated or manual test.
- [ ] Inspect service-worker caches and confirm no imported artwork is stored there.
- [ ] Verify transient original-peek state is absent from exported mixed images.
- [ ] Tag the merge commit `phase-2-quick-compare` only after CI and real-device checklist are green.

