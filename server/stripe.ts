import express, { type Express, type Request } from "express";
import Stripe from "stripe";
import { normalizeCheckoutItems } from "./stripeProducts";
import { verifyShippingQuote } from "./shippo";
import { upsertCommerceOrder } from "./db";

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured.");
  return new Stripe(secretKey);
}

function getSafeOrigin(req: Request): string {
  const requestedOrigin = req.get("origin");
  if (requestedOrigin) {
    try {
      const url = new URL(requestedOrigin);
      const trustedHost =
        url.hostname === "themekielmitchell.com" ||
        url.hostname === "www.themekielmitchell.com" ||
        url.hostname.endsWith(".manus.space") ||
        url.hostname.endsWith(".manus.computer") ||
        (url.hostname === "localhost" && url.protocol === "http:");
      if (trustedHost) return url.origin;
    } catch {
      // Use the known published origin below when Origin is malformed.
    }
  }
  return "https://themekielmitchell.com";
}

export function registerStripeRoutes(app: Express) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const signature = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (typeof signature !== "string" || !webhookSecret) {
      return res.status(400).json({ error: "Webhook signature verification is unavailable." });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (error) {
      console.warn("[Stripe] Invalid webhook signature", error instanceof Error ? error.message : "unknown error");
      return res.status(400).json({ error: "Invalid webhook signature." });
    }

    if (event.id.startsWith("evt_test_")) {
      console.log("[Stripe] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await upsertCommerceOrder({
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
        productIds: session.metadata?.product_ids || "",
        shippoShipmentId: session.metadata?.shippo_shipment_id || null,
        shippoRateId: session.metadata?.shippo_rate_id || null,
        fulfillmentStatus: session.metadata?.shippo_rate_id ? "ready" : "pending",
      });
      console.log("[Stripe] Checkout completed", {
        eventId: event.id,
        sessionId: session.id,
        paymentStatus: session.payment_status,
      });
    }

    return res.json({ received: true });
  });

  app.post("/api/stripe/checkout", express.json({ limit: "50kb" }), async (req, res) => {
    try {
      const items = normalizeCheckoutItems(req.body?.items);
      const hasPhysicalItems = items.some(item => item.product.category !== "digital");
      const shippingQuote = hasPhysicalItems
        ? verifyShippingQuote(typeof req.body?.shippingQuoteToken === "string" ? req.body.shippingQuoteToken : "")
        : null;
      const productIds = items.map(item => item.id);
      const checkoutMetadata = {
        source: "mekiel-mitchell-site",
        product_ids: productIds.join(","),
        shippo_rate_id: shippingQuote?.rateId || "",
        shippo_shipment_id: shippingQuote?.shipmentId || "",
        shipping_provider: shippingQuote?.provider || "",
        shipping_service: shippingQuote?.service || "",
      };
      const origin = getSafeOrigin(req);
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        line_items: items.map(({ product, quantity }) => ({
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: product.unitAmount,
            product_data: { name: product.name },
          },
        })),
        allow_promotion_codes: true,
        billing_address_collection: "auto",
        customer_creation: "always",
        phone_number_collection: { enabled: hasPhysicalItems },
        shipping_address_collection: hasPhysicalItems ? { allowed_countries: ["US"] } : undefined,
        shipping_options: shippingQuote
          ? [
              {
                shipping_rate_data: {
                  type: "fixed_amount",
                  fixed_amount: { amount: shippingQuote.amount, currency: "usd" },
                  display_name: `${shippingQuote.provider} ${shippingQuote.service}`,
                  delivery_estimate: shippingQuote.estimatedDays
                    ? {
                        minimum: { unit: "business_day", value: Math.max(1, shippingQuote.estimatedDays - 1) },
                        maximum: { unit: "business_day", value: shippingQuote.estimatedDays + 2 },
                      }
                    : undefined,
                },
              },
            ]
          : undefined,
        success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?checkout=cancel`,
        metadata: checkoutMetadata,
        payment_intent_data: { metadata: checkoutMetadata },
      });

      if (!session.url) throw new Error("Stripe did not return a checkout URL.");
      return res.json({ url: session.url });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start checkout.";
      console.error("[Stripe] Checkout creation failed", message);
      return res.status(400).json({ error: message });
    }
  });
}
