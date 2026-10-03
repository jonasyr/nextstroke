# NextStroke Product and System Design

**Status:** Proposed for final review  
**Date:** 2026-10-03  
**Target repository:** `jonasyr/nextstroke` (public)  
**License:** AGPL-3.0  
**Initial release:** Invite-only private beta

## 1. Executive summary

NextStroke is an iPhone-first progressive web app for beginners and hobby artists who already have a physical artwork in progress. It helps a person decide and execute the next safe, realistic improvement without replacing their style or regenerating the entire work.

The product combines a guided, material-aware analysis with a deterministic comparison tool. AI may propose and render a tightly bounded change layer. Browser-native imaging code aligns images, composites that layer, validates its bounds, and lets the user compare it with the untouched original. The existing overlay workflow remains available as a standalone quick mode.

The initial material profiles are fineliner, colored pencil, and watercolor. A reference image is optional. The product is deliberately not a general art chatbot, social network, or one-click artwork generator.

## 2. Problem

People working on physical art often reach a point where they can see that something is missing but cannot confidently answer:

- What should I change next?
- Can I execute that change with the tools I own?
- How will it affect this specific physical artwork?
- Will the change preserve the parts that already work?
- How do I translate a digital suggestion into real strokes, pressure, colors, and order?

Generic image generators tend to recreate the whole image, silently changing successful details. Generic critique tools stop at advice. Tracing tools help reproduce a reference but do not decide what is safe or useful on an artwork already in progress. NextStroke connects diagnosis, a bounded preview, physical instructions, and a new-photo comparison in one workflow.

## 3. Audience and promise

### Primary audience

Beginners and hobby artists with an already-started analog artwork who want practical help completing or improving it.

### Product promise

> Photograph the work you already made. Choose one realistic improvement. See only that change, learn how to make it with your own materials, and verify the result without losing your original style.

### Design principles

1. Preserve authorship: suggest the next action rather than replace the artwork.
2. Make uncertainty visible: advice and previews may be useful without pretending to be exact physical simulations.
3. Prefer bounded changes: every preview has a mask, locked regions, and a local validation step.
4. Teach while helping: instructions explain why a change works and how to execute it.
5. Keep the comparison tool useful without AI, an account, or a network connection.
6. Treat iPhone Safari as a first-class platform.

## 4. Scope

### Included in the private-beta MVP

- Invite-only login for access to the deployed beta
- Project creation from camera, image, or one selected PDF page
- Cropping, four-corner perspective correction, and capture-quality warnings
- Fineliner, colored-pencil, and watercolor material profiles
- Available-tool and goal selection
- Optional reference image
- Explicit user-triggered AI analysis
- Exactly three structured improvement candidates
- Impact, effort, risk, required materials, and reasoning for each candidate
- Selection of one candidate for a bounded preview
- `Careful`, `Balanced`, and `Bold` change boundaries
- User-editable protected regions
- Material-aware preview as a separate masked change layer
- Local validation for changes outside the allowed mask or inside protected regions
- Beginner-friendly, step-by-step physical instructions
- Checkpoint photo and before/after comparison
- Local projects, with cloud synchronization enabled per project rather than globally
- Export of the current comparison or instruction sheet
- The complete existing comparison feature as Quick Compare

### Quick Compare invariants

Quick Compare retains:

- original and reference/suggestion uploads
- PDF upload and page choice
- automatic and manual alignment
- horizontal and vertical position, scale, and rotation
- opacity control
- pan and pinch zoom
- tap or press-and-hold to show the original
- fullscreen with the exact current transform and opacity state
- image export/download
- iPhone-safe gestures without text selection, image dragging, or the Safari long-press menu inside the canvas workspace

### Explicitly outside the MVP

- Live augmented-reality drawing guidance
- A public social feed or public profiles
- Payments and subscriptions
- Unlimited free-form chat as the primary interaction
- Support for every art medium
- Automatic full-artwork makeovers
- A dependency on Jev
- Native iOS applications

## 5. Main user flow

