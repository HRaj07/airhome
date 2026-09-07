#!/usr/bin/env bash
# Starts the FastAPI backend on http://localhost:8000
# Calls the virtualenv's python directly, so no `source .venv/bin/activate` needed.
set -e
cd "$(dirname "$0")/backend"
if [ ! -x .venv/bin/python ]; then
  echo "No virtualenv found. Run ./setup.sh first." >&2
  exit 1
fi
exec ./.venv/bin/python -m uvicorn app.main:app --reload --port 8000
