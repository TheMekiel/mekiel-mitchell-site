import type Stripe from "stripe";
import { digitalAssetsForProducts } from "./digitalProducts";
import { STRIPE_PRODUCTS } from "./stripeProducts";

const KIT_API_BASE_URL = "https://api.kit.com/v4";
const PUBLIC_SITE_ORIGIN = (
  process.env.PUBLIC_SITE_ORIGIN || "https://themekielmitchell.com"
).replace(/\/+$/, "");

export const PURCHASE_TAGS = {
  digital: "Purchased – Digital",
  physical: "Purchased – Physical",
  ebook: "Purchased – GHFP eBook",
} as const;

export const PURCHASE_TAG_IDS = {
  digital: 25680326,
  physical: 25680370,
  ebook: 25217102,
} as const;

type KitResponse = Record<string, unknown>;
type KitSubscriber = {
  id: number;
  first_name: string | null;
  email_address: string;
};
type KitTag = { id: number; name: string };

export type KitPurchaseDeliveryOptions = {
  /** Field-only repair/backfill. Never lists, creates, removes, or applies tags. */
  applyPurchaseTags?: boolean;
};

export type KitPurchaseDeliveryResult =
  | {
      ok: true;
      status: "queued" | "fields_updated";
      email: string;
      subscriberId: number;
      downloadUrl: string | null;
      tagsApplied: string[];
    }
  | { ok: false; reason: string };

