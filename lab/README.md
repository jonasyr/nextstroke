# NextStroke Phase 0 Lab

Disposable evaluation code for the approved Phase 0 plan (`docs/superpowers/plans/2026-10-03-nextstroke-phase-0-proof-of-feasibility.md`). It is not production architecture and is deleted or rewritten unless a later plan retains it (D-041).

## Layout

- `src/nextstroke_lab/domain/`: pure rules from spec §8 and §15: masks, compositing and boundary audit, stroke plans, classification, and the GO/PIVOT decision. No file, image-library, or network imports (enforced by Ruff).
- `src/nextstroke_lab/adapters/`: image loading, stroke rasterizing, and the append-only attempt log.
- `tests/`: one test module per source module; written before the code.

## Commands

```bash
uv sync
uv run pytest
uv run ruff format . && uv run ruff check . && uv run mypy
```

Private corpus images, provider outputs, and participant data live in `lab/private/` (git-ignored) or outside the repository. Never commit them.
