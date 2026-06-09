#!/usr/bin/env bash
# Wrapper for Clerk CLI — avoids hangs in non-TTY shells (e.g. Cursor agent).
set -euo pipefail

export CLERK_CLI_NO_ANALYTICS=1
export CI=1
export NO_UPDATE_NOTIFIER=1

BIN="$(node -e "process.stdout.write(require.resolve('@clerk/cli-darwin-arm64/bin/clerk'))" 2>/dev/null || true)"
if [ -z "${BIN}" ] || [ ! -x "${BIN}" ]; then
  BIN="$(dirname "$(command -v clerk)")/../lib/node_modules/clerk/node_modules/@clerk/cli-darwin-arm64/bin/clerk"
fi

exec "${BIN}" "$@" </dev/null
