#!/usr/bin/env bash
# Fallback path to ccmm Vault when Tailscale is down.
# Opens 127.0.0.1:8200 -> ccmm loopback:8200, then use VAULT_ADDR=http://127.0.0.1:8200.
set -euo pipefail
exec ssh -N -L 8200:127.0.0.1:8200 ccmm
