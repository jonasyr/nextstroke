# Origin and Evolution

**Last updated:** 2026-10-03  
**Status:** Historical context; retained product requirements are normative through the approved design spec.

## 1. The original product: Fineliner Lupe

The project began as a mobile web tool for comparing a person's physical artwork with an improved or reference image. The immediate example was a hand-drawn lighthouse made with fineliner and colored pencil.

The original need was practical rather than generative: overlay two images, align them, adjust the proposed layer's opacity, and inspect exactly where the next marks could go. It was optimized for iPhone Safari.

The working feature set grew to include:

- original and reference image upload
- PDF upload with page selection
- automatic and manual alignment
- horizontal/vertical translation, scale, and rotation
- opacity adjustment
- pinch zoom and pan
- tap and press-and-hold to reveal the original
- fullscreen comparison using the current settings
- image export/download
- suppression of selection, image drag, and Safari's disruptive long-press behavior inside the canvas workspace

The current implementation is preserved in this repository at `legacy/fineliner-lupe/` and serves as behavioral reference, not as the architecture for the production rewrite. Its compact static implementation must eventually be migrated into tested packages rather than copied wholesale into the new architecture.

## 2. The lesson from the lighthouse edit

An attempted automated lighting improvement demonstrated the central product risk: a model could add the requested lamp glow while also changing or removing the lamp grid and other existing details. A visually attractive full-image regeneration was therefore not safe enough for an artwork-in-progress workflow.

That failure produced the core NextStroke invariant:

> AI may propose or render a bounded addition, but the original remains immutable and the application must detect changes outside the permitted area.

It also motivated protected regions, transparent change layers, local pixel-difference validation, and the separation of analysis from preview generation.

## 3. Why the scope changed

An overlay tool answers “where do these images differ?” but not “what should I safely do next with the materials I own?” A generic art chatbot can offer advice but does not connect that advice to a precise, reversible visual layer or to physical execution.

The product therefore evolved into a physical-art finishing coach while preserving Quick Compare as an independent tool. The new workflow adds:

- capture and perspective correction
- material and tool context
- three realistic improvement candidates
- selection of one bounded change
- a material-aware preview layer
- beginner-friendly physical instructions
- a checkpoint photo and renewed comparison

## 4. What must remain recognizable

NextStroke is not a replacement project unrelated to Fineliner Lupe. The comparison engine remains a first-class capability and must retain its directness: upload two images, align them, change opacity, inspect the original instantly, use fullscreen, and export.

The broader guided workflow is allowed to change navigation and visual design, but it must not bury Quick Compare or make it depend on an account, network connection, or AI provider.

## 5. Product boundary reached on 2026-10-03

The first planning pass targeted beginners and hobby artists, three media, an invite-only cloud beta, and optional synchronization. An independent feasibility review then found that the plan committed to too much infrastructure before proving its central preview mechanism.

The owner subsequently approved a narrower direction:

- Coach + controlled layer remains the product core.
- `v0.1` supports fineliner only.
- Phase 0 tests the risky preview hypothesis before production architecture.
- Local projects and export precede accounts and synchronization.
- Uncertain model output may be shown only as experimental inspiration with a visible warning.
- A sourced fineliner/paper knowledge base and optional personal calibration card become part of the MVP.

AI remains a supporting subsystem. The defining product is now the combination of deterministic comparison, sourced material knowledge, physically executable next-step coaching, explicit uncertainty, and a controlled local overlay over an immutable original.

## 6. What changed in the safety model

The earlier wording assumed that a provider composite could be converted into a reliable transparent change layer and that pixel thresholds could prove safety. Research did not support either assumption.

The revised model distinguishes four artifacts:

1. `GeneratedComposite`: an untrusted full image from a provider.
2. `DerivedDifferenceOverlay`: a diagnostic visualization of differences, never described as the true edit.
3. `ControlledOverlay`: a direct or structured layer that meets product validation and is composited locally.
4. `ExperimentalInspiration`: an uncertain result shown with warning, not an execution-safe layer.

Outside the editable region and inside protected geometry, the renderer uses original pixels. Semantic quality still requires human confirmation; a pixel score alone is not a safety certificate.
