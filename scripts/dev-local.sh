#!/usr/bin/env bash
# Local dev with production Clerk keys via https://local.tools.creativewaco.org
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="local.tools.creativewaco.org"

if ! grep -q "${HOST}" /etc/hosts 2>/dev/null; then
  "${ROOT}/scripts/setup-local-clerk-hosts.sh"
fi

lsof -ti:443 | xargs kill -9 2>/dev/null || true
lsof -ti:3847 | xargs kill -9 2>/dev/null || true

cd "${ROOT}"

if [ "$(id -u)" -ne 0 ]; then
  echo "Starting HTTPS dev server on https://${HOST}/ (sudo required for port 443)…"
  exec sudo -E env "PATH=${PATH}" "HOME=${HOME}" npx next dev --experimental-https -p 443 -H "${HOST}"
fi

exec npx next dev --experimental-https -p 443 -H "${HOST}"
