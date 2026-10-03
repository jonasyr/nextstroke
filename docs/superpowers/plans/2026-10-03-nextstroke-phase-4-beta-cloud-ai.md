# NextStroke Phase 4 Beta Cloud and AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy an invite-only beta with authenticated opt-in sync, structured three-suggestion analysis, bounded image-edit previews, deletion, and privacy-preserving product metrics.

**Architecture:** A Hono Cloudflare Worker validates Cloudflare Access identity, stores metadata in D1 and opt-in assets in R2, and calls provider-neutral AI ports implemented initially with OpenAI. Local-only analysis assets transit the Worker without entering project storage. The browser remains the authority for masked-layer extraction and preview validation.

**Tech Stack:** Hono, Cloudflare Workers, Cloudflare Access, D1, R2, Zod, OpenAI server SDK, Web Crypto/JWT verification, Vitest with Miniflare/Workers test pool, Playwright with mock and staging projects.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Global Constraints

- Beta requests require a valid invited Cloudflare Access identity.
- Never trust a client-supplied owner ID; derive ownership from validated identity.
- Cloud sync is off by default and activated separately for each project.
- An analysis or preview request identifies every transmitted asset in a visible client confirmation.
- Local-only analysis/preview image bytes are not written to D1, R2, logs, analytics, or caches.
- Model IDs and credentials are deployment configuration; domain types remain provider-neutral.
- Analysis must validate to exactly three suggestions before the client receives it.
- A server-generated preview is not accepted until browser-side validation passes.
- Pull-request tests use deterministic fake providers and never spend provider credits.
- Provider, auth, storage, privacy, or retention decisions update docs/ADRs in the same pull request.

## Review Focus

1. Missing, malformed, expired, wrong-audience, or wrong-issuer Access JWTs must fail closed without disclosing application data; Task 1 tests them.
2. Duplicate upload, interrupted stream, stale revision, retry after timeout, and cross-user asset ID must preserve ownership and data; Task 2 tests them.
3. Provider timeout, refusal, malformed JSON, two/four suggestions, or unsafe full-redraw advice must yield a safe retryable error; Task 3 tests them.
4. A model edit outside the allowed mask or on a protected pixel must be rejected client-side even if the server labels it successful; Task 4 tests it.
5. Deletion retry, partial R2 failure, analytics opt-out, and log inspection must not leave accessible content or emit image-derived data; Task 5 tests them.

---

### Task 1: Add Cloudflare bindings, database migrations, and beta identity

**Files:**
- Create: `apps/api/migrations/0001_initial.sql`
- Create: `apps/api/src/auth/Identity.ts`
- Create: `apps/api/src/auth/AccessJwtVerifier.ts`
- Create: `apps/api/src/auth/DevIdentityProvider.ts`
- Create: `apps/api/src/middleware/requireIdentity.ts`
- Create: `apps/api/src/db/D1ProjectStore.ts`
- Create: `apps/api/test/auth.test.ts`
- Create: `apps/api/test/migrations.test.ts`
- Modify: `apps/api/src/env.ts`
- Modify: `apps/api/src/app.ts`
- Modify: `apps/api/wrangler.jsonc`
- Create: `docs/decisions/0002-cloudflare-beta-platform.md`

**Interfaces:**
- Consumes: Phase 1 API error contract and project schemas.
- Produces: `Identity { subject: string; email?: string }`; `IdentityProvider.verify(request): Promise<Identity>`; request context `identity`; D1 tables for projects, asset metadata, analyses, previews, idempotency, deletion jobs, and metric events.

- [ ] **Step 1: Write failing migration and identity tests**

Assert migration applies to an empty D1 database and creates foreign keys/indexes; valid Access JWT maps `sub` to identity; missing, expired, wrong `aud`, wrong `iss`, unknown `kid`, and invalid signature return `401`; a valid identity cannot request another subject's project; safe error bodies contain request ID but no token or claims.

- [ ] **Step 2: Run tests and confirm missing auth fails**

Run: `pnpm --filter @nextstroke/api test -- auth migrations`  
Expected: FAIL because verifier and migration are absent.

