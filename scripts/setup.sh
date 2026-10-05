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

for project in . lab; do
  [ -f "$project/pyproject.toml" ] || continue
  echo "== Python environment (uv): $project"
  if have uv; then (cd "$project" && uv sync --frozen); else echo "uv is required: https://docs.astral.sh/uv/" >&2; exit 1; fi
done

if [ -f package.json ]; then
  echo "== Node workspace (pnpm)"
  if have pnpm; then pnpm install --frozen-lockfile; else echo "pnpm is required" >&2; exit 1; fi
fi

if [ -f apps/web/playwright.config.ts ] && [ "${NEXTSTROKE_SKIP_BROWSERS:-0}" != 1 ]; then
  # Browser tests run in Chromium and WebKit (D-063). An environment that provides its own
  # Chromium (PW_CHROMIUM_PATH) gets only WebKit. System libraries need root or sudo.
  echo "== Browsers for the browser tests (Playwright)"
  browsers="chromium webkit"
  [ -n "${PW_CHROMIUM_PATH:-}" ] && browsers="webkit"
  deps=""
  if [ "$(id -u)" = 0 ] || have sudo; then deps="--with-deps"; fi
  # shellcheck disable=SC2086 # word splitting of the browser list is intended
  if ! PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD= pnpm --filter @nextstroke/web exec playwright install $deps $browsers; then
    echo "warning: Playwright browsers not installed; pnpm run e2e needs them" >&2
  fi
fi

echo "== Done. Serve the prototype with:"
echo "   python3 -m http.server 4173 --directory legacy/fineliner-lupe/dist"
