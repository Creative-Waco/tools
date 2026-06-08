#!/usr/bin/env bash
# Map local.tools.creativewaco.org → localhost for Clerk production-key local testing.
# Requires sudo. Safe to run multiple times.

set -euo pipefail

HOST="local.tools.creativewaco.org"
LINE="127.0.0.1 ${HOST}"

if grep -q "${HOST}" /etc/hosts 2>/dev/null; then
  echo "✓ ${HOST} already in /etc/hosts"
  exit 0
fi

echo "Adding ${LINE} to /etc/hosts (sudo required)…"
echo "${LINE}" | sudo tee -a /etc/hosts >/dev/null
echo "✓ Done. Use: npm run dev:local → https://${HOST}/"
