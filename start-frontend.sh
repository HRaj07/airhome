#!/usr/bin/env bash
# Starts the Next.js frontend on http://localhost:3000
set -e
cd "$(dirname "$0")/frontend"
if [ ! -d node_modules ]; then
  echo "Dependencies not installed. Run ./setup.sh first." >&2
  exit 1
fi
exec npm run dev
