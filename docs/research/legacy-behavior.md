# Fineliner Lupe: Behavior Checklist (Phase 2 Task 0)

Source: `legacy/fineliner-lupe/dist/app.js` (import commit `7473fa2`), read 2026-10-03. Each row becomes an acceptance test in Phase 2; the "Test" column names where it lives. Port behavior, not code.

## Comparison

| # | Legacy behavior | Phase 2 | Test |
| --- | --- | --- | --- |
| C1 | Reference opacity slider 0–100 %, default 65 %; mirrored in standard and immersive views | Keep | `packages/compare` state |
| C2 | "50 %" shortcut and "Referenz" (100 %) button | Keep | state |
| C3 | "Original" button shows the original (opacity 0) until the next opacity change | Keep as tap reveal | state |
| C4 | Tap on the image toggles original/comparison; a press of 280 ms or longer reveals the original while held | Keep | gestures |
| C5 | Press-and-hold "Original" button with pointer capture; Space/Enter hold on keyboard; `pointercancel`, `lostpointercapture` and window `blur` end the reveal | Keep | gestures, web |
| C6 | Badge: ORIGINAL · TIPPEN ZUM VERGLEICH / AUSRICHTEN / ORIGINAL / REFERENZ / ÜBERLAGERUNG | Keep wording | state |
| C7 | Movement over 5 px cancels the press timer | Keep | gestures |

## View and alignment

| # | Legacy behavior | Phase 2 | Test |
| --- | --- | --- | --- |
| V1 | Two-finger pinch and one-finger pan move the view; zoom 1–8× around the gesture midpoint; wheel zoom ×1.1; buttons ×1.5; keys `+`, `-`, `0` (fit), Space (toggle) | Keep | gestures, state |
| V2 | In align mode, gestures move and scale the reference layer instead (scale 0.4–2); never in immersive mode | Keep | gestures |
| V3 | Fine-adjust tabs for horizontal/vertical position (±500 px, step 0.5), size (40–200 %, step 0.1), rotation (±30°, step 0.05), with − / + buttons and a slider whose range widens to the current value | Keep, in source-normalized units | state |
| V4 | Opening alignment sets opacity to 50 % and leaves tap reveal; "Zurücksetzen" restores the identity transform | Keep | state |
| V5 | Fit resets the view; a new image resets view and transform | Keep | state |
| V6 | Auto-align: grayscale correlation at 160 px over translation, scale 0.65–1.4 and rotation ±15°, two starts (current and identity), five coarse-to-fine levels; cost above 0.3 restores the previous transform with "Kein sicherer Abgleich. Bitte manuell ausrichten." | Keep as a cheap first guess, cancellable; perspective via manual four-point alignment, then opencv.js (Task 4) | auto-align |
| V7 | Busy/importing guards block gestures, auto-align and a second import | Keep | web |

## Import and export

| # | Legacy behavior | Phase 2 | Test |
| --- | --- | --- | --- |
| I1 | JPG, PNG, WebP; files over 70 MB refused; decode failure restores the previous image | Keep, plus pixel budget | imaging |
| I2 | PDF: page picker for multi-page files; render edge ≤ 2400 px (scale ≤ 3); document destroyed after use; password-protected PDFs explained | Keep | imaging, web |
| I3 | Export Original, Referenz or Vergleich as PNG through the share sheet, falling back to a download; cancelling the share does nothing | Keep, plus JPEG | imaging, web |

## Legacy defects not ported

| # | Defect | Fix |
| --- | --- | --- |
| D1 | Imports up to 40 MP are decoded and exported at full size; 24 MP photos exceed the ~16.7 MP iOS canvas area and `toBlob` can return null silently | Working image capped by a pixel budget (spec §12: canvases ≤ 4096 × 4096, default 2048 px edge); export size bounded; a null blob is a visible error |
| D2 | `contextmenu` and `selectstart` suppressed document-wide | Suppression scoped to the workspace element |
| D3 | No manifest or service worker | Done in Phase 1 (installable, offline shell) |
| D4 | Auto-align misses perspective differences | Manual four-point perspective alignment first, opencv.js homography later |
| D5 | Element Fullscreen API requested | CSS immersive container only (spec §12) |

## Decision: WebMCP tool hook

The legacy app registers `set_comparison_opacity` through `document.modelContext.registerTool` when available. Phase 2 does not port it: no target browser ships the API, it adds an untested surface, and nothing in the spec needs it. It can return later as progressive enhancement through a decision entry.