- [ ] **Step 3: Implement identity verification and D1 schema**

Verify `Cf-Access-Jwt-Assertion` against cached Access JWKS with issuer and audience checks. The development provider is enabled only by explicit local configuration and injects a fixed synthetic subject. Persist subject, not an authorization cookie or JWT.

- [ ] **Step 4: Protect API routes and verify fail-closed behavior**

Leave `/api/v1/health` public and protect all project/analysis routes. Missing required D1/R2/Access bindings must produce named startup configuration errors.

Run: `pnpm --filter @nextstroke/api test -- auth migrations && pnpm --filter @nextstroke/api typecheck`  
Expected: PASS.

- [ ] **Step 5: Document the platform decision and commit**

The ADR records Workers, Access, D1, R2, rejected alternatives, consequences, local-development auth, and the trigger for replacing beta Access with public optional accounts.

```bash
git add apps/api docs/decisions/0002-cloudflare-beta-platform.md
git commit -m "feat: add beta identity and cloud persistence"
```

### Task 2: Implement per-project opt-in synchronization and conflict preservation

**Files:**
- Create: `apps/api/src/routes/projects.ts`
- Create: `apps/api/src/routes/assets.ts`
- Create: `apps/api/src/storage/R2AssetStore.ts`
- Create: `apps/api/src/sync/idempotency.ts`
- Create: `apps/api/test/projectSync.test.ts`
- Create: `apps/api/test/assetStore.test.ts`
- Create: `apps/web/src/services/sync/SyncClient.ts`
- Create: `apps/web/src/services/sync/HttpSyncClient.ts`
- Create: `apps/web/src/services/sync/syncProject.ts`
- Create: `apps/web/src/services/sync/syncProject.test.ts`
- Create: `apps/web/src/features/projects/ProjectSyncControl.tsx`
- Create: `apps/web/src/features/projects/SyncConflictDialog.tsx`
- Modify: `packages/contracts/src/api.ts`
- Create: `docs/architecture/synchronization.md`

**Interfaces:**
- Consumes: authenticated identity, local project repositories, strict contracts.
- Produces: `PUT /api/v1/projects/:id` with `If-Match` revision; `GET /api/v1/projects/:id`; `DELETE /api/v1/projects/:id`; `PUT/GET /api/v1/projects/:projectId/assets/:assetId`; `SyncClient`; `syncProject(projectId): Promise<SyncOutcome>` where outcome is `synced | conflict | offline | failed`.

- [ ] **Step 1: Write failing API sync tests**

Assert first PUT creates revision `1`; matching `If-Match` increments; stale revision returns `409` with the current server record; repeated idempotency key returns the original response; cross-user IDs return `404`; oversized or wrong-MIME assets fail before R2 commit; interrupted upload leaves no readable final object; R2 key is `subjects/{subject}/projects/{projectId}/{assetId}`.

- [ ] **Step 2: Write failing client conflict tests**

Assert sync does nothing while `syncEnabled === false`; enabling shows the exact assets to upload; conflict creates a local conflict copy with a new ID and keeps both local and server versions; retry uses the same idempotency key; offline enqueues without losing edits.

- [ ] **Step 3: Run tests and confirm sync services fail**

Run: `pnpm --filter @nextstroke/api test -- projectSync assetStore && pnpm --filter @nextstroke/web test -- syncProject`  
Expected: FAIL because endpoints and clients are absent.

- [ ] **Step 4: Implement stores, endpoints, queue, and controls**

Derive ownership exclusively from request identity. Upload metadata to D1 only after R2 write succeeds; use temporary object keys for streaming upload and promote only after validation. UI shows `Local only`, `Syncing`, `Synced`, `Conflict`, or `Offline queued`.

- [ ] **Step 5: Verify conflict and ownership behavior**

Run: `pnpm --filter @nextstroke/api test -- projectSync assetStore && pnpm --filter @nextstroke/web test -- syncProject`  
Expected: PASS, including interrupted upload and cross-user probes.

