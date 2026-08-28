#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

bash "$ROOT/.cursor/write-dev-env.sh"

if [[ ! -d "$ROOT/web/node_modules" || ! -d "$ROOT/backend/node_modules" ]]; then
  echo "[start] Dependencies missing; running install..."
  bash "$ROOT/.cursor/install.sh"
fi

echo "[start] Sabjiwala 5 environment is ready."
