# Spec Ops Stripe catalog copy

Paste into Stripe **Product** name + description. Create **two Prices** per product (month + year) in test mode.

**Naming (standard):** `Spec Ops Tier N <Name>`

| Tier | Product name | Monthly | Annual |
|------|----------------|---------|--------|
| 1 | Spec Ops Tier 1 Pro | $99/mo | $990/yr |
| 2 | Spec Ops Tier 2 Pro+ | $199/mo | $1,990/yr |
| 3 | Spec Ops Tier 3 Business | $399/mo | $3,990/yr |
| 4 | Spec Ops Tier 4 Enterprise | Custom | Custom |

**Hard limit:** Product description ≤ **299 characters**. Statement descriptor ≤ **22**.  
Stripe `marketing_features`: up to **15** names, each ≤ **80** chars (sync script clamps).

**API sync (preferred for Products/Prices/features):** from repo root with Stripe CLI logged in:

```bash
pnpm stripe:sync-specops
```

Creates/updates Products, month+year Prices (lookup keys `specops_<plan>_<interval>`), and marketing features from `includes`. IDs land in `.data/stripe-catalog.json`.

**Stripe Pricing Table (embed on site):** Dashboard only — no create API.  
[Test mode Pricing tables](https://dashboard.stripe.com/test/pricing-tables) → add Pro / Pro+ / Business → copy `prctbl_…` into `PUBLIC_STRIPE_PRICING_TABLE_ID`. Site mounts `<stripe-pricing-table>` when `PUBLIC_SPECOPS_BETA=false`.

Machine-readable: [`src/content/specops-plans/catalog.yaml`](../src/content/specops-plans/catalog.yaml)

---

## Spec Ops Tier 1 Pro — $99/mo · $990/yr (184 chars)

**Was:** Solo

**Product name:** `Spec Ops Tier 1 Pro`

**Description (≤299 — paste into Stripe Product description):**

```
All-in-one for solo inspectors: offline field app, unlimited reports, scheduling, CRM, payments, plus website with domain, hosting, and SSL. One bill. No stack tax. No per-report fees.
```

**Feature list:**

- 1 inspector seat
- Unlimited inspections and reports
- Mobile + desktop app with full offline mode and auto-sync
- Full reporting suite — PDF and interactive client portal
- Digital pre-inspection agreements with e-signatures
- Scheduling and calendar
- Client and agent CRM
- Automated email and SMS notifications
- Integrated payment collection (Stripe, PayPal, Square)
- Professional website included — template site, domain, hosting, SSL, maintenance
- Online booking widget
- Email support (24-hour response)
- 30-day free trial

**Prices (cents):** month `9900` · year `99000`

**Statement descriptor:** `Spec Ops T1 Pro`

---

## Spec Ops Tier 2 Pro+ — $199/mo · $1,990/yr (230 chars)

**Was:** Pro

**Product name:** `Spec Ops Tier 2 Pro+`

**Description (≤299 — paste into Stripe Product description):**

```
For growing solo and small firms (up to 3 seats). Everything in Tier 1 Pro, plus AI reports and photo analysis, automation, QuickBooks, custom branding, agent referral tracking, priority support, and competitor template migration.
```

**Feature list:**

Everything in Tier 1 Pro, plus:

- Up to 3 inspector seats
- AI report summaries and voice-first report writing
- AI photo analysis (auto-identifies defects)
- Advanced automation workflows (email sequences, inspection logic)
- QuickBooks Online integration
- Custom branding on reports and client portal
- Agent referral tracking dashboard
- Priority support (4-hour response)
- Template migration assistance from Spectora, HomeGauge, HIP, or Palm-Tech
- Larger website allowance vs Tier 1 Pro
- 30-day free trial

**Prices (cents):** month `19900` · year `199000`

**Statement descriptor:** `Spec Ops T2 Pro+` → Stripe stores `Spec Ops T2 ProP` (`+` not allowed on statement descriptors)

---

## Spec Ops Tier 3 Business — $399/mo · $3,990/yr (230 chars)

**Product name:** `Spec Ops Tier 3 Business`

**Description (≤299 — paste into Stripe Product description):**

```
For multi-inspector firms (4–8 seats). Everything in Tier 2 Pro+, plus white-label, payroll splits, financial reporting, API access, onboarding, and priority async support. One platform for field, back office, and online presence.
```

**Feature list:**

Everything in Tier 2 Pro+, plus:

- Up to 8 inspector seats
- White-label branding (logo, colors, custom domain for client portal)
- Payroll periods and pay splits for multi-inspector organizations
- Advanced financial reporting (per-inspector revenue, commission tracking)
- API access for custom integrations
- Onboarding assistance
- Priority async / email support (phone when staffed)
- 30-day free trial

**Prices (cents):** month `39900` · year `399000`

**Statement descriptor:** `Spec Ops T3 Biz`

---

## Spec Ops Tier 4 Enterprise — Custom

**Product name:** `Spec Ops Tier 4 Enterprise` — **no self-serve checkout**

**Description (≤299 — paste into Stripe Product description):**

```
For large firms and franchises (9+ inspectors). Everything in Tier 3 Business, plus unlimited seats, multi-location, custom integrations, 99.9% SLA, training, and dedicated support. Custom pricing — contact sales.
```

**Feature list:**

Everything in Tier 3 Business, plus:

- Unlimited inspector seats
- Multi-location support
- Custom feature development (as available)
- SLA-backed uptime guarantee (99.9%)
- On-site or virtual training for your team
- Custom integrations and data migration
- Dedicated account management and priority support

**CTA:** `/contact`

**Statement descriptor:** `Spec Ops T4 Ent`
