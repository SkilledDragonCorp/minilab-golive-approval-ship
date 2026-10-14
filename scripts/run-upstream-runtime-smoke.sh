#!/usr/bin/env bash
# Run upstream Node 20 runtime smoke from inside vendor/golive-skill.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SMOKE="$ROOT/scripts/upstream-runtime-smoke.mjs"

if [[ -x /usr/local/opt/git/bin/git ]]; then
  export PATH="/usr/local/opt/git/bin:$PATH"
elif [[ -x /opt/homebrew/opt/git/bin/git ]]; then
  export PATH="/opt/homebrew/opt/git/bin:$PATH"
fi

bash "$ROOT/scripts/fetch-upstream.sh"

# Prefer nvm Node 20 when available; otherwise require node major 20 on PATH.
NODE20=""
if [[ -n "${NVM_DIR:-}" && -s "${NVM_DIR}/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "${NVM_DIR}/nvm.sh"
  nvm use 20 >/dev/null
  NODE20="$(command -v node)"
elif command -v node >/dev/null 2>&1; then
  MAJOR="$(node -p "process.versions.node.split('.')[0]")"
  if [[ "$MAJOR" == "20" ]]; then
    NODE20="$(command -v node)"
  fi
fi

if [[ -z "$NODE20" ]]; then
  echo "Node 20 required for upstream runtime smoke (found: $(node -v 2>/dev/null || echo none))" >&2
  exit 1
fi

cd "$ROOT/vendor/golive-skill"
exec "$NODE20" "$SMOKE"
