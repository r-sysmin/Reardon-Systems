import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { APIRoute } from "astro";
import type Stripe from "stripe";
import { getStripe } from "../../lib/stripe";

export const prerender = false;

const fulfillmentLog = join(
  fileURLToPath(new URL("../../../.data", import.meta.url)),
  "stripe-fulfillments.jsonl",
);

function appendFulfillment(record: Record<string, unknown>) {
  mkdirSync(dirname(fulfillmentLog), { recursive: true });
  appendFileSync(
    fulfillmentLog,
    JSON.stringify({ at: new Date().toISOString(), ...record }) + "\n",
  );
}

/**
 * Fulfill Pricing Table / Checkout Sessions only when payment isn't unpaid.
 * @see https://docs.stripe.com/checkout/fulfillment
 */
function fulfillCheckoutSession(
  eventId: string,
  source: string,
  session: Stripe.Checkout.Session,
) {
  if (session.payment_status === "unpaid") return;
  appendFulfillment({
    source,
    eventId,
    sessionId: session.id,
    mode: session.mode,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency,
    customer: session.customer,
    customerEmail:
      session.customer_details?.email ?? session.customer_email,
    subscription: session.subscription,
    clientReferenceId: session.client_reference_id,
    metadata: session.metadata,
  });
}

/**
 * Stripe webhooks — required for Pricing Table subscriptions + Payment Element.
 * @see https://docs.stripe.com/billing/subscriptions/webhooks
 * @see https://docs.stripe.com/payments/checkout/pricing-table
 */
export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get("stripe-signature");
  // Runtime secret: read process.env so the running container supplies it
  // (import.meta.env is inlined at build time and would be empty here).
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new Response(
      JSON.stringify({
        error:
          "Missing stripe-signature header or STRIPE_WEBHOOK_SECRET env var.",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const rawBody = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      fulfillCheckoutSession(
        event.id,
        "checkout.session.completed",
        event.data.object,
      );
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      fulfillCheckoutSession(
        event.id,
        "checkout.session.async_payment_succeeded",
        event.data.object,
      );
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      appendFulfillment({
        source: "checkout.session.async_payment_failed",
        eventId: event.id,
        sessionId: session.id,
        paymentStatus: session.payment_status,
        customer: session.customer,
      });
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object;
      appendFulfillment({
        source: event.type,
        eventId: event.id,
        subscriptionId: subscription.id,
        status: subscription.status,
        customer: subscription.customer,
        items: subscription.items.data.map((item) => ({
          priceId: item.price.id,
          productId:
            typeof item.price.product === "string"
              ? item.price.product
              : item.price.product.id,
        })),
      });
      break;
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subscriptionRef =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ?? null;
      appendFulfillment({
        source: event.type,
        eventId: event.id,
        invoiceId: invoice.id,
        subscription: subscriptionRef,
        customer: invoice.customer,
        amountPaid: invoice.amount_paid,
        amountDue: invoice.amount_due,
      });
      break;
    }
    case "payment_intent.succeeded": {
      // Legacy Payment Element path (/products/specops/checkout)
      const paymentIntent = event.data.object;
      appendFulfillment({
        source: "payment_intent.succeeded",
        eventId: event.id,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        customer: paymentIntent.customer,
      });
      break;
    }
    default: {
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};
