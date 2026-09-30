#!/usr/bin/env bash
# Point this clone at tracked hooks under .githooks/ (commit-msg + prepare-commit-msg).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS="$ROOT/.githooks"

chmod +x "$HOOKS"/commit-msg "$HOOKS"/prepare-commit-msg "$HOOKS"/_cursor-coauthor-guard.sh 2>/dev/null || true

git -C "$ROOT" config core.hooksPath .githooks

echo "Git hooksPath set to .githooks (blocks Co-authored-by: Cursor)."
