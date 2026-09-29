#!/usr/bin/env node
/**
 * Materialize .env from HashiCorp Vault KV v2.
 * Usage: APP=reardon-systems ENV=prod pnpm vault:pull
 */
import {
  PRESERVE_LOCAL_KEYS,
  kvRead,
  readLocalEnv,
  stripePath,
  webhooksPath,
  writeEnvAtomic,
  appEnv,
} from "./vault-lib.mjs";

const { app, env } = appEnv();
const local = readLocalEnv();

const stripe = (await kvRead(stripePath())) || {};
const webhooks = (await kvRead(webhooksPath())) || {};

const entries = [
  ["STRIPE_SECRET_KEY", stripe.secret_key || ""],
  ["STRIPE_SECRET_KEY_NEXT", stripe.secret_key_next || ""],
  ["PUBLIC_STRIPE_PUBLISHABLE_KEY", stripe.publishable_key || ""],
  ["PUBLIC_STRIPE_PRICING_TABLE_ID", stripe.pricing_table_id || ""],
  ["STRIPE_WEBHOOK_SECRET", webhooks.stripe_signing_secret || ""],
];

for (const key of PRESERVE_LOCAL_KEYS) {
  if (local[key] !== undefined) {
    entries.push([key, local[key]]);
  }
}

writeEnvAtomic(entries, [
  `# Materialized from Vault — do not treat as source of truth`,
  `# APP=${app} ENV=${env} paths: ${stripePath()} + ${webhooksPath()}`,
  `# Re-pull: pnpm vault:pull   Rotate RAK: pnpm vault:rotate-stripe`,
  `# See docs/secrets-vault.md`,
]);

const present = Object.fromEntries(
  entries.map(([k, v]) => [k, v ? "set" : "empty"]),
);
console.log(`Wrote .env from Vault (${app}/${env})`, present);
