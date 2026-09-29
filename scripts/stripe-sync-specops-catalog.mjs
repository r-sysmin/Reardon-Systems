#!/usr/bin/env node
/**
 * Sync Spec Ops catalog.yaml → Stripe Products + Prices + marketing_features
 * using the official Stripe Node SDK (not Dashboard paste).
 *
 * Auth (first match):
 *   STRIPE_SECRET_KEY / STRIPE_API_KEY env
 *   else Stripe CLI (`stripe` must be logged in) via temporary key from
 *   `stripe config --list` is NOT used — pass a key or export STRIPE_API_KEY.
 *
 * Pricing Tables are Dashboard-only (no public create API). After sync:
 *   Dashboard → Product catalog → Pricing tables → embed prctbl_…
 *   @see https://docs.stripe.com/payments/checkout/pricing-table
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_… pnpm stripe:sync-specops
 *   pnpm stripe:sync-specops -- --dry-run
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";
import { ApiVersion } from "stripe/esm/apiVersion.js";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const catalogPath = join(root, "src/content/specops-plans/catalog.yaml");
const outPath = join(root, ".data/stripe-catalog.json");
const dryRun = process.argv.includes("--dry-run");

const DESC_MAX = 299;
const FEATURE_NAME_MAX = 80;
const FEATURE_MAX = 15;
const STATEMENT_MAX = 22;

function resolveApiKey() {
  return (
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_API_KEY ||
    process.env.STRIPE_RESTRICTED_KEY ||
    ""
  );
}

function getStripe() {
  const key = resolveApiKey();
  if (!key) {
    throw new Error(
      [
        "Missing STRIPE_SECRET_KEY / STRIPE_API_KEY.",
        "Export a test/sandbox restricted or secret key, then re-run.",
        "Example: STRIPE_SECRET_KEY=sk_test_… pnpm stripe:sync-specops",
        "Or: stripe agent setup + Stripe MCP (https://docs.stripe.com/mcp).",
      ].join("\n"),
    );
  }
  return new Stripe(key, {
    apiVersion: ApiVersion,
    typescript: true,
    appInfo: {
      name: "Reardon-Systems SpecOps catalog sync",
      version: "0.1.0",
    },
  });
}

/** @param {string} s @param {number} max */
function clamp(s, max) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

function sanitizeStatementDescriptor(raw) {
  return clamp(
    raw.replace(/\+/g, "P").replace(/[^a-zA-Z0-9 .]/g, ""),
    STATEMENT_MAX,
  );
}

/** @param {string[]} includes */
function toMarketingFeatures(includes) {
  return includes.slice(0, FEATURE_MAX).map((name) => ({
    name: clamp(name, FEATURE_NAME_MAX),
  }));
}

/**
 * @param {Stripe} stripe
 * @param {string} planId
 */
async function findProductByPlanId(stripe, planId) {
  const result = await stripe.products.search({
    query: `metadata['specops_plan_id']:'${planId}' AND active:'true'`,
    limit: 10,
  });
  const data = [...result.data].sort((a, b) => a.created - b.created);
  return data[0] ?? null;
}

/**
 * @param {Stripe} stripe
 * @param {string} lookupKey
 */
async function findPriceByLookupKey(stripe, lookupKey) {
  const active = await stripe.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
  });
  if (active.data[0]) return active.data[0];
  const inactive = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: false,
    limit: 1,
  });
  return inactive.data[0] ?? null;
}

function priceProductId(price) {
  return typeof price.product === "string" ? price.product : price.product.id;
}

async function upsertProduct(stripe, plan, existing) {
  const description = clamp(plan.stripe.description, DESC_MAX);
  const statement = sanitizeStatementDescriptor(plan.stripe.statementDescriptor);
  const marketing_features = toMarketingFeatures(plan.includes);

  const params = {
    name: plan.stripe.productName,
    description,
    statement_descriptor: statement,
    active: true,
    metadata: {
      specops_plan_id: plan.id,
      tier: String(plan.tier),
      plan_name: plan.name,
      checkout: plan.checkout,
      seats: plan.seats,
    },
    marketing_features,
  };

  if (dryRun) {
    console.log(
      `[dry-run] ${existing ? "update" : "create"} product`,
      plan.stripe.productName,
      `(${marketing_features.length} features)`,
    );
    return existing ?? { id: `dry_prod_${plan.id}` };
  }

  if (existing) {
    return stripe.products.update(existing.id, params);
  }
  return stripe.products.create(params);
}

