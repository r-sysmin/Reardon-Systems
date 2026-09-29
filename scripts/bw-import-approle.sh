#!/usr/bin/env bash
# Import Reardon Systems AppRole creds into the Bitwarden/Vaultwarden vault.
#
# Reads ~/.vault-approle.json and creates one login item per env:
#   reardon-systems-vault-approle-prod
#   reardon-systems-vault-approle-dev
# Item shape (what scripts/vault-lib.mjs expects):
#   login.username = role_id
#   fields.secret_id = secret_id
#   notes = { "secret_id": "..." }
#
# Usage:
#   bw login --raw            # once; prints the session key
#   export BW_SESSION=...     # or: bw unlock --raw
#   scripts/bw-import-approle.sh
set -euo pipefail
export PATH="${HOME}/.nvm/versions/node/v20.20.2/bin:${PATH}"

SRC="${VAULT_APPROLE_FILE:-$HOME/.vault-approle.json}"
[ -f "$SRC" ] || { echo "No $SRC" >&2; exit 1; }
command -v bw >/dev/null || { echo "bw CLI not found on PATH" >&2; exit 1; }

bw status >/dev/null 2>&1 || true
if [ -z "${BW_SESSION:-}" ]; then
  echo "BW_SESSION not set. Run: bw login --raw  (or bw unlock --raw) and export it." >&2
  exit 1
fi

for env in prod dev; do
  rid=$(jq -r ".approle.${env}.role_id // empty" "$SRC")
  sid=$(jq -r ".approle.${env}.secret_id // empty" "$SRC")
  if [ -z "$rid" ] || [ -z "$sid" ]; then
    echo "skip ${env}: no role_id/secret_id in $SRC" >&2
    continue
  fi
  name="reardon-systems-vault-approle-${env}"
  # Reuse the existing item id if present (idempotent update).
  existing=$(bw get item "$name" --session "$BW_SESSION" --raw 2>/dev/null | jq -r '.id // empty' || true)

  template=$(bw get template item --session "$BW_SESSION")
  payload=$(jq -n \
    --arg name "$name" \
    --arg rid "$rid" \
    --arg sid "$sid" \
    --arg env "$env" \
    --arg notes "$(jq -nc --arg s "$sid" '{secret_id:$s}')" \
    --argjson base "$template" \
    '$base
     | .type = 1
     | .name = $name
     | .notes = $notes
     | .login = { username: $rid, password: null, uris: [] }
     | .fields = [ { name: "secret_id", value: $sid, type: 1 },
                   { name: "env", value: $env, type: 0 } ]')

  if [ -n "$existing" ]; then
    payload=$(printf '%s' "$payload" | jq --arg id "$existing" '.id = $id')
    printf '%s' "$payload" | bw encode | bw edit item "$existing" --session "$BW_SESSION" >/dev/null
    echo "updated  $name"
  else
    printf '%s' "$payload" | bw encode | bw create item --session "$BW_SESSION" >/dev/null
    echo "created  $name"
  fi
done

bw sync --session "$BW_SESSION" >/dev/null 2>&1 || true
echo "Done. Verify with: bw get item reardon-systems-vault-approle-prod --session \"\$BW_SESSION\""
