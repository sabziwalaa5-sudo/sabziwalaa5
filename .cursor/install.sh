#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[install] Installing web dependencies..."
(cd "$ROOT/web" && npm ci)

echo "[install] Installing backend dependencies..."
(cd "$ROOT/backend" && npm ci && npx prisma generate)

echo "[install] Writing development environment files..."
bash "$ROOT/.cursor/write-dev-env.sh"

echo "[install] Done."
