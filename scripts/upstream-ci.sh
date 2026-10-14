#!/usr/bin/env bash
# Upstream validate cohort — commands copied from .github/workflows/ci.yml at
# 8fd3d8e96844c79c500aabaf215d1267fcde08c5 (pnpm 9.12.2, Node 24).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="8fd3d8e96844c79c500aabaf215d1267fcde08c5"

if [[ -x /usr/local/opt/git/bin/git ]]; then
  export PATH="/usr/local/opt/git/bin:$PATH"
elif [[ -x /opt/homebrew/opt/git/bin/git ]]; then
  export PATH="/opt/homebrew/opt/git/bin:$PATH"
fi

bash "$ROOT/scripts/fetch-upstream.sh"

# Upstream validate job pins pnpm 9.12.2 (not the caller's global pnpm).
if command -v corepack >/dev/null 2>&1; then
  corepack enable >/dev/null 2>&1 || true
  corepack prepare pnpm@9.12.2 --activate
fi
PNPM_VER="$(pnpm --version 2>/dev/null || true)"
if [[ "$PNPM_VER" != "9.12.2" ]]; then
  echo "pnpm 9.12.2 required for upstream cohort (found: ${PNPM_VER:-none})" >&2
  exit 1
fi

cd "$ROOT/vendor/golive-skill"
HEAD="$(git rev-parse HEAD)"
if [[ "$HEAD" != "$PIN" ]]; then
  echo "upstream pin mismatch: expected $PIN got $HEAD" >&2
  exit 1
fi

# Drop a store installed with a newer pnpm that may have blocked build scripts.
rm -rf node_modules

pnpm install --frozen-lockfile
pnpm vitest run
pnpm tsc --noEmit

echo "upstream-ci.sh OK @ $HEAD"