1. **Start:** Create a project from the camera, photo library, or a PDF page.
2. **Check capture:** Crop, detect four corners, correct perspective, and flag blur, glare, or an unusable angle.
3. **Set context:** Select material, available tools, and the desired outcome; optionally add a reference.
4. **Consent and analyze:** Show which images will be transmitted. Send them only after the user explicitly starts analysis.
5. **Choose:** Present three comparable improvement candidates.
6. **Preview:** The user chooses one candidate, a change boundary, and any protected regions. Generate one bounded change layer.
7. **Validate:** Browser-side imaging rejects or flags changes outside the permitted mask.
8. **Execute:** Show one physical action at a time, including material, color, pressure, direction, and approximate duration.
9. **Check:** Capture the result and align it with the prior checkpoint using the comparison engine.
10. **Continue or finish:** Save a checkpoint, repeat with another suggestion, export, or stop.

Quick Compare is independently reachable from the start screen and does not require the guided project flow.

## 6. Mobile UX

### Start screen

- `New project` is the dominant action.
- `Quick compare` opens the existing non-AI workflow.
- Recent projects appear below the actions.
- Synchronization state is visible but visually secondary.
- There is no tool wall and no generic chat box.

### Guided project stages

The project is a single reversible flow:

1. Capture
2. Straighten
3. Describe
4. Ideas
5. Preview
6. Execute
7. Check

Progress is visible without behaving like a rigid form. Drafts save locally after every meaningful change.

### Preview view

- The artwork receives the largest available viewport.
- A tap temporarily shows the original; press-and-hold keeps it visible.
- The opacity control remains directly below the image.
- Fullscreen preserves the exact mask, transform, zoom, and opacity.
- `Show changes only` isolates the transparent change layer.
- Protected regions can be painted and erased with a finger.
- The default preview favors physical feasibility over an idealized render.

### Execution mode

Each step card contains:

- tool and material
- color or mix
- pressure or water load where relevant
- stroke direction and placement
- approximate duration
- optional magnified detail crop

Primary actions are `Done`, `Skip`, `Too risky`, and `Show another way`. The generated plan works offline after it has been received.

### iPhone and Safari requirements

- Safe-area-aware layout and comfortable one-handed controls
- Touch targets of at least 44 points
- Dynamic Type, reduced-motion support, meaningful labels, and keyboard operation where applicable
- No selection, image dragging, or disruptive context menu inside the image workspace
- Normal browser and accessibility behavior remains intact outside that workspace
- Image gestures do not accidentally zoom or scroll the page
- Camera and file permissions are requested only in context and with a short explanation

## 7. Automated painted previews

Canvas alone cannot create a convincing new artistic intervention. NextStroke therefore uses a hybrid pipeline:

1. A vision-capable model returns a structured diagnosis and three proposals.
2. After the user selects a proposal, the system derives a narrowly scoped edit request and allowed mask.
3. An image-editing model renders the material-aware intervention within that region.
4. The imaging package extracts or reconstructs a transparent change layer.
5. Canvas applies alignment, transforms, compositing, opacity, protected-region overlays, and comparison.
6. A local difference validator checks the rendered result against the original and the allowed mask.
7. A violating preview is rejected or clearly marked uncertain; it is never silently presented as valid.

For example, a lighthouse-lamp improvement may contain a white-yellow core, a soft warm halo, and an optional transparent beam. The existing black lamp grid is protected and must survive unchanged.

The `Careful`, `Balanced`, and `Bold` control changes permitted area, contrast, step count, and execution risk. It is not presented as an opaque AI creativity or intelligence slider.

## 8. Data model

### Core entities

- `Project`: title, material profile, goal, available tools, local ID, optional synchronized ID
- `Capture`: immutable source asset, normalized view, capture time, crop, and perspective transform
- `Reference`: optional reference image or selected PDF page
- `SuggestionSet`: model provenance and exactly three structured candidates
- `Suggestion`: effect, difficulty, risk, materials, explanation, and target region
- `ChangePlan`: selected suggestion and ordered physical steps
- `PreviewLayer`: rendered change asset, allowed mask, protected mask, transform, and validation result
- `Checkpoint`: immutable later capture linked to a prior project state
- `Feedback`: optional one-tap usefulness, feasibility, and result-similarity signals

All AI and API payloads are validated against versioned schemas in `packages/contracts`. Original captures and checkpoints are immutable; derived files may be regenerated or deleted.

## 9. AI and safety rules

1. Never overwrite an original capture.
2. Do not transmit an image until the user explicitly starts analysis or preview generation.
3. Show which assets are about to be sent.
4. Keep analysis, preview generation, and comparison as separate user-controlled actions.
5. Generate structured suggestions before any image edit.
6. Generate a preview only for the selected suggestion.
7. Require an allowed mask and support protected masks.
8. Measure change outside the allowed mask and inside protected regions.
9. Reject previews that violate configured thresholds.
10. Record provider/model/version and validation outcomes without logging image content.
11. Keep provider adapters interchangeable; the domain model must not depend on one provider's response format.
12. Present previews as guidance, not as a guaranteed physical simulation.

