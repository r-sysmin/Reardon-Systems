#!/usr/bin/env node
/**
 * Rotate Stripe RAK: secret_key_next → secret_key; old → secret_key_previous.
 * Usage: ENV=prod pnpm vault:rotate-stripe
 */
import { appEnv, kvRead, kvWrite, stripePath } from "./vault-lib.mjs";

const { app, env } = appEnv();
const path = stripePath();
const data = (await kvRead(path)) || {};

const next = data.secret_key_next;
if (!next) {
  throw new Error(
    `No secret_key_next at ${path}. Set warmup RAK before rotating.`,
  );
}

const previous = data.secret_key || "";
const updated = {
  ...data,
  secret_key: next,
  secret_key_next: "",
  secret_key_previous: previous,
};

await kvWrite(path, updated, { merge: false });
console.log(`Rotated Stripe RAK at ${path} (${app}/${env})`, {
  promoted_next: true,
  previous_retained: Boolean(previous),
});
console.log("Next: pnpm vault:pull — then revoke previous key in Stripe after soak.");