- [ ] **Step 6: Document and commit**

```bash
git add apps/api apps/web/src/services/sync apps/web/src/features/projects packages/contracts docs/architecture/synchronization.md
git commit -m "feat: add opt-in project synchronization"
```

### Task 3: Integrate structured three-suggestion analysis

**Files:**
- Create: `packages/ai/tsconfig.json`
- Create: `packages/ai/src/analysis/AnalysisProvider.ts`
- Create: `packages/ai/src/analysis/OpenAIAnalysisProvider.ts`
- Create: `packages/ai/src/analysis/analysisPrompt.ts`
- Create: `packages/ai/src/errors.ts`
- Create: `packages/ai/src/index.ts`
- Create: `packages/ai/test/OpenAIAnalysisProvider.test.ts`
- Create: `apps/api/src/routes/analysis.ts`
- Create: `apps/api/src/services/runAnalysis.ts`
- Create: `apps/api/test/analysisRoute.test.ts`
- Create: `apps/web/src/services/analysis/HttpAnalysisClient.ts`
- Create: `apps/web/src/services/analysis/HttpAnalysisClient.test.ts`
- Modify: `apps/web/src/features/project/ideas/IdeasStep.tsx`
- Create: `docs/decisions/0003-provider-neutral-ai.md`

**Interfaces:**
- Consumes: material/tool/project context, corrected artwork bytes, optional reference bytes, `SuggestionSetSchema`.
- Produces: `AnalysisProvider.analyze(input, signal): Promise<SuggestionSet>`; `POST /api/v1/analyses` multipart endpoint; error codes `PROVIDER_TIMEOUT`, `PROVIDER_REFUSAL`, `INVALID_PROVIDER_OUTPUT`, `RATE_LIMITED`, `REQUEST_TOO_LARGE`.

- [ ] **Step 1: Write failing provider and route tests**

Fake provider responses cover exactly three valid suggestions, two/four suggestions, unknown material, missing physical steps, full-redraw advice, timeout, refusal, and invalid JSON. Route tests assert explicit multipart fields, optional reference, normalized image byte limits, no request-body logging, identity rate limit, cancellation, and a response validated by `SuggestionSetSchema`.

- [ ] **Step 2: Run tests and confirm missing provider fails**

Run: `pnpm --filter @nextstroke/ai test && pnpm --filter @nextstroke/api test -- analysisRoute`  
Expected: FAIL because the port, adapter, and route are absent.

- [ ] **Step 3: Implement the provider-neutral port and initial OpenAI adapter**

Use the server SDK and a vision-capable Responses API model named by `OPENAI_ANALYSIS_MODEL`. Request structured output matching the versioned schema. Prompt rules require additions rather than full redraws, material feasibility, beginner language, explicit risk, and exactly three distinct candidates. Validate again after provider response; do not repair silently malformed output into a valid-looking result.

- [ ] **Step 4: Implement route and browser client with transmission confirmation**

For a local-only project, artwork/reference bytes transit the Worker and are not stored. For a synced project, the server may load owner-authorized R2 assets. The UI confirmation lists every transmitted asset and does not reuse earlier consent for a new analysis.

- [ ] **Step 5: Verify deterministic tests and adapter boundaries**

Run: `pnpm --filter @nextstroke/ai test && pnpm --filter @nextstroke/api test -- analysisRoute && pnpm --filter @nextstroke/web test -- HttpAnalysisClient`  
Expected: PASS with zero network calls in tests.

- [ ] **Step 6: Document and commit**

The ADR records provider neutrality, environment-selected model IDs, no prompt/image logging, output validation, and provider replacement triggers.

```bash
git add packages/ai apps/api apps/web/src/services/analysis apps/web/src/features/project/ideas docs/decisions/0003-provider-neutral-ai.md
git commit -m "feat: add structured artwork analysis"
```

### Task 4: Integrate bounded image-edit previews and enforce client validation

