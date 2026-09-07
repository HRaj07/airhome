#!/usr/bin/env bash
# One-time setup: backend virtualenv + dependencies + seeded database, frontend packages.
# Usage:  ./setup.sh
set -e
cd "$(dirname "$0")"

echo "==> Backend: virtualenv + dependencies"
cd backend
[ -d .venv ] || python3 -m venv .venv
./.venv/bin/pip install --quiet --upgrade pip
./.venv/bin/pip install --quiet -r requirements.txt

if [ -f airbnb.db ]; then
  echo "    (airbnb.db already exists — keeping it; run ./reseed.sh to reset)"
else
  echo "==> Seeding the database"
  ./.venv/bin/python -m app.seed
fi
cd ..

echo "==> Frontend: packages"
cd frontend
[ -f .env.local ] || cp .env.local.example .env.local
npm install
cd ..

echo
echo "Setup complete. Start the app in two terminals:"
echo "    ./start-backend.sh     -> http://localhost:8000/docs"
echo "    ./start-frontend.sh    -> http://localhost:3000"
