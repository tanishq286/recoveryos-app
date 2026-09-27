#!/usr/bin/env bash
# Verify supabase/migrations/0001_init.sql on a throwaway local Postgres (15+).
# No Supabase account needed. Must run as a non-root user (initdb refuses root).
#   PG_BIN=/usr/lib/postgresql/16/bin scripts/verify-schema.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v initdb 2>/dev/null || echo /usr/lib/postgresql/16/bin/initdb)")}"
PORT="${PORT:-55439}"
TMP="$(mktemp -d)"
trap '"$PG_BIN/pg_ctl" -D "$TMP/data" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$TMP"' EXIT

"$PG_BIN/initdb" -D "$TMP/data" -U postgres --auth=trust >/dev/null
"$PG_BIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=" -l "$TMP/pg.log" start >/dev/null

PSQL=("$PG_BIN/psql" -h "$TMP" -p "$PORT" -U postgres -q)
"${PSQL[@]}" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/verify/supabase_stub.sql"
"${PSQL[@]}" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/0001_init.sql"
echo "Migration applied. Running behaviour checks…"
"${PSQL[@]}" -f "$ROOT/supabase/verify/behaviour.sql" 2>&1 | grep -v '^DETAIL\|^CONTEXT'
