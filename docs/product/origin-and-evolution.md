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

The current implementation lives separately in the private Site source and serves as behavioral reference, not as the architecture for the new repository. Its compressed single-file implementation must be migrated into tested packages rather than copied wholesale.

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

The agreed MVP audience is beginners and hobby artists with an already-started physical artwork. The initial materials are fineliner, colored pencil, and watercolor. NextStroke is an iPhone-first PWA, deployed as an invite-only beta, with local-first projects and optional per-project synchronization.

AI is a supporting subsystem. The defining product is the combination of safe next-step selection, bounded preview, physical instructions, and deterministic comparison.
