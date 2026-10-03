#!/usr/bin/env sh
# Idempotent developer setup. Safe to run repeatedly.
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"

have() { command -v "$1" >/dev/null 2>&1; }

echo "== Tool check"
for tool in uv node pnpm; do
  if have "$tool"; then
    echo "ok      $tool"
  else
    echo "missing $tool (needed only once its part of the repo exists)"
  fi
done

echo "== Legacy Fineliner Lupe prototype"
./legacy/fineliner-lupe/prepare-vendor.sh

if [ -f pyproject.toml ]; then
  echo "== Python environment (uv)"
  if have uv; then uv sync; else echo "uv is required: https://docs.astral.sh/uv/" >&2; exit 1; fi
fi

if [ -f package.json ]; then
  echo "== Node workspace (pnpm)"
  if have pnpm; then pnpm install --frozen-lockfile; else echo "pnpm is required" >&2; exit 1; fi
fi

echo "== Done. Serve the prototype with:"
echo "   python3 -m http.server 4173 --directory legacy/fineliner-lupe/dist"
