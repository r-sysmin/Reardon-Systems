#!/usr/bin/env node
/**
 * Push local .env Stripe/webhook fields into Vault KV v2 (seed / update).
 * Usage: ENV=prod pnpm vault:push
 *
 * Loose unprefixed rk_/sk_ lines in .env are treated as STRIPE_SECRET_KEY_NEXT
 * when NEXT is otherwise empty (migration from rotation paste).
 */
import {
  appEnv,
  kvWrite,
  readLocalEnv,
  stripePath,
  webhooksPath,
  ENV_PATH,
} from "./vault-lib.mjs";
import fs from "node:fs";

const { app, env } = appEnv();
const local = readLocalEnv();

// Recover alternate key pasted as a bare line (no KEY=)
let next = local.STRIPE_SECRET_KEY_NEXT || "";
if (!next && fs.existsSync(ENV_PATH)) {
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  for (const line of raw.split(/\n/)) {
    const t = line.trim();
    if (/^r?k_(live|test)_/.test(t) && !t.includes("=")) {
      next = t;
      break;
    }
  }
}

const stripeData = {};
if (local.STRIPE_SECRET_KEY) stripeData.secret_key = local.STRIPE_SECRET_KEY;
if (next) stripeData.secret_key_next = next;
if (local.PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  stripeData.publishable_key = local.PUBLIC_STRIPE_PUBLISHABLE_KEY;
}
if (local.PUBLIC_STRIPE_PRICING_TABLE_ID) {
  stripeData.pricing_table_id = local.PUBLIC_STRIPE_PRICING_TABLE_ID;
}

if (Object.keys(stripeData).length === 0) {
  throw new Error(`No Stripe fields in ${ENV_PATH} to push`);
}

await kvWrite(stripePath(), stripeData, { merge: true });
console.log(`Pushed stripe → ${stripePath()} (${app}/${env})`, {
  fields: Object.keys(stripeData),
});

if (local.STRIPE_WEBHOOK_SECRET) {
  await kvWrite(
    webhooksPath(),
    { stripe_signing_secret: local.STRIPE_WEBHOOK_SECRET },
    { merge: true },
  );
  console.log(`Pushed webhooks → ${webhooksPath()}`);
} else {
  console.log("No STRIPE_WEBHOOK_SECRET locally; skipped webhooks path");
}
