#!/usr/bin/env bash
# Shared helpers: block Co-authored-by trailers that attribute Cursor.
set -euo pipefail

# Case-insensitive match on Co-authored-by lines mentioning Cursor or its agent email.
CURSOR_COAUTHOR_REGEX='^Co-authored-by:.*cursor'

cursor_coauthor_present() {
  local file="$1"
  grep -qiE "$CURSOR_COAUTHOR_REGEX" "$file"
}

strip_cursor_coauthor_lines() {
  local file="$1"
  local tmp
  tmp="$(mktemp)"
  grep -viE "$CURSOR_COAUTHOR_REGEX" "$file" >"$tmp" || true
  cat "$tmp" >"$file"
  rm -f "$tmp"
}