Jev is deferred. It may later become a typed, explainable layer for ranking suggestions, modeling risk, or routing uncertainty. It must not become the vision engine or the central product concept.

## 10. Privacy, storage, and deletion

- IndexedDB is the primary store for local projects and assets.
- During beta, invited users authenticate to access the deployment.
- Cloud synchronization is disabled by default for each new project and can be enabled per project.
- Local-only projects and Quick Compare remain technically independent of cloud storage.
- Product events contain action types and outcomes, not image content, personal prompt text, or full filenames.
- Secrets remain server-side.
- Deleting a project removes synchronized project images and derived previews, subject only to documented backup-retention limits.
- The public release opens local mode without an account; authentication becomes optional for synchronization and device transfer.

## 11. Technical architecture

The implementation is a TypeScript monorepo:

```text
apps/web              iPhone-first PWA and UI
apps/api              authentication, synchronization, and AI orchestration
packages/compare      framework-independent overlay and alignment engine
packages/imaging      crop, perspective, masks, normalization, and validation
packages/contracts    shared versioned schemas and domain types
packages/ai           provider-neutral analysis and image-edit adapters
packages/ui           shared accessible interface primitives
docs/                 product, architecture, privacy, roadmap, and decisions
tests/fixtures         synthetic and licensed deterministic fixtures
```

### Web client

- React and TypeScript PWA
- Browser-native Canvas and image processing
- IndexedDB-first persistence
- Service worker for the shell, saved plans, and Quick Compare
- No AI provider key in the client

### API

- Cloudflare-compatible Worker architecture
- Invite-only beta access
- Authentication, sync metadata, optional asset storage, rate limits, and AI orchestration
- Server-side model credentials and provider adapters

### Offline behavior

Available offline after first load:

- Quick Compare
- local projects and captures
- cached execution plans
- alignment, masks, validation, and export

Requires a network connection:

- login refresh when the session expires
- new AI analysis
- new preview generation
- synchronization

## 12. Failure handling

- Blurry, reflective, or highly skewed input produces a concrete recapture instruction.
- Uncertain subject detection asks the user to mark the target area.
- A preview that changes a protected region is automatically rejected and may be retried with a stricter request.
- If AI is unavailable, the project and Quick Compare continue to work and analysis can be retried later.
- A sync conflict preserves both versions and never silently overwrites either.
- Export failure leaves the full local project intact.
- Interrupted uploads and analyses are resumable or safely restartable without duplicate project state.

## 13. Repository governance

The public repository uses AGPL-3.0 and initially targets `jonasyr/nextstroke`.

```text
apps/
packages/
docs/
  product/
  architecture/
  privacy/
  decisions/
  roadmap/
  superpowers/specs/
tests/fixtures/
AGENTS.md
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md
LICENSE
README.md
```

### Required `AGENTS.md` invariants

- Never overwrite an original image.
- Never upload without an explicit and visible user action.
- Treat every AI edit as a separate masked layer.
- Detect material changes outside the allowed mask.
- Keep `packages/compare` and `packages/imaging` independent of React and model providers.
- Define shared data structures only in `packages/contracts`.
- Treat iPhone Safari as a required target.
- Implement loading, empty, error, cancellation, and offline states for every user-visible async feature.
- Keep keys, personal images, and real user data out of source, fixtures, and logs.
- Run the relevant tests, type checking, linting, and build before declaring a change complete.

### Documentation

- Product promise, current status, screenshots, and local setup
- Product scope and non-goals
- Versioned roadmap
- Architecture and data-flow documentation
- Threat model for images, accounts, providers, and exports
- Privacy and deletion design
- Architecture Decision Records
- Provider and storage migration guides
- Contribution and security-reporting guidance

### Continuous integration

- Formatting, lint, TypeScript, tests, and production build
- Unit tests for transforms, masks, contracts, and validators
- Visual regression tests using synthetic fixtures
- Browser flow: upload, mocked analysis, preview, compare, checkpoint, export
- WebKit execution as the closest automated Safari check
- Accessibility checks
- Secret, dependency, and license scanning
- Deterministic mocks rather than live paid AI calls in pull requests
- Deployment only from protected successful builds

