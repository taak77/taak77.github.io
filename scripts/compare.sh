#!/usr/bin/env bash
# Serves the frozen legacy site and the new build side by side for visual comparison.
set -euo pipefail

LEGACY_DIR="$(git rev-parse --show-toplevel)/.worktrees/legacy-baseline"

if [ ! -d "$LEGACY_DIR" ]; then
  echo "Legacy worktree missing. Create it with:" >&2
  echo "  git worktree add .worktrees/legacy-baseline legacy-baseline --detach" >&2
  exit 1
fi

npm run build

(cd "$LEGACY_DIR" && python3 -m http.server 8081 >/dev/null 2>&1) &
LEGACY_PID=$!
trap 'kill "$LEGACY_PID" 2>/dev/null || true' EXIT

echo ""
echo "  OLD: http://localhost:8081"
echo "  NEW: http://localhost:4321"
echo ""

npx astro preview --port 4321
