#!/bin/sh
# Subscribe to job messages and exchange 2 messages from each user.
# Usage: ./scripts/subscribe-and-message.sh [contractor_email] [contractor_password] [homeowner_email] [homeowner_password] [job_id]
# Defaults are loaded from scripts/.script-config.json (copy from .script-config.example.json if missing)

cd "$(dirname "$0")/.." || exit 1
exec node scripts/subscribe-and-message.mjs "$@"
