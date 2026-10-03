# NextStroke Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the public-ready monorepo, frozen domain contracts, minimal web/Worker smoke path, governance files, and CI required by every later phase.

**Architecture:** A pnpm TypeScript workspace separates applications from framework-neutral packages. Zod schemas in `packages/contracts` are the single runtime and compile-time protocol source; both the React client and Hono Worker import them.

**Tech Stack:** Node.js 24 LTS, pnpm 12, TypeScript strict mode, React, Vite, Hono, Zod, Vitest, Testing Library, Playwright, ESLint, Prettier, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`

## Global Constraints

- Repository: public `jonasyr/nextstroke`, AGPL-3.0.
- Runtime floor: Node.js 24; package manager major: pnpm 12.
- Use ESM and strict TypeScript throughout.
- Runtime payload validation lives only in `packages/contracts`.
- No secret or real user data enters the repository or test fixtures.
- iPhone Safari is a required target, even when Phase 1 only supplies a shell.
- Every root quality command must work from a clean clone.

## Review Focus

1. Unsupported Node or package-manager versions should fail before an inconsistent install; Task 1 pins and tests the engines.
2. Unknown schema fields and unversioned payloads should be rejected rather than silently stored; Task 2 tests strict schemas.
3. A Worker exception must return a request ID and safe error body without stack traces; Task 3 tests the error boundary.
4. A missing environment binding must fail startup with a named configuration error; Task 3 tests environment parsing.
5. Pull requests must not invoke paid AI services or require deployment secrets; Task 4 tests CI commands with mocks only.

---

### Task 1: Bootstrap the workspace and quality commands

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `pnpm-lock.yaml`
- Create: `.node-version`
- Create: `.npmrc`
- Create: `tsconfig.base.json`
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.gitignore`
- Create: `vitest.workspace.ts`
- Create: `tests/repo/workspace.test.ts`
- Create: `apps/web/package.json`
- Create: `apps/api/package.json`
- Create: `packages/contracts/package.json`
- Create: `packages/compare/package.json`
- Create: `packages/imaging/package.json`
- Create: `packages/ai/package.json`
- Create: `packages/ui/package.json`

**Interfaces:**
- Consumes: approved directory boundaries from the design spec.
- Produces: root commands `dev`, `build`, `format:check`, `lint`, `typecheck`, `test`, and `check`; workspace package names `@nextstroke/web`, `@nextstroke/api`, `@nextstroke/contracts`, `@nextstroke/compare`, `@nextstroke/imaging`, `@nextstroke/ai`, and `@nextstroke/ui`.

- [ ] **Step 1: Pin the toolchain and install exact development dependencies**

Set `.node-version` to `24`; set `packageManager` to the installed pnpm `12.x` exact version and `engines.node` to `>=24 <27`. Use `pnpm add -Dw -E` for TypeScript, Vitest, ESLint, Prettier, and Node types so the generated lockfile pins exact versions.

- [ ] **Step 2: Write the failing workspace contract test**

Create `tests/repo/workspace.test.ts` with test `declares every architecture package` asserting that all seven package manifests exist, have the exact package names above, are private, use ESM, and expose a `typecheck` script.

- [ ] **Step 3: Run the test and confirm the missing manifests fail**

Run: `pnpm exec vitest run tests/repo/workspace.test.ts`  
Expected: FAIL naming the first missing or incomplete package manifest.

- [ ] **Step 4: Add root and package configuration**

Create the manifests, strict shared TypeScript configuration, workspace globs, ignore files, and root scripts. `pnpm check` must run format check, lint, type checking, and unit tests without relying on global tools.

- [ ] **Step 5: Verify workspace commands**

