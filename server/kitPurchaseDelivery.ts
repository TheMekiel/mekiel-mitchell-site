import type Stripe from "stripe";
import { digitalAssetsForProducts } from "./digitalProducts";

const KIT_API_BASE_URL = "https://api.kit.com/v4";
const DEFAULT_PURCHASE_FORM_ID = 9849297;
const DEFAULT_DOWNLOADS_FIELD_KEY = "purchase_downloads_url";
const PUBLIC_SITE_ORIGIN = (process.env.PUBLIC_SITE_ORIGIN || "https://themekielmitchell.com").replace(
  /\/+$/,
  "",
);

type KitResponse = Record<string, unknown>;

export type KitPurchaseDeliveryResult =
  | { ok: true; email: string; formId: number; downloadUrl: string }
  | { ok: false; reason: string };

let purchaseFieldPromise: Promise<string> | null = null;

function getKitApiKey() {
  return process.env.KIT_V4_API_KEY || process.env.KIT_API_KEY || "";
}

function getPurchaseFormId() {
  const configured = Number.parseInt(process.env.KIT_PURCHASE_FORM_ID || "", 10);
  return Number.isInteger(configured) && configured > 0 ? configured : DEFAULT_PURCHASE_FORM_ID;
}

function getPurchaseFieldKeyOverride() {
  return process.env.KIT_PURCHASE_DOWNLOADS_FIELD_KEY?.trim() || "";
}

function sessionProductIds(session: Stripe.Checkout.Session) {
  return (session.metadata?.product_ids || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

function getCustomerEmail(session: Stripe.Checkout.Session) {
  return session.customer_details?.email || session.customer_email || "";
}

function getFirstName(session: Stripe.Checkout.Session) {
  const name = session.customer_details?.name?.trim() || "";
  return name ? name.split(/\s+/)[0] : undefined;
}

export function buildPurchaseDownloadsUrl(sessionId: string) {
  const url = new URL("/api/digital/downloads", `${PUBLIC_SITE_ORIGIN}/`);
  url.searchParams.set("session_id", sessionId);
  return url.toString();
}

async function kitRequest(path: string, init: RequestInit = {}) {
  const apiKey = getKitApiKey();
  if (!apiKey) throw new Error("KIT_API_KEY is not configured.");

  const response = await fetch(`${KIT_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Kit-Api-Key": apiKey,
      ...(init.headers || {}),
    },
  });
  const bodyText = await response.text();
  let body: KitResponse = {};
  if (bodyText) {
    try {
      body = JSON.parse(bodyText) as KitResponse;
    } catch {
      body = { raw: bodyText };
    }
  }
  if (!response.ok) {
    const errors = Array.isArray(body.errors) ? body.errors.join(", ") : bodyText || response.statusText;
    throw new Error(`Kit request failed (${response.status}): ${errors}`);
  }
  return body;
}

async function getPurchaseDownloadsFieldKey() {
  const override = getPurchaseFieldKeyOverride();
  if (override) return override;
  if (!purchaseFieldPromise) {
    purchaseFieldPromise = kitRequest("/custom_fields", {
      method: "POST",
      body: JSON.stringify({ label: "Purchase Downloads URL" }),
    }).then(payload => {
      const field = payload.custom_field as { key?: string } | undefined;
      if (!field?.key) throw new Error("Kit did not return the purchase-download custom-field key.");
      return field.key;
    });
  }
  return purchaseFieldPromise;
}

export async function sendPurchaseDeliveryEmail(
  session: Stripe.Checkout.Session,
): Promise<KitPurchaseDeliveryResult> {
  const productIds = sessionProductIds(session);
  if (!digitalAssetsForProducts(productIds).length) return { ok: false, reason: "No digital products in session." };

  const email = getCustomerEmail(session).trim();
  if (!email) return { ok: false, reason: "Stripe did not provide a customer email." };

  const apiKey = getKitApiKey();
  if (!apiKey) return { ok: false, reason: "KIT_API_KEY is not configured." };

  const downloadUrl = buildPurchaseDownloadsUrl(session.id);
  const fieldKey = await getPurchaseDownloadsFieldKey();
  const formId = getPurchaseFormId();

  await kitRequest("/subscribers", {
    method: "POST",
    body: JSON.stringify({
      email_address: email,
      first_name: getFirstName(session),
      state: "active",
      fields: { [fieldKey]: downloadUrl },
    }),
  });

  await kitRequest(`/forms/${formId}/subscribers`, {
    method: "POST",
    body: JSON.stringify({
      email_address: email,
      referrer: `${PUBLIC_SITE_ORIGIN}/?checkout=success`,
    }),
  });

  return { ok: true, email, formId, downloadUrl };
}

export function logPurchaseDeliveryFailure(sessionId: string, result: KitPurchaseDeliveryResult) {
  if (!result.ok) {
    console.warn(`[Kit] Purchase delivery was not sent for ${sessionId}: ${result.reason}`);
  }
}
