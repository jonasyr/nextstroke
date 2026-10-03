#!/usr/bin/env sh
# Runs every check CI runs. Exit code is non-zero on the first failure.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"

echo "== Documentation links"
python3 scripts/check_doc_links.py

for project in lab; do
  [ -f "$project/pyproject.toml" ] || continue
  echo "== Python: $project"
  (
    cd "$project"
    uv run --frozen ruff format --check .
    uv run --frozen ruff check .
    uv run --frozen mypy
    uv run --frozen pytest -q
  )
done

echo "== All checks passed"
