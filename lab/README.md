# NextStroke Phase 0 Lab

Disposable evaluation code for the approved Phase 0 plan (`docs/superpowers/plans/2026-10-03-nextstroke-phase-0-proof-of-feasibility.md`). It is not production architecture and is deleted or rewritten unless a later plan retains it (D-041).

## Layout

- `src/nextstroke_lab/domain/`: pure rules from spec §8 and §15: masks, compositing and boundary audit, stroke plans, classification, and the GO/PIVOT decision. No file, image-library, or network imports (enforced by Ruff).
- `src/nextstroke_lab/adapters/`: image loading, stroke rasterizing, and the append-only attempt log.
- `src/nextstroke_lab/pipeline.py`, `evaluation.py`, `rating_pack.py`, `cli.py`: application layer and the `nextstroke-lab` command.
- `tests/`: one test module per source module; written before the code.
- `probe/`: static ChatGPT Sites deployment probe for Phase 0 Task 6 (see below).

## Commands

```bash
uv sync
uv run pytest
uv run ruff format . && uv run ruff check . && uv run mypy
```

Private corpus images, provider outputs, and participant data live in `lab/private/` (git-ignored) or outside the repository. Never commit them.

## Workflow

```bash
# Per case folder (private): original.jpg, editable.png, protected.png, optional feather.png
uv run nextstroke-lab candidate private/cases/c01 s3 private/outputs/c01-s3-1.json --attempt 1 --out private/candidates
uv run nextstroke-lab pack private/candidates --out private/pack --key private/keys/key-1.json --seed 1
# rate in private/pack/index.html (serve with python3 -m http.server), export ratings.json
uv run nextstroke-lab decide private/candidates --key private/keys/key-1.json --ratings private/ratings-1.json \
  --rereview-key private/keys/key-2.json --rereview private/ratings-2.json \
  --log private/attempts.jsonl --evidence private/evidence.json --cost s1=0.03 --cost s2=0.03 --cost s3=0.005
```

## Deployment probe

```bash
./probe/fetch-vendor.sh   # pinned opencv.js 5.0.0-release.1, checksum-verified, git-ignored
```

Deploy `probe/` privately with ChatGPT Sites (static directory `dist`), open it on the iPhone, follow the on-screen steps, and paste the shared JSON into the Phase 0 report. It uploads no images.
