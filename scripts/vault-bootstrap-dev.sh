#!/usr/bin/env bash
# Local-only Vault bootstrap for tooling smoke tests — NOT for production secrets.
# Prefers Vault CLI (`vault server -dev`); falls back to Docker hashicorp/vault.
set -euo pipefail

ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
ROOT_TOKEN="${VAULT_DEV_ROOT_TOKEN_ID:-reardon-dev-root}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TOKEN_FILE="$ROOT_DIR/.vault-token"
LOG=/tmp/reardon-vault-dev.log
PID_FILE=/tmp/reardon-vault-dev.pid
NAME="${VAULT_BOOTSTRAP_NAME:-reardon-vault-dev}"

export PATH="${HOME}/.local/bin:${PATH}"

wait_healthy() {
  for _ in $(seq 1 50); do
    if curl -sf "${ADDR}/v1/sys/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.2
  done
  return 1
}

start_cli() {
  command -v vault >/dev/null 2>&1 || return 1
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
  fi
  pkill -f 'vault server -dev' 2>/dev/null || true
  nohup vault server -dev \
    -dev-listen-address=127.0.0.1:8200 \
    -dev-root-token-id="$ROOT_TOKEN" \
    >"$LOG" 2>&1 &
  echo $! >"$PID_FILE"
  wait_healthy
}

start_docker() {
  command -v docker >/dev/null 2>&1 || return 1
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d --name "$NAME" \
    -p 8200:8200 \
    -e "VAULT_DEV_ROOT_TOKEN_ID=$ROOT_TOKEN" \
    -e VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200 \
    hashicorp/vault:1.18 \
    server -dev >/dev/null
  wait_healthy
}

if start_cli; then
  MODE=cli
elif start_docker; then
  MODE=docker
else
  echo "Need Vault CLI (~/.local/bin/vault) or Docker to bootstrap" >&2
  exit 1
fi

export VAULT_ADDR="$ADDR"
export VAULT_TOKEN="$ROOT_TOKEN"
if command -v vault >/dev/null 2>&1; then
  vault secrets enable -path=secret kv-v2 2>/dev/null || true
else
  curl -sf -H "X-Vault-Token: $ROOT_TOKEN" \
    -d '{"type":"kv","options":{"version":"2"}}' \
    "$ADDR/v1/sys/mounts/secret" >/dev/null 2>&1 || true
fi

printf '%s\n' "$ROOT_TOKEN" >"$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

cat <<EOF
Vault dev ($MODE) listening at $ADDR
Root token written to .vault-token (gitignored)
export VAULT_ADDR=$ADDR
export VAULT_TOKEN=$ROOT_TOKEN

Seed:  ENV=prod pnpm vault:push
Pull:  ENV=prod pnpm vault:pull
EOF
