#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

upsert_env_file() {
  local file="$1"
  shift
  local -a lines=("$@")

  mkdir -p "$(dirname "$file")"
  touch "$file"

  for line in "${lines[@]}"; do
    local key="${line%%=*}"
    if grep -q "^${key}=" "$file"; then
      sed -i "s|^${key}=.*|${line}|" "$file"
    else
      printf '%s\n' "$line" >>"$file"
    fi
  done
}

upsert_env_file "$ROOT/web/.env.local" \
  "NEXT_PUBLIC_APP_URL=http://localhost:3001" \
  "PAYMENT_HMAC_SECRET=dev-hmac-secret-change-me"

upsert_env_file "$ROOT/backend/.env" \
  "PORT=4000" \
  "DATABASE_URL=postgresql://sabjiwala_user:sabjiwala_password@localhost:5432/sabjiwala5_db?schema=public" \
  "PAYMENT_HMAC_SECRET=dev-hmac-secret-change-me" \
  "WEB_ORIGIN=http://localhost:3001"

if [[ -n "${RAZORPAY_KEY_ID:-}" && -n "${RAZORPAY_KEY_SECRET:-}" ]]; then
  upsert_env_file "$ROOT/web/.env.local" \
    "RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}" \
    "RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}"

  upsert_env_file "$ROOT/backend/.env" \
    "RAZORPAY_KEY_ID=${RAZORPAY_KEY_ID}" \
    "RAZORPAY_KEY_SECRET=${RAZORPAY_KEY_SECRET}"
fi
