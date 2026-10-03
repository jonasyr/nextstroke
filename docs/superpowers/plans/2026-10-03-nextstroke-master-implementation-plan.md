# NextStroke Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the invite-only NextStroke private beta through four independently testable implementation phases.

**Architecture:** Build a TypeScript monorepo whose local-first PWA owns image data, comparison, masks, and validation while a Cloudflare Worker owns beta authorization, opt-in synchronization, and provider-neutral AI orchestration. Each phase produces a usable vertical increment and freezes interfaces consumed by later phases.

**Tech Stack:** Node.js 24 LTS, pnpm 12, TypeScript, React, Vite, Dexie/IndexedDB, Zod, Canvas 2D, PDF.js, Vitest, Testing Library, Playwright, Hono, Cloudflare Workers, D1, R2, Cloudflare Access, OpenAI server-side adapters.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Global Constraints

- The target repository is public at `jonasyr/nextstroke` under AGPL-3.0.
- The deployed `v0.1` is an invite-only beta; cloud synchronization is off by default per project.
- Original captures and checkpoints are immutable.
- No image may leave the browser without an explicit, visible user action.
- AI edits are separate masked layers; protected-region violations reject the preview.
- Quick Compare must function locally without AI, an account, or a network connection.
- iPhone Safari is a required platform; support the current and previous major iOS versions.
- The MVP material profiles are fineliner, colored pencil, and watercolor.
- AI model identifiers are environment configuration, never hard-coded domain assumptions.
- No real personal image, API key, beta email list, or image content in source, fixtures, analytics, or logs.
- Use synthetic or explicitly licensed image fixtures only.
- All user-visible asynchronous work needs loading, cancellation, error, and offline states.
- Every behavior or architecture decision must update the canonical documentation index and decision record in the same change.

## Review Focus

1. A rotated HEIC/JPEG, a transparent PNG, a large image, or a multi-page PDF must import without orientation loss or an unbounded memory spike; Phase 2 Task 1 owns these tests.
2. A two-finger gesture interrupted by a third pointer, browser blur, or fullscreen exit must leave transforms finite and pointer captures released; Phase 2 Task 3 owns these tests.
3. IndexedDB eviction, quota failure, or a failed migration must preserve the current in-memory edit and show a recoverable state; Phase 3 Task 1 owns these tests.
4. A generated preview that changes a protected pixel or exceeds the outside-mask threshold must never enter the accepted project state; Phase 3 Task 4 and Phase 4 Task 4 own these tests.
5. Expired beta identity, interrupted asset upload, duplicate retry, or sync conflict must not expose another user's project or silently overwrite either version; Phase 4 Tasks 1–3 own these tests.

---

## Plan set and dependency order

| Phase | Plan | Independently testable outcome | Depends on |
| --- | --- | --- | --- |
| 1 | `2026-10-03-nextstroke-phase-1-foundation.md` | Public-ready monorepo, governance, contracts, web/API smoke path, CI | Approved design |
| 2 | `2026-10-03-nextstroke-phase-2-quick-compare.md` | Offline-capable Quick Compare with upload, PDF, alignment, gestures, fullscreen, and export | Phase 1 |
| 3 | `2026-10-03-nextstroke-phase-3-guided-project.md` | Fully navigable local project workflow using deterministic suggestion/preview fixtures | Phases 1–2 |
| 4 | `2026-10-03-nextstroke-phase-4-beta-cloud-ai.md` | Invite-only deployment, opt-in sync, analysis, bounded image preview, deletion, and telemetry | Phases 1–3 |

Do not begin a later phase until the previous phase's exit gate is green and committed. Changes to immutable originals, explicit upload consent, masked-layer previews, local-first behavior, or iPhone-first support require a spec amendment.

## Cross-phase interface ownership

| Interface | Owner | Consumers |
| --- | --- | --- |
| Domain schemas and IDs | Phase 1 `packages/contracts` | All packages and apps |
| Canvas transforms and comparison state | Phase 2 `packages/compare` | Quick Compare and project check view |
| Decoding, perspective, masks, and validation | Phases 2–3 `packages/imaging` | Web UI and AI preview acceptance |
| Local repositories and sync queue | Phase 3 `apps/web/src/db` | Guided UI and cloud sync |
| API client protocol | Phase 1 contract, Phase 4 implementation | Web and Worker |
| Analysis and image-edit provider ports | Phase 4 `packages/ai` | Worker orchestration only |

## Context preservation

- `docs/README.md` is the canonical map and authority order for all humans and agents.
- `docs/product/origin-and-evolution.md` explains the Fineliner Lupe starting point and why the product expanded.
- `docs/decisions/decision-log.md` preserves each known selected and rejected option.
- Root `README.md` and `AGENTS.md` must direct workers to the documentation index before implementation.
- A future decision that changes scope, privacy, architecture, providers, or roadmap is documented in the same commit or pull request as the change.

## Release gates

### Phase 1 exit

- `pnpm check` and `pnpm test` pass from a fresh clone.
- Web and Worker development servers start with documented commands.
- Contract schemas reject malformed versioned payloads.
- Repository governance and security documents are present.

### Phase 2 exit

- The existing Fineliner Lupe feature set is reproduced from clean, testable modules rather than copied as one minified file.
- Quick Compare passes Chromium and WebKit end-to-end tests.
- A real iPhone smoke checklist is documented and manually completed before merge.
- The comparison workflow works after network disconnection.

### Phase 3 exit

- A user can complete Capture → Straighten → Describe → Ideas → Preview → Execute → Check entirely with local fixtures.
- Reloading at every stage restores the same project state.
- Protected-mask and preview-validation failures cannot be accepted.
- Project deletion removes all related local blobs.

### Phase 4 exit

- Cloudflare Access restricts the deployed beta to invited identities.
- Sync is opt-in per project and conflicts preserve both versions.
- AI analysis returns exactly three validated suggestions.
- Preview generation creates a separate validated layer and rejects protected-region violations.
- Deletion removes D1 metadata and R2 objects.
- No live AI call runs in pull-request CI.

## GitHub publication sequence

1. Complete and approve all four plan documents locally.
2. Create the public GitHub repository `jonasyr/nextstroke` with no generated starter files.
3. Add `origin`, verify the owner and repository visibility, then push the existing `main` history containing the approved spec and plans.
4. Execute Phase 1 on a feature branch or isolated worktree.
5. Require CI before merging each phase to `main`.
6. Configure Cloudflare and AI secrets only after Phase 4's code path exists; never commit secret values.

## Whole-MVP verification

Run from repository root:

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright test --project=chromium --project=webkit
```

Expected: every command exits `0`; live-provider tests remain skipped unless an explicit local opt-in flag and non-production test project are present.
