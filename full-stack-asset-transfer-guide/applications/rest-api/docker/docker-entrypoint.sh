#!/usr/bin/env bash
set -euo pipefail
: ${DEBUG:="false"}

if [ "${DEBUG,,}" = "true" ]; then
  npm run start:dev
else
  npm run start
fi

