---
name: api-as-skill
description: >-
  Treat a vendor API (OpenAPI/spec docs + SDK + MCP/docs search) as an
  installable skill substrate when wiring backends. Use when scaffolding
  payment, billing, auth, or any third-party API integration; when the user
  says the API should be a skill, wants a server stubbed from the spec, or
  points at docs.stripe.com/development, MCP, or agent tooling. Prefer this
  over inventing paste/Dashboard-only flows when an SDK or MCP exists.
disable-model-invocation: false
---

# API as skill (instant expertise)

## Thesis (verbatim)

The API should be a skill when you are wiring backends up. Simple as getting the spec doc and you have the entire server stubbed out and ready to go immediately, with embedded indexed working knowlegebase as the memory substrate. It's an instant expertise.

## What that means

When wiring a backend against a vendor API:

1. **Install the knowledge substrate first** — official agent skills, MCP server, CLI docs search, and/or vendored `SKILL.md` + references. That *is* the memory: indexed, current, authoritative.
2. **Read the routing skill before writing code** — which product surface (Checkout vs PaymentIntent vs Billing, etc.), which webhooks are required, which traps to avoid.
3. **Stub the server from the spec** — SDK client, route handlers, webhook verifier, env placeholders, fulfillment log. Do not invent a parallel “manual Dashboard paste” path when Products/Prices/Sessions exist on the API.
4. **Keep Dashboard-only objects honest** — if a resource has no public create API (e.g. Stripe Pricing Tables), say so once, wire the embed + IDs, and use the API for everything that *is* creatable.
5. **Re-sync from the substrate** — when docs/skills update, prefer `stripe docs`, MCP `search_stripe_documentation` / `stripe_api_*`, or skill references over memory.

## Bootstrap checklist (any API)

```text
[ ] Locate official agent entry (docs …/development, …/agents, …/mcp, skills index)
[ ] Install plugin/MCP/skills into this agent (e.g. /add-plugin stripe)
[ ] Pull or vendor the skill pack into the repo (.agents/skills/…)
[ ] Open the best-practices / integration-routing skill; pick the correct product
[ ] Instantiate the official SDK client (no global API keys)
[ ] Stub: create/read resources, webhook endpoint + signature verify, .env.example
[ ] Fulfill from webhooks, not success-page redirects
[ ] Document Dashboard-only leftovers as IDs in env, not as the integration core
```

## Stripe (worked example)

Substrate:

- https://docs.stripe.com/development
- https://docs.stripe.com/agents
- https://docs.stripe.com/mcp
- Skills: `stripe-best-practices`, `stripe-docs` (and billing/payments references)
- CLI: `stripe docs`, `stripe docs api …`
- Node SDK: `stripe` package, pin API version from the SDK

Subscriptions / Spec Ops SaaS routing:

| Need | Use |
|------|-----|
| Catalog | Products + Prices + `marketing_features` via SDK/API |
| Customer-facing price UI | [Pricing Table](https://docs.stripe.com/payments/checkout/pricing-table) embed (`prctbl_…`) — Dashboard create, API for products underneath |
| Checkout | Checkout Sessions (`mode: subscription`) via Pricing Table or Sessions API — not raw renewing PaymentIntents |
| Fulfillment | Webhooks required: `checkout.session.*`, `customer.subscription.*`, `invoice.*` |

Repo hooks (Reardon-Systems):

- `pnpm stripe:sync-specops` — SDK sync from `catalog.yaml`
- `PUBLIC_STRIPE_PRICING_TABLE_ID` — embed on `/products/specops#pricing`
- `AGENTS.md` — Stripe agent stack section

## Anti-patterns

- Building a bespoke HTML “pricing table” and calling it done while ignoring Stripe Pricing Tables
- Shelling random Dashboard paste docs when MCP/SDK can create Products/Prices
- Treating webhooks as optional
- Hardcoding `payment_method_types` (except Terminal)
- Using shared test-mode casually for new work when sandboxes exist
- Trusting chat memory over `stripe docs` / skill references

## When invoked

1. Name the API and load its skill/MCP substrate before editing application code.
2. Stub the minimal server surface from the spec.
3. Only then customize product copy, URLs, and Dashboard-only IDs.