**Files:**
- Create: `packages/ai/src/preview/PreviewProvider.ts`
- Create: `packages/ai/src/preview/OpenAIPreviewProvider.ts`
- Create: `packages/ai/src/preview/previewPrompt.ts`
- Create: `packages/ai/test/OpenAIPreviewProvider.test.ts`
- Create: `apps/api/src/routes/previews.ts`
- Create: `apps/api/src/services/runPreview.ts`
- Create: `apps/api/test/previewRoute.test.ts`
- Create: `apps/web/src/services/preview/HttpPreviewClient.ts`
- Create: `apps/web/src/services/preview/acceptGeneratedPreview.ts`
- Create: `apps/web/src/services/preview/acceptGeneratedPreview.test.ts`
- Modify: `apps/web/src/features/project/preview/PreviewStep.tsx`
- Create: `apps/web/e2e/remote-preview-safety.spec.ts`

**Interfaces:**
- Consumes: corrected artwork, selected suggestion, boundary, allowed mask, protected mask, material profile.
- Produces: `PreviewProvider.generate(input, signal): Promise<GeneratedComposite>`; `POST /api/v1/previews`; `acceptGeneratedPreview(input): Promise<PreviewLayer>` that is the only path that may persist an active accepted preview.

- [ ] **Step 1: Write failing provider and route tests**

Assert prompt and request contain the selected suggestion only, material, boundary, allowed mask, and “preserve all unmasked content”; omit unrelated alternatives; reject empty masks, dimension mismatch, excessive input, provider timeout, and unsupported output MIME. Confirm server success does not claim local validation success.

- [ ] **Step 2: Write failing acceptance-gate tests**

Assert accepted provider output is converted to a separate transparent layer; valid fixture persists layer plus validation metrics; the lamp-grid violation, outside-mask ratio over `0.01`, protected changed pixel, stale mask revision, or stale source capture cannot persist; a retry retains the previous accepted layer until replacement passes.

- [ ] **Step 3: Run tests and confirm preview path fails**

Run: `pnpm --filter @nextstroke/ai test -- OpenAIPreviewProvider && pnpm --filter @nextstroke/api test -- previewRoute && pnpm --filter @nextstroke/web test -- acceptGeneratedPreview`  
Expected: FAIL because provider and acceptance gate are absent.

- [ ] **Step 4: Implement image-edit adapter and API route**

Use the OpenAI image-edit API with model from `OPENAI_IMAGE_MODEL`. The Worker returns the generated composite plus provider metadata; it does not mark it accepted. Local-only image bytes are not placed in R2. Bound request duration and output bytes.

- [ ] **Step 5: Implement the single browser acceptance gate**

Compute the difference layer, run Phase 3 validation, and persist only `accepted` output tied to exact source and mask revisions. Rejected output shows specific, non-technical reasons and permits a stricter retry. No component writes active preview records directly.

- [ ] **Step 6: Verify safety and commit**

Run: `pnpm --filter @nextstroke/ai test -- OpenAIPreviewProvider && pnpm --filter @nextstroke/api test -- previewRoute && pnpm --filter @nextstroke/web test -- acceptGeneratedPreview && pnpm --filter @nextstroke/web exec playwright test e2e/remote-preview-safety.spec.ts --project=webkit`  
Expected: PASS; violation fixtures never become active previews.

```bash
git add packages/ai apps/api apps/web
git commit -m "feat: add validated AI preview pipeline"
```

### Task 5: Add deletion, privacy-safe metrics, deployment, and beta acceptance

**Files:**
- Create: `packages/contracts/src/metrics.ts`
- Create: `apps/api/src/routes/metrics.ts`
- Create: `apps/api/src/routes/deletion.ts`
- Create: `apps/api/src/services/deleteProject.ts`
- Create: `apps/api/test/metrics.test.ts`
- Create: `apps/api/test/deletion.test.ts`
- Create: `apps/web/src/services/metrics/ProductMetrics.ts`
- Create: `apps/web/src/services/metrics/HttpProductMetrics.ts`
- Create: `apps/web/src/services/metrics/ProductMetrics.test.ts`
- Create: `apps/web/src/features/settings/PrivacySettings.tsx`
- Create: `apps/web/e2e/beta-happy-path.spec.ts`
- Create: `apps/web/e2e/beta-auth-failure.spec.ts`
- Create: `.github/workflows/deploy-preview.yml`
- Create: `.github/workflows/deploy-production.yml`
- Create: `docs/privacy/threat-model.md`
- Create: `docs/privacy/deletion-and-retention.md`
- Create: `docs/operations/beta-runbook.md`
- Create: `docs/testing/beta-acceptance.md`
- Modify: `.env.example`
- Modify: `docs/README.md`

