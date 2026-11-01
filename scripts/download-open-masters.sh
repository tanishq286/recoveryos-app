#!/usr/bin/env bash
# Downloads public, static, non-CAPTCHA source files into data/pan-india-drop/,
# ready for `npm run ingest:pan-india -w @finsol/db`:
#   - NSE's equity lists (main board and SME/Emerge)
#   - the IEPF-2 / IEPF-4 statement files linked from each company's
#     investor-relations page on record (via the fetch:iepf tool, which checks
#     robots.txt and waits between requests)
#
# Every request identifies itself honestly. Sites that refuse automated
# clients (BSE, registrar lookups, MCA) are not attempted: download those
# files yourself in a browser and drop them into the same folder.
#
# Usage: scripts/download-open-masters.sh [--skip-ir]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DROP="$ROOT/data/pan-india-drop"
UA="${FETCH_USER_AGENT:-FinsolEnterprises-IEPF-Fetcher/0.3 (+https://finsolenterprises.com/bot; collects public IEPF statutory statements)}"
STAMP="$(date +%Y%m%d)"
mkdir -p "$DROP"

fetch() { # url target
  local url="$1" target="$2" tmp
  tmp="$(mktemp "$DROP/.download.XXXXXX")"
  if curl --fail --silent --show-error --location --max-time 60 -A "$UA" -o "$tmp" "$url"; then
    mv "$tmp" "$target"
    echo "saved $(basename "$target") ($(wc -c < "$target") bytes) from $url"
  else
    rm -f "$tmp"
    echo "skipped $url (not available)" >&2
  fi
  sleep 2
}

# NSE equity lists: the calculator's directory.
fetch "https://archives.nseindia.com/content/equities/EQUITY_L.csv" "$DROP/NSE_EQUITY_L_$STAMP.csv"
fetch "https://archives.nseindia.com/emerge/corporates/content/SME_EQUITY_L.csv" "$DROP/NSE_SME_EQUITY_L_$STAMP.csv"

# Company IEPF statements from the investor-relations pages on record.
if [[ "${1:-}" != "--skip-ir" ]]; then
  (cd "$ROOT" && npm run -s build -w @finsol/db >/dev/null \
    && npm run -s fetch:iepf -w @finsol/db -- --all --out "$DROP")
fi

echo "Done. Load the files with: npm run ingest:pan-india -w @finsol/db"
