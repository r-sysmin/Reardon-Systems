import Stripe from "stripe";

/** Matches stripe@22.6.2 (`stripe/esm/apiVersion.js`). */
const API_VERSION = "2026-08-26.dahlia" as const;

/**
 * Stripe Node SDK client — instance pattern, never a global API key.
 * @see https://docs.stripe.com/sdks
 * @see https://docs.stripe.com/agents
 * @see https://docs.stripe.com/mcp
 */
export function getStripe(): Stripe {
  // Runtime secret, not a build-time PUBLIC_ value. import.meta.env would
  // inline this (as empty) at build time; read process.env so the running
  // container picks it up from its environment.
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Prefer a restricted/agent key (rk_) from the Stripe Dashboard; test/sandbox first.",
    );
  }
  return new Stripe(key, {
    apiVersion: API_VERSION,
    typescript: true,
    appInfo: {
      name: "Reardon-Systems SpecOps",
      version: "0.1.0",
      url: "https://github.com/r-sysmin/Reardon-Systems",
    },
  });
}