**Interfaces:**
- Consumes: authenticated stores, sync, analysis, preview, local feedback.
- Produces: allowlisted metric events; `DELETE /api/v1/projects/:id`; idempotent deletion service; preview/production deployment workflows; beta runbook.

- [ ] **Step 1: Write failing metric privacy tests**

Allow only event names and coarse fields needed for approved gates: flow started/completed, suggestion helpful/feasible, validation accepted/rejected with numeric counts, timing bucket, operation success/failure, browser family, and iOS major. Reject arbitrary strings, filenames, prompts, image dimensions precise enough to fingerprint, image-derived labels, and unknown properties. Opt-out disables transmission.

- [ ] **Step 2: Write failing deletion tests**

Assert deletion removes all owner project metadata, R2 objects, derived previews, and related metric linkage; is idempotent; cannot delete another subject's project; retries partial R2 failures from a deletion job; hides the project immediately from reads while cleanup retries.

- [ ] **Step 3: Run tests and confirm services fail**

Run: `pnpm --filter @nextstroke/api test -- metrics deletion && pnpm --filter @nextstroke/web test -- ProductMetrics`  
Expected: FAIL because metrics and deletion are absent.

- [ ] **Step 4: Implement metrics, privacy controls, and deletion**

Use strict schemas and an event allowlist. Do not include artwork or free text. Expose clear local analytics opt-out and a project deletion summary. Document backup retention if the selected Cloudflare plan introduces it; do not claim immediate physical backup erasure when the provider cannot guarantee it.

- [ ] **Step 5: Add guarded deployments and beta runbook**

Preview deploy requires successful CI and uses synthetic development identity/fake providers unless a maintainer explicitly selects staging. Production deploy requires protected environment approval and configured Access, D1, R2, `OPENAI_API_KEY`, `OPENAI_ANALYSIS_MODEL`, and `OPENAI_IMAGE_MODEL`. Document invite addition/removal, rate-limit shutdown, provider disable switch, incident response, deletion retry, and cost alerts.

- [ ] **Step 6: Run complete mocked beta acceptance**

Run: `pnpm check && pnpm build && pnpm --filter @nextstroke/web exec playwright test e2e/beta-happy-path.spec.ts e2e/beta-auth-failure.spec.ts e2e/remote-preview-safety.spec.ts --project=chromium --project=webkit`  
Expected: PASS without live provider calls.

- [ ] **Step 7: Run explicit staging smoke tests**

Only after the owner supplies/configures Cloudflare and provider credentials, run one consented synthetic-artwork analysis and one preview in staging. Verify Access rejection, no image body in Worker logs, opt-in sync, conflict copy, deletion, and R2/D1 cleanup. Record only request IDs, timing, outcome, and synthetic fixture name in `docs/testing/beta-acceptance.md`.

- [ ] **Step 8: Document and commit**

```bash
git add packages/contracts apps/api apps/web .github .env.example docs
git commit -m "feat: complete private beta operations"
```

## Phase 4 final review

- [ ] Map every private-beta success gate to a metric query, test, or manual procedure.
- [ ] Confirm live-provider and deploy workflows cannot run on an untrusted pull request.
- [ ] Inspect logs for the synthetic staging run and confirm no body, prompt, filename, or image content.
- [ ] Delete the staging project and verify both D1 and R2 cleanup.
- [ ] Complete real-iPhone current/previous-iOS smoke testing against the Access-gated deployment.
- [ ] Tag the merge commit `v0.1.0-beta.1` only after owner approval.

