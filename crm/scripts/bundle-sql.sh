#!/usr/bin/env bash
# Bundles every migration into supabase/setup.sql — one file to paste into the
# Supabase SQL Editor. Wrapped in a transaction so a failure part-way leaves
# the project untouched rather than half-migrated.
#
# Run after adding or changing any migration:  npm run sql:bundle
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/supabase/setup.sql"
HEAD_FILE="$ROOT/supabase/setup.header.sql"

{
  cat "$HEAD_FILE"
  printf '\nbegin;\n'
  for f in "$ROOT"/supabase/migrations/*.sql; do
    printf '\n\n-- ===========================================================================\n-- %s\n-- ===========================================================================\n\n' "$(basename "$f")"
    cat "$f"
  done
  printf '\n\ncommit;\n'
} > "$OUT"

printf 'Wrote %s (%s lines)\n' "$OUT" "$(wc -l < "$OUT")"
