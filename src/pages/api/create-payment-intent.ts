import type { APIRoute } from "astro";
import {
  getPayableSpecOpsPlan,
  parseBillingInterval,
  resolvePlanPrice,
} from "../../lib/specops-catalog";
import { getStripe } from "../../lib/stripe";

export const prerender = false;

/**
 * Create a PaymentIntent for a Spec Ops plan (month or year) and return
 * client_secret for the Payment Element.
 */
export const POST: APIRoute = async ({ request }) => {
  let body: { planId?: string; interval?: string } = {};
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const planId = body.planId;
  if (!planId || typeof planId !== "string") {
    return new Response(JSON.stringify({ error: "planId is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const interval = parseBillingInterval(body.interval);
  const plan = getPayableSpecOpsPlan(planId);
  const price = plan ? resolvePlanPrice(plan, interval) : null;

  if (!plan || !price) {
    return new Response(
      JSON.stringify({
        error:
          "Unknown or non-payable plan/interval. Use pro, pro-plus, or business with month|year.",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  try {
    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: price.amount,
      currency: plan.currency,
      automatic_payment_methods: { enabled: true },
      description: `${plan.stripe.productName} (${interval})`,
      metadata: {
        planId: plan.id,
        tier: String(plan.tier),
        productName: plan.stripe.productName,
        interval,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        planId: plan.id,
        interval,
        productName: plan.stripe.productName,
        displayPrice: price.display,
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  } catch (err) {
    console.error("[create-payment-intent]", err);
    return new Response(
      JSON.stringify({
        error: "Unable to start payment. Try again or contact support.",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
};
