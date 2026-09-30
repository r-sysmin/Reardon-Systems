## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Secrets (HashiCorp Vault)

**Vault is the source of truth.** `.env` is materialized via `pnpm vault:pull` — never wipe or blank secrets to “clean up.” Full protocol: [`docs/secrets-vault.md`](docs/secrets-vault.md).

```bash
export VAULT_ADDR=…   # or local: pnpm vault:bootstrap-dev
pnpm vault:pull       # ENV=prod|dev
# Seed / update from local .env: pnpm vault:push
# Promote STRIPE_SECRET_KEY_NEXT → active: pnpm vault:rotate-stripe
```

## Stripe (required for Spec Ops billing)

Official agent stack: https://docs.stripe.com/development · https://docs.stripe.com/agents · https://docs.stripe.com/mcp

**Load first:** skill `api-as-skill` — the API is the indexed expertise substrate; stub the server from the spec before inventing UI.

1. In Cursor chat, run **`/add-plugin stripe`** (enables Stripe MCP + skills).
2. Workspace skills also live under `.agents/skills/stripe-best-practices` and `stripe-docs`.
3. Prefer **Stripe Node SDK** (`stripe` package) + MCP `stripe_api_*` tools over inventing Dashboard paste flows.
4. Spec Ops is **subscriptions** → Billing Prices + [Pricing Table](https://docs.stripe.com/payments/checkout/pricing-table) → Checkout Sessions. Do **not** model renewals as raw PaymentIntents.
5. Catalog sync: `STRIPE_SECRET_KEY=sk_test_… pnpm stripe:sync-specops` (SDK). Pricing Table UI is Dashboard-only (`prctbl_…` → `PUBLIC_STRIPE_PRICING_TABLE_ID`).
6. Webhooks are required (`checkout.session.*`, `customer.subscription.*`, `invoice.*`).

## Git commit messages (no Cursor co-author)

Agents must **not** add `Co-authored-by:` trailers that mention Cursor or `cursoragent@cursor.com`, and must not use `git commit --trailer` for attribution.

Enforcement: tracked hooks in `.githooks/` (`commit-msg` rejects; `prepare-commit-msg` strips injection). After clone, `pnpm install` or `pnpm hooks:install` sets `core.hooksPath=.githooks`. Bypassing hooks with `--no-verify` is prohibited for agent commits.

Removing attribution from **already pushed** commits requires an explicit history-rewrite request from the operator.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
