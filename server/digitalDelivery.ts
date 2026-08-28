import type { Express } from "express";
import Stripe from "stripe";
import { digitalAssetsForProducts } from "./digitalProducts";
import { storageGetSignedUrl } from "./storage";

function stripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured.");
  return new Stripe(secretKey);
}

export function registerDigitalDeliveryRoutes(app: Express) {
  app.get("/api/digital/delivery", async (req, res) => {
    try {
      const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";
      if (!/^cs_(test|live)_[A-Za-z0-9_]+$/.test(sessionId)) {
        return res.status(400).json({ error: "A valid Stripe Checkout Session is required." });
      }

      const session = await stripeClient().checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return res.status(403).json({ error: "Downloads become available after payment is confirmed." });
      }

      const productIds = (session.metadata?.product_ids || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);
      const assets = digitalAssetsForProducts(productIds);
      const downloads = await Promise.all(
        assets.map(async asset => ({
          label: asset.label,
          filename: asset.filename,
          url: await storageGetSignedUrl(asset.key),
        })),
      );

      return res.json({ downloads });
    } catch (error) {
      console.error("[Digital delivery] Unable to create download links", error instanceof Error ? error.message : error);
      return res.status(400).json({ error: "Unable to verify this purchase." });
    }
  });
}
