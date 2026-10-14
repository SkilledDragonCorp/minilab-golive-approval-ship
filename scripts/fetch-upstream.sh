#!/usr/bin/env bash
# Clone mikehasa/golive-skill at the pinned SHA into vendor/golive-skill.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIN="8fd3d8e96844c79c500aabaf215d1267fcde08c5"
DEST="$ROOT/vendor/golive-skill"
REPO="https://github.com/mikehasa/golive-skill.git"

# Prefer Homebrew/cellar git (≥2.31) when system git is older.
if [[ -x /usr/local/opt/git/bin/git ]]; then
  export PATH="/usr/local/opt/git/bin:$PATH"
elif [[ -x /opt/homebrew/opt/git/bin/git ]]; then
  export PATH="/opt/homebrew/opt/git/bin:$PATH"
fi

mkdir -p "$ROOT/vendor"

if [[ -d "$DEST/.git" ]]; then
  git -C "$DEST" fetch --depth 1 origin "$PIN"
  git -C "$DEST" checkout --force "$PIN"
else
  rm -rf "$DEST"
  git clone "$REPO" "$DEST"
  git -C "$DEST" checkout "$PIN"
fi

HEAD="$(git -C "$DEST" rev-parse HEAD)"
if [[ "$HEAD" != "$PIN" ]]; then
  echo "vendor pin mismatch: expected $PIN got $HEAD" >&2
  exit 1
fi

echo "vendor/golive-skill @ $HEAD"
