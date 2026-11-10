import type { Express } from "express";
import Stripe from "stripe";
import {
  digitalAssetForDownloadCode,
  digitalAssetsForProducts,
  downloadCodeForAsset,
} from "./digitalProducts";
import {
  buildPurchaseDownloadsUrl,
  logPurchaseDeliveryFailure,
  syncKitPurchaseDelivery,
} from "./kitPurchaseDelivery";
import { storageGetSignedUrl } from "./storage";

function stripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error("Stripe is not configured.");
  return new Stripe(secretKey);
}

function isSessionId(value: string) {
  return /^cs_(test|live)_[A-Za-z0-9_]+$/.test(value);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] || character
  );
}

class PublicDownloadError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

function publicDownloadError(error: unknown) {
  return error instanceof PublicDownloadError
    ? { status: error.status, message: error.message }
    : {
        status: 502,
        message:
          "Unable to verify this purchase or prepare downloads. Please try again.",
      };
}

async function getPaidSession(sessionId: string) {
  if (!isSessionId(sessionId))
    throw new PublicDownloadError(
      400,
      "A valid Stripe Checkout Session is required."
    );
  const session = await stripeClient().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid")
    throw new PublicDownloadError(
      403,
      "Downloads become available after payment is confirmed."
    );
  return session;
}

export function registerDigitalDeliveryRoutes(app: Express) {
  app.get("/api/digital/delivery", async (req, res) => {
    try {
      const sessionId =
        typeof req.query.session_id === "string" ? req.query.session_id : "";
      const session = await getPaidSession(sessionId);

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
        }))
      );

      let kitHandoffAccepted = false;
      try {
        // Webhook is primary. Refreshes/backfills repair fields only and must
        // not apply tags, add forms, or attempt to retrigger an automation.
        const result = await syncKitPurchaseDelivery(session, {
          applyPurchaseTags: false,
        });
        logPurchaseDeliveryFailure(result);
        kitHandoffAccepted = result.ok;
      } catch (error) {
        console.warn(
          "[Kit] Field-only purchase handoff was not accepted:",
          error instanceof Error ? error.message : "unknown error"
        );
      }

      res.set("Cache-Control", "no-store");
      return res.json({ downloads, kitHandoffAccepted });
    } catch (error) {
      console.error(
        "[Digital delivery] Unable to create download links",
        error instanceof Error ? error.message : error
      );
      const { status, message } = publicDownloadError(error);
      return res.status(status).json({ error: message });
    }
  });

  app.get("/api/digital/downloads", async (req, res) => {
    try {
      const sessionId =
        typeof req.query.session_id === "string" ? req.query.session_id : "";
      const session = await getPaidSession(sessionId);
      const productIds = (session.metadata?.product_ids || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);
      const assets = digitalAssetsForProducts(productIds);
      if (!assets.length)
        return res.status(404).send("This order contains no digital products.");

      const links = assets
        .map(asset => {
          const code = downloadCodeForAsset(asset.key);
          if (!code) return "";
          const url = new URL(
            "/api/digital/download",
            buildPurchaseDownloadsUrl(session.id)
          );
          url.search = "";
          url.searchParams.set("session_id", session.id);
          url.searchParams.set("asset", code);
          return `<li><a href="${escapeHtml(url.toString())}">${escapeHtml(asset.label)} →</a></li>`;
        })
        .filter(Boolean)
        .join("");

      res.set("Cache-Control", "no-store");
      res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Your Mekiel Mitchell downloads</title>
    <style>
      body { margin: 0; padding: 48px 20px; background: #060f22; color: #fafaf7; font: 16px/1.6 Arial, sans-serif; }
      main { max-width: 620px; margin: 0 auto; }
      h1 { color: #d4af37; font-weight: 500; }
      a { display: block; margin: 16px 0; padding: 14px 18px; border: 1px solid #d4af37; color: #d4af37; text-decoration: underline; }
      a:hover { background: #d4af37; color: #060f22; }
      .note { color: #c0c7d1; }
    </style>
  </head>
  <body><main>
    <h1>Your digital purchase is ready.</h1>
    <p class="note">Use the links below to download the digital products included in your order.</p>
    <ul>${links}</ul>
  </main></body>
</html>`);
    } catch (error) {
      const { status, message } = publicDownloadError(error);
      return res.status(status).send(message);
    }
  });

  app.get("/api/digital/download", async (req, res) => {
    try {
      const sessionId =
        typeof req.query.session_id === "string" ? req.query.session_id : "";
      const code = typeof req.query.asset === "string" ? req.query.asset : "";
      const session = await getPaidSession(sessionId);
      const productIds = (session.metadata?.product_ids || "")
        .split(",")
        .map(value => value.trim())
        .filter(Boolean);
      const asset = digitalAssetForDownloadCode(productIds, code);
      if (!asset)
        return res.status(404).send("That download is not part of this order.");
      res.set("Cache-Control", "no-store");
      return res.redirect(307, await storageGetSignedUrl(asset.key));
    } catch (error) {
      const { status, message } = publicDownloadError(error);
      return res.status(status).send(message);
    }
  });
}
