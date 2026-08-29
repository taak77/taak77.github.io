#!/usr/bin/env bash
# Serves the frozen legacy site and the new build side by side for visual comparison.
set -euo pipefail

LEGACY_DIR="$(git rev-parse --show-toplevel)/.worktrees/legacy-baseline"

if [ ! -f "$LEGACY_DIR/index.html" ]; then
  echo "Legacy worktree missing or incomplete. Create it with:" >&2
  echo "  git worktree add \"$LEGACY_DIR\" legacy-baseline --detach" >&2
  exit 1
fi

npm run build

(cd "$LEGACY_DIR" && exec python3 -m http.server 8081 >/dev/null) &
LEGACY_PID=$!
trap 'kill "$LEGACY_PID" 2>/dev/null || true' EXIT

sleep 1
kill -0 "$LEGACY_PID" 2>/dev/null || {
  echo "Legacy server failed to start on 8081 (port already in use?)" >&2
  exit 1
}

echo ""
echo "  OLD: http://localhost:8081"
echo "  NEW: http://localhost:4321"
echo ""

npm run preview -- --port 4321
