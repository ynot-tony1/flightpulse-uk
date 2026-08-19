#!/usr/bin/env bash
# Local development bootstrap: installs JS dependencies, generates the
# Prisma client, and sets up the Python ingestor's virtual environment.
# Does NOT touch any database — see docs/deployment.md for that step.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing pnpm workspace dependencies"
pnpm install

echo "==> Generating Prisma client"
pnpm --filter @flightpulse/database generate

echo "==> Setting up Python ingestor virtual environment"
cd services/ingestor
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip >/dev/null
pip install -e . pytest pytest-httpx ruff mypy

echo "==> Done. Copy .env.example to .env and fill in non-secret values to start apps/web with 'pnpm dev'."
