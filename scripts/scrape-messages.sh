#!/bin/sh
# Scrape job messages page by page.
# Usage: ./scripts/scrape-messages.sh [job_id]
# Defaults are loaded from scripts/.script-config.json (copy from .script-config.example.json if missing)

cd "$(dirname "$0")/.." || exit 1
exec node scripts/scrape-messages.mjs "$@"