async function upsertPrice(stripe, plan, productId, interval, pricePoint) {
  const lookupKey = `specops_${plan.id.replace(/-/g, "_")}_${interval}`;
  const existing = await findPriceByLookupKey(stripe, lookupKey);

  if (existing) {
    const same =
      existing.unit_amount === pricePoint.amount &&
      existing.recurring?.interval === interval &&
      priceProductId(existing) === productId;

    if (same) {
      if (!existing.active && !dryRun) {
        const reactivated = await stripe.prices.update(existing.id, {
          active: true,
        });
        console.log(`  reactivated ${lookupKey} → ${reactivated.id}`);
        return reactivated;
      }
      console.log(`  price ok ${lookupKey} → ${existing.id}`);
      return existing;
    }
    console.log(`  replacing ${lookupKey} (was ${existing.id})`);
  }

  if (dryRun) {
    console.log(`[dry-run] create price ${lookupKey} ${pricePoint.amount}`);
    return { id: `dry_price_${plan.id}_${interval}`, lookup_key: lookupKey };
  }

  const price = await stripe.prices.create({
    currency: plan.currency,
    product: productId,
    unit_amount: pricePoint.amount,
    nickname: `${plan.stripe.productName} ${pricePoint.display}`,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: {
      specops_plan_id: plan.id,
      interval,
    },
  });
  console.log(`  price ${lookupKey} → ${price.id}`);
  return price;
}

async function main() {
  const plans = parseYaml(readFileSync(catalogPath, "utf8"));
  if (!Array.isArray(plans)) {
    throw new Error("catalog.yaml must be a list of plans");
  }

  console.log(
    dryRun
      ? "Dry run — no Stripe writes"
      : `Syncing Spec Ops catalog via Stripe Node SDK (API ${ApiVersion})…`,
  );

  if (dryRun && !resolveApiKey()) {
    for (const plan of plans) {
      console.log(`\n→ ${plan.stripe.productName}`);
      console.log(
        `[dry-run] product (${Math.min(plan.includes.length, FEATURE_MAX)} marketing_features)`,
      );
      for (const interval of ["month", "year"]) {
        const point = plan.prices?.[interval];
        if (!point) continue;
        console.log(
          `[dry-run] price specops_${plan.id.replace(/-/g, "_")}_${interval} ${point.amount}`,
        );
      }
    }
    console.log("\nDry run complete (no API key — catalog parse only).");
    return;
  }

  const stripe = getStripe();
  /** @type {Record<string, object>} */
  const synced = {};

  for (const plan of plans) {
    console.log(`\n→ ${plan.stripe.productName}`);
    const existing = dryRun ? null : await findProductByPlanId(stripe, plan.id);
    const product = await upsertProduct(stripe, plan, existing);
    console.log(
      `  product ${product.id}${existing ? " (updated)" : " (created)"}`,
    );

    /** @type {Record<string, string | null>} */
    const priceIds = { month: null, year: null };
    for (const interval of ["month", "year"]) {
      const point = plan.prices?.[interval];
      if (!point || typeof point.amount !== "number") continue;
      const price = await upsertPrice(
        stripe,
        plan,
        product.id,
        interval,
        point,
      );
      priceIds[interval] = price.id;
    }

    if (plan.checkout === "contact") {
      console.log(
        "  (Enterprise — product only; Pricing Table custom CTA → /contact)",
      );
    }

    synced[plan.id] = {
      planId: plan.id,
      name: plan.name,
      productId: product.id,
      productName: plan.stripe.productName,
      statementDescriptor: sanitizeStatementDescriptor(
        plan.stripe.statementDescriptor,
      ),
      marketingFeatureCount: Math.min(plan.includes.length, FEATURE_MAX),
      prices: priceIds,
      checkout: plan.checkout,
    };
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        syncedAt: new Date().toISOString(),
        apiVersion: ApiVersion,
        mode: dryRun ? "dry-run" : "sdk",
        plans: synced,
        next: {
          pricingTable:
            "Dashboard → Product catalog → Pricing tables (no API). Embed PUBLIC_STRIPE_PRICING_TABLE_ID.",
          docs: "https://docs.stripe.com/payments/checkout/pricing-table",
          mcp: "https://docs.stripe.com/mcp — run /add-plugin stripe in Cursor",
        },
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`\nWrote ${outPath}`);
  console.log(
    "\nNext: create Pricing Table in Dashboard with these products, then set PUBLIC_STRIPE_PRICING_TABLE_ID.",
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
