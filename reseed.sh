#!/usr/bin/env bash
# Wipes and re-seeds the database (demo hosts, guests, listings, experiences, services).
# Stop the backend first, then run this, then start it again.
set -e
cd "$(dirname "$0")/backend"
exec ./.venv/bin/python -m app.seed