## 14. Roadmap

### `v0.1` — private beta

Deliver the complete scoped flow described in Sections 4–12 for invited testers.

### `v0.2` — learning release

- Stronger material-specific guidance and calibration cards
- One-tap feasibility, usefulness, and similarity feedback
- Project-state restoration
- Several preview variants for the same selected idea
- Better automatic masks and protected regions
- Installable offline help
- Anonymous opt-in quality metrics

### `v1.0` — public release

- Local mode without an account
- Optional account for synchronization and device transfer
- Stabilized model and provider selection
- Full accessibility and Safari compatibility matrix
- Private project-link or instruction-sheet sharing
- Public privacy, limitation, and deletion documentation
- Production cost limits and abuse protection

### Later, only after validated demand

- Live camera or AR execution guidance
- Acrylic, marker, charcoal, and other material profiles
- Jev-based typed ranking and risk decisions
- Personal material library
- Teacher and workshop mode
- Optional community features that do not displace the core workflow

## 15. Private-beta success gates

| Area | Gate |
| --- | --- |
| Core flow | At least 70% of started analyses reach a saved execution plan |
| Comprehension | At least 80% of testers understand the next physical action without outside help |
| Usefulness | At least 70% find one or more of the three suggestions useful and feasible |
| Protected regions | No accepted preview exceeds the defined pixel-change tolerance inside a protected region |
| Mask adherence | At least 99% of material preview changes fall within the allowed mask |
| Speed | Median under 20 seconds to suggestions and under 45 seconds to a preview on a normal connection |
| Stability | At least 99% crash-free sessions and 98% success for upload, save, and export |
| Privacy | Zero silent image uploads; every transmission maps to a recorded user action |
| Safari | The full core flow works on the current and previous major iOS versions |
| Evidence | At least 10 beta participants and 30 completed projects before the `v1.0` decision |

These gates are decision inputs, not public marketing promises. Product analytics store event names and outcomes only. Optional one-tap feedback supplies the qualitative measures.

## 16. Naming and accepted risks

The chosen product and repository name is **NextStroke**. The name has unrelated existing uses, including a rowing service and an unrelated GitHub repository. The GitHub namespace `jonasyr/nextstroke` remains technically distinct. The owner accepts the discovery and potential trademark/brand-confusion risk for the MVP; a formal trademark and domain review is required before significant public marketing or paid launch.

Other accepted MVP limitations:

- A rendered preview cannot guarantee the exact result of physical pigments, paper, lighting, or skill.
- WebKit automation cannot replace periodic tests on real iPhones.
- Local pixel thresholds reduce unexpected changes but cannot prove artistic equivalence.
- Supporting three material families requires conservative instructions rather than exhaustive medium simulation.

## 17. Implementation decisions deferred to the plan

The implementation plan may select specific libraries and service providers, provided it preserves this design. It must document:

- package manager and monorepo tooling
- exact React/PWA stack
- authentication and invite mechanism
- database and object storage provider
- primary and fallback analysis/image-edit providers
- schema-validation library
- local imaging implementation and thresholds
- deployment targets and environments
- observability without image-content logging
- initial synthetic fixtures and device/browser test matrix

Any change to the product boundary, privacy defaults, immutable-original rule, masked-layer architecture, or iPhone-first requirement requires an explicit design amendment rather than an incidental implementation choice.

## 18. Documentation and decision provenance

NextStroke treats product reasoning as a maintained artifact rather than context that exists only in chat history.

- `docs/README.md` is the canonical documentation index and reading order for humans and AI agents.
- `docs/product/origin-and-evolution.md` records the original Fineliner Lupe, the user problem it solved, its retained capabilities, and why the scope evolved.
- `docs/decisions/decision-log.md` records every known product decision with date, selected option, alternatives, rationale, consequences, and reconsideration trigger.
- `docs/decisions/README.md` defines when to append to the decision log and when a full Architecture Decision Record is required.
- `docs/superpowers/specs/` contains approved design intent.
- `docs/superpowers/plans/` contains executable implementation order and test gates.

`README.md` and `AGENTS.md` must link to `docs/README.md`. Agents must read the documentation index, approved spec, active phase plan, and relevant ADRs before changing product boundaries or architecture. New decisions must be documented in the same pull request as the change; they may not be left only in an issue, commit message, or model conversation.
