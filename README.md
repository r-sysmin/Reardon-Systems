# Reardon Systems

Marketing site for Reardon Systems — selective cloud repatriation and private
platforms for mid-market teams.

## Stack

- **Astro 5** — static site, zero JS by default
- **Tailwind v4** — CSS-first config via `@theme` in `src/styles/global.css`
- **Content Layer API** — all repeated content lives in `src/content/` with Zod
  schemas in `src/content.config.ts`
- **Inter** — loaded from rsms.me during dev; swap to self-hosting before launch

## Local development

```bash
pnpm install
pnpm dev
```

Site runs at `http://localhost:4321`.

## Build

```bash
pnpm build
pnpm preview
```

Output goes to `dist/`.

## Project structure

```
src/
├── content.config.ts         # Zod schemas for all collections
├── content/
│   ├── ladder/               # Homepage ladder (4 files, one per stage)
│   ├── engagements/          # Full engagement detail (includes/needs/exit)
│   ├── faqs/                 # FAQs grouped by page (homepage, engagements, ...)
│   └── posts/                # Blog posts as Markdown
├── layouts/Base.astro        # HTML shell, nav, footer
├── components/               # Nav, Footer, CostCurve, ui/*
├── lib/                      # cn() helper, nav links
└── pages/                    # Routes
```

## Editing content

**To change a price, timeline, or ladder stage:**  
edit the corresponding YAML file in `src/content/ladder/` or  
`src/content/engagements/`. Both the homepage ladder and the Engagements page  
read from these files, so the change propagates everywhere in the next build.

**To add or edit an FAQ:**  
edit the relevant file in `src/content/faqs/`. Each file has a `page` field  
(`homepage`, `engagements`, `company`, `contact`, `specops`) and an `items`  
array.

**To publish a blog post:**  
add a `.md` file to `src/content/posts/`. Required frontmatter:

```yaml
---
title: "Post title"
category: "Platforms"
readTime: "14 min read"
date: 2026-09-04
summary: "One sentence that appears on the index and in search results."
featured: false
---
```

Set `featured: true` on exactly one post to feature it at the top of the blog
index.

## Build-time validation

The Zod schemas in `src/content.config.ts` run at build time. If you add a
ladder stage without a `price` field, or an engagement without an `includes`
array, `pnpm build` fails with an error naming the file. This is intentional.

## Deployment

### Static (default)

The site builds to pure static HTML. Deploy `dist/` to any static host:

- **Netlify** — `netlify deploy --prod --dir=dist`
- **Vercel** — `vercel deploy --prod`
- **Cloudflare Pages** — build command `pnpm build`, output `dist`
- **GitHub Pages** — use `withastro/action`

### Forms

The contact form and SpecOps waitlist form have placeholder `action="ACTION_URL"`
attributes. Before launch, replace with a form service (Formspree, Basin, Netlify
Forms) or an Astro adapter + API route.

## Spec Ops Stripe (Pricing Table + Payment Element)

Catalog copy: [`docs/specops-stripe-catalog.md`](docs/specops-stripe-catalog.md)  
Machine-readable: [`src/content/specops-plans/catalog.yaml`](src/content/specops-plans/catalog.yaml)

### 1. Sync Products / Prices / marketing features (API)

```bash
# requires authenticated Stripe CLI (`stripe login`) — test/sandbox
pnpm stripe:sync-specops
```

Idempotent. Writes IDs to `.data/stripe-catalog.json` (gitignored).

### 2. Create a Stripe Pricing Table (Dashboard — no public API)

1. Open [Product catalog → Pricing tables](https://dashboard.stripe.com/test/pricing-tables) (test mode).
2. **+ Create pricing table**.
3. Add **Pro**, **Pro+**, **Business** (month + year prices). Add **Enterprise** with **custom call-to-action** (Contact sales → `/contact`) — no price on that column.
4. Display settings: highlight Pro+ if you want; marketing features come from each Product.
5. Payment settings: success URL → `/products/specops?checkout=success`, cancel → `/products/specops#pricing`.
6. **Copy code** → grab `pricing-table-id="prctbl_…"`.

### 3. Env (via HashiCorp Vault)

Secrets live in Vault — see [`docs/secrets-vault.md`](docs/secrets-vault.md). Do not commit `.env`.

```bash
export VAULT_ADDR=…          # or: pnpm vault:bootstrap-dev (local smoke only)
pnpm vault:pull              # writes .env from apps/reardon-systems/<env>/…
# first-time seed from a local .env: pnpm vault:push
```

[`.env.example`](.env.example) documents:

- `STRIPE_SECRET_KEY` / `STRIPE_SECRET_KEY_NEXT` (active + rotation warmup)
- `PUBLIC_STRIPE_PUBLISHABLE_KEY` / `PUBLIC_STRIPE_PRICING_TABLE_ID`
- `STRIPE_WEBHOOK_SECRET`
- Keep `PUBLIC_SPECOPS_BETA=true` (default): Pricing Table visible, Buy → waitlist. Set `false` only when self-serve Checkout should go live.

### 4. Local smoke

```bash
pnpm dev
stripe listen --forward-to localhost:4321/api/stripe-webhook
```

Webhook records `checkout.session.completed` (Pricing Table) and `payment_intent.succeeded` (Payment Element checkout at `/products/specops/checkout`) into `.data/stripe-fulfillments.jsonl`.

**Deploy note:** marketing pages stay prerendered; checkout + `/api/*` need the Node adapter (`@astrojs/node`).

## Pre-launch checklist

- [ ] Team section on `/company` has placeholder titles, no names
- [ ] Locations on `/company` need real cities
- [ ] Contact form action
- [ ] SpecOps waitlist form action (must accept multipart)
- [ ] Blog subscribe action
- [ ] Replace rsms.me font loading with self-hosted Inter
- [ ] Stripe test keys + webhook verified end-to-end
- [x] Spec Ops Product catalog synced via `pnpm stripe:sync-specops` (sandbox)

## Colophon

Copy written for mid-market infrastructure buyers. No thought leadership.
No transformation programs. Show us the bill that hurts.
