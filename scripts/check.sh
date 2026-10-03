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

if [ -f package.json ]; then
  echo "== TypeScript workspace: lint, types, boundaries, licenses, tests, build"
  pnpm run check
fi

for script in lab/probe/dist/*.js; do
  [ -f "$script" ] || continue
  echo "== JavaScript syntax: $script"
  node --check "$script"
done

echo "== All checks passed"