Run: `pnpm install --frozen-lockfile && pnpm exec vitest run tests/repo/workspace.test.ts && pnpm typecheck`  
Expected: PASS; pnpm reports all seven workspace projects.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml .node-version .npmrc tsconfig.base.json eslint.config.js .prettierrc.json .prettierignore .gitignore vitest.workspace.ts tests/repo apps packages
git commit -m "build: bootstrap NextStroke workspace"
```

### Task 2: Define versioned domain and API contracts

**Files:**
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/ids.ts`
- Create: `packages/contracts/src/assets.ts`
- Create: `packages/contracts/src/projects.ts`
- Create: `packages/contracts/src/suggestions.ts`
- Create: `packages/contracts/src/previews.ts`
- Create: `packages/contracts/src/api.ts`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/test/contracts.test.ts`

**Interfaces:**
- Consumes: package `@nextstroke/contracts` from Task 1.
- Produces: branded ID schemas; `ProjectSchema`, `CaptureSchema`, `ReferenceSchema`, `SuggestionSetSchema`, `ChangePlanSchema`, `PreviewLayerSchema`, `CheckpointSchema`, `FeedbackSchema`; request/response schemas under `ApiV1`; inferred TypeScript types with the same names minus `Schema`.

- [ ] **Step 1: Write failing contract tests**

Test exact invariants:

- `SuggestionSetSchema` accepts exactly three suggestions and rejects two or four.
- material is one of `fineliner`, `colored-pencil`, `watercolor`.
- change boundary is one of `careful`, `balanced`, `bold`.
- `CaptureSchema` requires immutable `sourceAssetId` and a four-point normalized perspective quad.
- every wire payload requires `schemaVersion: 1` and rejects unknown keys.
- `PreviewLayerSchema` requires separate `layerAssetId`, `allowedMaskAssetId`, validation status, and never contains a replacement-original field.

- [ ] **Step 2: Run the tests and confirm missing exports fail**

Run: `pnpm --filter @nextstroke/contracts test`  
Expected: FAIL because the schemas do not exist.

- [ ] **Step 3: Implement strict schemas and inferred types**

Use Zod `.strict()` objects and ISO date strings. IDs are non-empty UUID strings branded per entity. Coordinates use normalized `0..1` values. Suggestion difficulty and risk use `low | medium | high`; every suggestion contains `impact`, `reason`, `materials`, and `targetRegion`.

- [ ] **Step 4: Export and typecheck the package**

Run: `pnpm --filter @nextstroke/contracts test && pnpm --filter @nextstroke/contracts typecheck`  
Expected: PASS with no duplicate hand-written domain interfaces outside this package.

- [ ] **Step 5: Commit**

```bash
git add packages/contracts
git commit -m "feat: define versioned product contracts"
```

### Task 3: Add web and Worker smoke applications

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/styles/tokens.css`
- Create: `apps/web/src/styles/global.css`
- Create: `apps/web/src/App.test.tsx`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/wrangler.jsonc`
- Create: `apps/api/src/env.ts`
- Create: `apps/api/src/errors.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/test/app.test.ts`

**Interfaces:**
- Consumes: `ApiV1.HealthResponseSchema` from Task 2.
- Produces: React application shell; Worker endpoint `GET /api/v1/health`; `createApp(env: ApiEnv): Hono`; `parseEnv(input: unknown): ApiEnv`; safe JSON error shape `{ schemaVersion: 1, error: { code, message, requestId } }`.

- [ ] **Step 1: Write failing UI and API tests**

UI test asserts the page has one `New project` primary action, one `Quick compare` action, a visible `Private beta` status, and no textbox role. API tests assert `/api/v1/health` returns `200` and a contract-valid body, an unknown route returns `404`, and an injected exception returns `500` with a request ID but no stack or exception message.

- [ ] **Step 2: Run the tests and confirm both apps fail**

Run: `pnpm --filter @nextstroke/web test && pnpm --filter @nextstroke/api test`  
Expected: FAIL because application entry points are absent.

- [ ] **Step 3: Implement the accessible shells and safe API boundary**

Use semantic HTML, CSS custom properties, `env(safe-area-inset-*)`, a 44px minimum control size, and no global suppression of selection or browser gestures. `parseEnv` names every missing required binding; the error middleware logs request ID and error class only.

- [ ] **Step 4: Verify apps and production builds**

Run: `pnpm --filter @nextstroke/web test && pnpm --filter @nextstroke/api test && pnpm build`  
Expected: PASS; Vite produces static assets and Wrangler type checking succeeds.

- [ ] **Step 5: Commit**

```bash
git add apps/web apps/api
git commit -m "feat: add web and worker application shells"
```

### Task 4: Add governance, documentation, CI, and GitHub metadata

**Files:**
- Create: `README.md`
- Create: `AGENTS.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `LICENSE`
- Create: `.env.example`
- Create: `docs/product/scope.md`
- Modify: `docs/README.md`
- Modify: `docs/product/origin-and-evolution.md`
- Create: `docs/architecture/overview.md`
- Create: `docs/privacy/data-flow.md`
- Create: `docs/roadmap/README.md`
- Modify: `docs/decisions/README.md`
- Modify: `docs/decisions/decision-log.md`
- Create: `docs/decisions/0001-local-first-cloudflare.md`
- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`
- Create: `.github/ISSUE_TEMPLATE/bug.yml`
- Create: `.github/ISSUE_TEMPLATE/feature.yml`
- Create: `.github/pull_request_template.md`
- Create: `tests/repo/governance.test.ts`

**Interfaces:**
- Consumes: commands and package boundaries from Tasks 1–3.
- Produces: repository-wide agent rules, contribution/security paths, AGPL-3.0 terms, CI required checks, and documented setup.

- [ ] **Step 1: Write the failing governance test**

Assert that required documents exist; `LICENSE` contains `GNU AFFERO GENERAL PUBLIC LICENSE` and version `3`; `.env.example` contains names only; `AGENTS.md` contains the immutable-original, explicit-upload, masked-layer, package-boundary, Safari, secret, async-state, verification, and documentation-index rules from the approved spec. Assert that root `README.md` and `AGENTS.md` link `docs/README.md`, and that the index links the origin, decision log, spec, master plan, and every phase plan.

- [ ] **Step 2: Run the test and confirm missing documents fail**

Run: `pnpm exec vitest run tests/repo/governance.test.ts`  
Expected: FAIL naming missing governance files.

- [ ] **Step 3: Write the repository documents and CI workflow**

CI runs on pull requests and pushes to `main`: frozen install, format check, lint, typecheck, unit tests, build, and secret/dependency audit. It must not define AI keys or execute live-provider tests. README labels the project `Private beta / under active development` and links the documentation index. The documentation index defines reading order and authority order; the decision log records each known option, selection, rationale, consequence, and reconsideration trigger.

- [ ] **Step 4: Run all Phase 1 checks**

Run: `pnpm check && pnpm build`  
Expected: PASS from a clean working tree; no command requests a cloud credential.

- [ ] **Step 5: Commit**

```bash
git add README.md AGENTS.md CONTRIBUTING.md SECURITY.md CODE_OF_CONDUCT.md LICENSE .env.example docs .github tests/repo/governance.test.ts
git commit -m "docs: establish repository governance and CI"
```

## Phase 1 final review

- [ ] Run `pnpm install --frozen-lockfile && pnpm check && pnpm build`.
- [ ] Review `AGENTS.md` against every invariant in the design spec.
- [ ] Confirm `git grep -nE '(api[_-]?key|secret|token)\s*[:=]\s*[^$<{ ]+'` finds no credential value.
- [ ] Tag the merge commit `phase-1-foundation` only after GitHub CI is green.
