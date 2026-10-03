# Contributing to NextStroke

Read `AGENTS.md` and `docs/README.md` first. This file covers the mechanics: setup, checks, branches, commits, and pull requests (D-037, D-039).

## Setup

```bash
./scripts/setup.sh          # idempotent: tools, legacy vendor assets, uv/pnpm installs
uvx pre-commit install      # run the same checks on every commit
```

## Checks

`./scripts/check.sh` runs everything CI runs: documentation links; for each Python project (currently `lab/`) Ruff format, Ruff lint, mypy strict, and pytest; and for the TypeScript workspace `pnpm run check`, which runs Biome, `tsc` strict, dependency-cruiser boundary rules, the production license allowlist, Vitest with 90% coverage, and the web build.

Toolchain (D-052): Node 24 LTS (22.12 or newer works), pnpm 12.8.1 (`npm i -g pnpm@12.8.1` or Corepack), TypeScript 6.0.3.

| Command | What it does |
| --- | --- |
| `pnpm run lint` / `pnpm run format` | Biome lint and format check / write |
| `pnpm run typecheck` | `tsc` with the strict base config |
| `pnpm run deps` | dependency-cruiser package boundaries (`.dependency-cruiser.cjs`) |
| `pnpm run licenses` | production dependency license allowlist |
| `pnpm run test` | Vitest with coverage thresholds |
| `pnpm run build` | static web build to `apps/web/dist/` |

Workspace layout (spec §13): `apps/web` (React/Vite PWA) and `packages/{contracts,compare,imaging,materials,coaching,ui}`. Contracts depend on nothing else in the workspace; domain packages never import React or `ui`; packages never import apps.

Never bypass hooks (`--no-verify`) or merge with red CI. Fix the cause instead.

## Branches

- `main` is always releasable documentation plus code that passed CI. Do not commit to it directly.
- Branch names: `<type>/<short-topic>`, for example `feat/phase-0-lab`, `docs/phase-0-readiness-review`, `fix/export-canvas-limit`.
- Keep branches short-lived and focused on one topic. If one branch depends on another, say so in the pull request.
- Never rewrite history on a branch someone else uses. Bring `main` in with a merge, not a rebase, once a branch is shared.

## Commits

- [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, `ci:`, with an optional scope such as `feat(lab):`.
- One logical change per commit; the subject says what changes, the body says why.
- Tests and code land in the same commit or the test comes first.
- Commit lockfiles (`uv.lock`, `pnpm-lock.yaml`). Never commit secrets, user artwork, unlicensed fixtures, or provider outputs containing personal images.

## Pull requests

- Open a pull request into `main`; CI must be green.
- Product, privacy, architecture, external-service, or quality-gate changes update the decision log, project state, spec, and plan in the same pull request.
- Describe what was verified and how.

## Architecture rules

- Domain logic (masks, compositing rules, classification, decisions, material rules) is pure and has no I/O, UI, or provider imports.
- I/O, UI, storage, and providers are adapters around the domain.
- One responsibility per module. Dependencies point inward.
- Test-driven: write the failing test first.