function getKitApiKey() {
  return process.env.KIT_V4_API_KEY || process.env.KIT_API_KEY || "";
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

async function kitRequest(
  path: string,
  init: RequestInit = {}
): Promise<KitResponse> {
  const apiKey = getKitApiKey();
  if (!apiKey) throw new Error("Kit purchase handoff is not configured.");

  let response: Response;
  try {
    response = await fetch(`${KIT_API_BASE_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(15_000),
      headers: {
        "Content-Type": "application/json",
        "X-Kit-Api-Key": apiKey,
        ...(init.headers || {}),
      },
    });
  } catch {
    throw new Error("Kit purchase handoff is temporarily unavailable.");
  }
  if (!response.ok)
    throw new Error(`Kit purchase handoff failed (HTTP ${response.status}).`);
  try {
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body as KitResponse;
  } catch {
    throw new Error("Kit returned an invalid purchase handoff response.");
  }
}

async function listKitRecords<T>(path: string, key: string): Promise<T[]> {
  const records: T[] = [];
  const cursors = new Set<string>();
  let after = "";
  do {
    const url = new URL(`${KIT_API_BASE_URL}${path}`);
    if (after) url.searchParams.set("after", after);
    const payload = await kitRequest(
      `${url.pathname.replace("/v4", "")}${url.search}`
    );
    const pagination = payload.pagination as
      | { has_next_page?: boolean; end_cursor?: string }
      | undefined;
    if (
      !Array.isArray(payload[key]) ||
      typeof pagination?.has_next_page !== "boolean"
    ) {
      throw new Error("Kit returned an invalid list response.");
    }
    records.push(...(payload[key] as T[]));
    if (!pagination.has_next_page) break;
    if (!pagination.end_cursor || cursors.has(pagination.end_cursor)) {
      throw new Error("Kit returned an invalid pagination cursor.");
    }
    after = pagination.end_cursor;
    cursors.add(after);
  } while (after);
  return records;
}

function requireSubscriber(payload: KitResponse): KitSubscriber {
  const subscriber = payload.subscriber as KitSubscriber | undefined;
  if (
    !subscriber ||
    !Number.isInteger(subscriber.id) ||
    subscriber.id <= 0 ||
    typeof subscriber.email_address !== "string" ||
    (subscriber.first_name !== null &&
      typeof subscriber.first_name !== "string")
  ) {
    throw new Error("Kit did not return a valid subscriber.");
  }
  return subscriber;
}

async function findOrCreateSubscriber(email: string): Promise<KitSubscriber> {
  // The documented lookup defaults to active; status=all also finds opted-out
  // and suppressed subscribers. Do not reactivate them or overwrite their name.
  const query = new URLSearchParams({ email_address: email, status: "all" });
  const subscribers = await listKitRecords<KitSubscriber>(
    `/subscribers?${query}`,
    "subscribers"
  );
  const existing = subscribers.find(
    subscriber =>
      subscriber.email_address?.toLowerCase() === email.toLowerCase()
  );
  if (existing) return requireSubscriber({ subscriber: existing });

  // Omit first_name even on creation: list results are eventually consistent,
  // so this upsert might find an existing subscriber whose name must survive.
  // State is never supplied; Kit's upsert cannot update an existing state.
  return requireSubscriber(
    await kitRequest("/subscribers", {
      method: "POST",
      body: JSON.stringify({ email_address: email }),
    })
  );
}

async function applyTags(subscriberId: number, names: string[]) {
  for (const name of names) {
    const tagId =
      name === PURCHASE_TAGS.digital
        ? PURCHASE_TAG_IDS.digital
        : name === PURCHASE_TAGS.physical
          ? PURCHASE_TAG_IDS.physical
          : name === PURCHASE_TAGS.ebook
            ? PURCHASE_TAG_IDS.ebook
            : 0;
    if (!tagId) throw new Error("Kit purchase tag mapping is incomplete.");
    // Use the verified tag IDs directly. This avoids name/encoding drift and
    // prevents a paid retry from creating a duplicate tag.
    await kitRequest(`/tags/${tagId}/subscribers/${subscriberId}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }
}

/** Kit API acceptance is not proof that an automation entered or an email sent. */
export async function syncKitPurchaseDelivery(
  session: Stripe.Checkout.Session,
  { applyPurchaseTags = true }: KitPurchaseDeliveryOptions = {}
): Promise<KitPurchaseDeliveryResult> {
  // Defense in depth: callers, including backfills, cannot bypass payment.
  if (session.payment_status !== "paid")
    return { ok: false, reason: "Payment is not confirmed." };

  const productIds = sessionProductIds(session);
  if (
    !productIds.length ||
    productIds.some(id => !Object.hasOwn(STRIPE_PRODUCTS, id))
  ) {
    return {
      ok: false,
      reason: "Stripe did not provide recognized order products.",
    };
  }
  const email = getCustomerEmail(session).trim();
  if (!email)
    return { ok: false, reason: "Stripe did not provide a customer email." };
  if (!getKitApiKey())
    return { ok: false, reason: "Kit purchase handoff is not configured." };

  const hasDigital = productIds.some(
    id => STRIPE_PRODUCTS[id].category === "digital"
  );
  const hasPhysical = productIds.some(
    id => STRIPE_PRODUCTS[id].category !== "digital"
  );
  const hasEbook =
    productIds.includes("ghfp-ebook") || productIds.includes("ghfp-bundle");
  const downloadUrl = digitalAssetsForProducts(productIds).length
    ? buildPurchaseDownloadsUrl(session.id)
    : null;
  const shippingCarrier = hasPhysical
    ? [
        session.metadata?.shipping_provider?.trim(),
        session.metadata?.shipping_service?.trim(),
      ]
        .filter(Boolean)
        .join(" ")
    : "";
  const subscriber = await findOrCreateSubscriber(email);
  const firstName = subscriber.first_name?.trim()
    ? undefined
    : getFirstName(session);
  const updated = await kitRequest(`/subscribers/${subscriber.id}`, {
    method: "PUT",
    body: JSON.stringify({
      email_address: subscriber.email_address,
      ...(firstName ? { first_name: firstName } : {}),
      fields: {
        order_link: downloadUrl || "",
        shipping_carrier: shippingCarrier,
      },
    }),
  });
  // Some Kit responses ignore unknown field keys with warnings. Do not tag a
  // subscriber until the existing fields were accepted; never create fields.
  if (Array.isArray(updated.warnings) && updated.warnings.length) {
    throw new Error("Kit did not accept the existing purchase fields.");
  }
  requireSubscriber(updated);

  const tagsApplied = applyPurchaseTags
    ? [
        hasDigital ? PURCHASE_TAGS.digital : "",
        hasPhysical ? PURCHASE_TAGS.physical : "",
        hasEbook ? PURCHASE_TAGS.ebook : "",
      ].filter(Boolean)
    : [];
  if (applyPurchaseTags) await applyTags(subscriber.id, tagsApplied);

  return {
    ok: true,
    status: applyPurchaseTags ? "queued" : "fields_updated",
    email,
    subscriberId: subscriber.id,
    downloadUrl,
    tagsApplied,
  };
}

export function logPurchaseDeliveryFailure(result: KitPurchaseDeliveryResult) {
  if (!result.ok)
    console.warn(`[Kit] Purchase handoff was not accepted: ${result.reason}`);
}
