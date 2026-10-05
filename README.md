# NextStroke

NextStroke is an iPhone-first physical-art coach in planning and feasibility validation. The repository also preserves the working **Fineliner Lupe** comparison prototype that started the project.

## Existing prototype

The current browser app lives in `legacy/fineliner-lupe/dist/` and supports:

- original and reference image upload;
- image and PDF input;
- automatic and manual alignment;
- opacity comparison and original reveal;
- pan, pinch zoom, fit, and immersive comparison;
- PNG export/share;
- iPhone-oriented Safari controls.

Run it locally from the repository root:

```bash
./scripts/setup.sh
python3 -m http.server 4173 --directory legacy/fineliner-lupe/dist
```

Then open `http://localhost:4173`.

The prototype is preserved as a behavioral reference. It is a static built application rather than the planned production architecture. Do not overwrite it while implementing the evidence-backed phases.

## Project status

Phase 0 (feasibility) is closed with a documented pivot (D-048); follow-up tests chose the Phase 4 preview route (D-051). Phase 1, the lean foundation, is in progress: a TypeScript workspace with the web app shell, runtime contracts and quality gates. See [`docs/project-state.md`](docs/project-state.md) and the [Phase 0 results](docs/research/phase-0-results.md).

Read in this order:

1. [`AGENTS.md`](AGENTS.md)
2. [`docs/README.md`](docs/README.md)
3. [`docs/project-state.md`](docs/project-state.md)
4. [`docs/decisions/decision-log.md`](docs/decisions/decision-log.md)
5. [`docs/superpowers/specs/2026-10-03-nextstroke-product-design.md`](docs/superpowers/specs/2026-10-03-nextstroke-product-design.md)
6. [`docs/superpowers/plans/2026-10-03-nextstroke-phase-1-foundation.md`](docs/superpowers/plans/2026-10-03-nextstroke-phase-1-foundation.md)

## Repository layout

| Path | Contents |
| --- | --- |
| `apps/web/` | React/Vite PWA shell, German UI ([README](apps/web/README.md)) |
| `packages/` | `contracts`, `compare`, `imaging`, `materials`, `coaching`, `ui` (spec §13) |
| `lab/` | Disposable Phase 0 lab (Python) and the hosting probe |
| `legacy/fineliner-lupe/` | The original working prototype, kept as a behavioral reference |
| `docs/` | Spec, decisions, plans, research, privacy, legal |

## Verify a checkout

Needs Node 22.12+ (CI uses 24), pnpm 12.8.1, uv, and Python 3.11+ (D-052).

```bash
./scripts/setup.sh    # installs the Node workspace, the lab environment, and Playwright Chromium + WebKit
./scripts/check.sh    # everything CI runs: docs links, lab checks, workspace lint/types/boundaries/licenses/tests/build
pnpm run build        # static web build in apps/web/dist/
pnpm run e2e          # browser tests in Chromium and WebKit (after a build)
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for branches, commits and the individual commands, [`SECURITY.md`](SECURITY.md) for reporting vulnerabilities, [`docs/privacy/README.md`](docs/privacy/README.md) for the data flow, and [`docs/legal/license.md`](docs/legal/license.md) for the license status.
