# Secrets vault (HashiCorp Vault)

**Source of truth:** HashiCorp Vault KV v2.  
**`.env` is a materialization only** — never commit it; never treat it as the vault.

## Production Vault (ccmm)

Single-node Vault runs on host **ccmm** (stack `/opt/hosting/sites/vault`,
container `vault`). Runbook: `/opt/hosting/sites/vault/RUNBOOK.md`.

| Caller | `VAULT_ADDR` |
|--------|--------------|
| Workstation / CI (Tailscale) | `http://100.106.32.41:8200` (or `http://ccmm:8200`) |
| Processes on ccmm | `http://127.0.0.1:8200` |

Listeners bind the loopback and Tailscale IPs only; Vault is not exposed on the
public internet. If Tailscale is down from the workstation, use the fallback
tunnel: `scripts/ccmm-vault-tunnel.sh` (then `VAULT_ADDR=http://127.0.0.1:8200`).

Local `vault server -dev` is for tooling smoke tests only — never real secrets.

## Auth

Preferred: **AppRole**. Credentials are looked up in this order:

1. `VAULT_ROLE_ID` + `VAULT_SECRET_ID` (env), else
2. `VAULT_APPROLE_FILE` (default `~/.vault-approle.json`, mode 600):

   ```json
   { "approle": { "prod": { "role_id": "…", "secret_id": "…" },
                  "dev":  { "role_id": "…", "secret_id": "…" } } }
   ```

   else
3. **Bitwarden/Vaultwarden** via the `bw` CLI, when `BW_SESSION` is set (or a
   `~/.bw-session` file holds the session key). It reads the login item
   `reardon-systems-vault-approle-<env>` (username = `role_id`, field
   `secret_id`). Seed it with [`scripts/bw-import-approle.sh`](../scripts/bw-import-approle.sh).
   else
4. `VAULT_TOKEN` / `~/.vault-token` as a last resort.

`vault:push|pull|rotate-stripe` log in with AppRole automatically (per `ENV`) and
never need the root token.

```bash
export VAULT_ADDR=http://100.106.32.41:8200
pnpm vault:pull        # APP=reardon-systems ENV=prod|dev
```

### Password manager (self-hosted Vaultwarden on ccmm)

Vaultwarden runs on ccmm at `https://ccmm.tailc4170.ts.net:8444` (Tailscale Serve,
loopback backend `127.0.0.1:8222`). Stack: `/opt/hosting/sites/vaultwarden`.
The `bw` CLI is installed on the workstation and configured against it:

```bash
bw login --raw            # once; prints the session key
export BW_SESSION=…       # or: bw unlock --raw
scripts/bw-import-approle.sh   # seed the AppRole items
pnpm vault:pull                # now works from the vault, no local creds file
```

## Path layout (KV v2)

Logical paths (CLI `vault kv` style — no `/data/` segment):

```text
org/shared/…                          # cross-app (rare)
apps/reardon-systems/prod/stripe
apps/reardon-systems/prod/webhooks
apps/reardon-systems/dev/stripe
apps/<app>/<env>/<domain>
```

### Stripe — `apps/reardon-systems/<env>/stripe`

| Field | Maps to `.env` | Notes |
|-------|----------------|-------|
| `secret_key` | `STRIPE_SECRET_KEY` | **Active** RAK (`rk_…`) |
| `secret_key_next` | `STRIPE_SECRET_KEY_NEXT` | Warmup / rotation alternate |
| `secret_key_previous` | (not pulled) | Short soak after rotate |
| `publishable_key` | `PUBLIC_STRIPE_PUBLISHABLE_KEY` | Vaulted for consistency |
| `pricing_table_id` | `PUBLIC_STRIPE_PRICING_TABLE_ID` | `prctbl_…` |

### Webhooks — `apps/reardon-systems/<env>/webhooks`

| Field | Maps to `.env` |
|-------|----------------|
| `stripe_signing_secret` | `STRIPE_WEBHOOK_SECRET` |

Non-secrets (e.g. `PUBLIC_SPECOPS_BETA`) stay in [`.env.example`](../.env.example) / local config, not Vault. Pull preserves them if already present in `.env`.

## Scripts

| Command | Script | Purpose |
|---------|--------|---------|
| `pnpm vault:pull` | `scripts/vault-pull-env.mjs` | Read Vault → write `.env` atomically |
| `pnpm vault:push` | `scripts/vault-push-env.mjs` | Seed/update Vault from local `.env` |
| `pnpm vault:rotate-stripe` | `scripts/vault-rotate-stripe.mjs` | Swap `next` → active; old → `previous` |

Env knobs: `APP` (default `reardon-systems`), `ENV` (default `prod`), `VAULT_KV_MOUNT` (default `secret`).

## Stripe RAK rotation

1. Create a new restricted key in the Stripe Dashboard (scopes as needed, e.g. `webhook_write`).
2. Put it in the warmup slot:  
   `vault kv patch secret/apps/reardon-systems/prod/stripe secret_key_next=rk_…`  
   or set `STRIPE_SECRET_KEY_NEXT` in `.env` and `pnpm vault:push`.
3. Optional: smoke with the next key.
4. `ENV=prod pnpm vault:rotate-stripe` — promotes `next` → `secret_key`, moves old to `secret_key_previous`, clears `next`.
5. After soak, revoke the previous key in Stripe.
6. `pnpm vault:pull` — never paste live keys into chat, Obsidian, or PRs.

## Agent rules

- Vault is SoT; `.env` is derived via `vault:pull`.
- **Never** delete, blank, or overwrite secret values to “clean up” without an explicit rotate/pull.
- Clearing “test stuff” means the **`dev`** Vault paths or config toggles — not wiping **prod** slots.
- Do not bake Stripe secrets into the static Docker image; pull only for processes that need server-side keys.

## Bootstrap (new Vault)

1. Run production-capable Vault (file/raft — not `vault server -dev` for real secrets).
2. `vault secrets enable -path=secret kv-v2`
3. Policies for `reardon-systems-dev` / `reardon-systems-prod` limited to `apps/reardon-systems/<env>/*`.
4. AppRoles; keep role-id/secret-id in an operator password manager (bootstrap only).
5. Seed: `ENV=prod pnpm vault:push` from a one-time local `.env`, then `pnpm vault:pull` to confirm.

See also [`scripts/vault-bootstrap-dev.sh`](../scripts/vault-bootstrap-dev.sh) for a **local-only** Docker bootstrap used for tooling smoke tests (not for production secrets).

## Production bootstrap done for ccmm (2026-09-29)

- Vault 1.18.4, file storage, KV v2 at `secret/`, 3-of-5 Shamir unseal.
- Policies `reardon-systems-prod` / `reardon-systems-dev`; AppRole roles of the same names.
- Seeded `apps/reardon-systems/prod/stripe` (active + next RAK, publishable, pricing table)
  and `apps/reardon-systems/prod/webhooks` (signing secret).
- Unseal keys, root token, and AppRole `secret_id`s are held by the operator only.
