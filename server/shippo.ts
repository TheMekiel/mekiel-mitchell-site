import { createHmac, timingSafeEqual } from "crypto";
import type { Express, Request } from "express";
import { normalizeCheckoutItems, type CheckoutItem } from "./stripeProducts";
import { updateCommerceOrderTracking } from "./db";

const SHIPPO_API = "https://api.goshippo.com";
const SHIPPO_VERSION = "2018-02-08";
const QUOTE_TTL_MS = 30 * 60 * 1000;

export type ShippingAddress = {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: "US";
  email?: string;
  phone?: string;
};

type ParcelProfile = {
  length: string;
  width: string;
  height: string;
  distance_unit: "in";
  weight: string;
  mass_unit: "lb";
};

export type ShippingQuote = {
  rateId: string;
  shipmentId: string;
  amount: number;
  currency: "USD";
  provider: string;
  service: string;
  estimatedDays: number | null;
  expiresAt: number;
};

function parseJsonEnv<T>(name: string): T | null {
  const value = process.env[name];
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${name} must contain valid JSON.`);
  }
}

function quoteSecret(): string {
  return process.env.JWT_SECRET || "";
}

function encode(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function signShippingQuote(quote: ShippingQuote): string {
  const secret = quoteSecret();
  if (!secret) throw new Error("Shipping quote signing is not configured.");
  const payload = encode(JSON.stringify(quote));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyShippingQuote(token: string): ShippingQuote {
  const secret = quoteSecret();
  if (!secret) throw new Error("Shipping quote signing is not configured.");
  const [payload, suppliedSignature, extra] = token.split(".");
  if (!payload || !suppliedSignature || extra) throw new Error("Invalid shipping quote.");
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const suppliedBuffer = Buffer.from(suppliedSignature);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    throw new Error("Invalid shipping quote.");
  }
  const quote = JSON.parse(decode(payload)) as ShippingQuote;
  if (!quote.rateId || !Number.isInteger(quote.amount) || quote.amount < 0 || quote.currency !== "USD") {
    throw new Error("Invalid shipping quote.");
  }
  if (!quote.expiresAt || quote.expiresAt < Date.now()) throw new Error("Shipping quote expired. Please refresh rates.");
  return quote;
}

export function normalizeShippingAddress(input: unknown): ShippingAddress {
  if (!input || typeof input !== "object") throw new Error("A shipping address is required.");
  const value = input as Record<string, unknown>;
  const required = ["name", "street1", "city", "state", "zip"] as const;
  const result: Record<string, string> = {};
  for (const field of required) {
    const entry = typeof value[field] === "string" ? value[field].trim() : "";
    if (!entry || entry.length > 120) throw new Error(`A valid shipping ${field} is required.`);
    result[field] = entry;
  }
  const country = typeof value.country === "string" ? value.country.trim().toUpperCase() : "US";
  if (country !== "US") throw new Error("Shipping is currently available only within the United States.");
  const state = result.state.toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) throw new Error("Use a two-letter U.S. state code.");
  if (!/^\d{5}(-\d{4})?$/.test(result.zip)) throw new Error("Enter a valid U.S. ZIP code.");
  const optional = (field: "street2" | "email" | "phone") => {
    const entry = typeof value[field] === "string" ? value[field].trim() : "";
    return entry ? entry.slice(0, 160) : undefined;
  };
  return {
    name: result.name,
    street1: result.street1,
    street2: optional("street2"),
    city: result.city,
    state,
    zip: result.zip,
    country: "US",
    email: optional("email"),
    phone: optional("phone"),
  };
}

function shippingConfiguration(items: CheckoutItem[]) {
  const apiKey = process.env.SHIPPO_API_KEY;
  const origin = parseJsonEnv<ShippingAddress>("SHIPPO_ORIGIN_JSON");
  const profiles = parseJsonEnv<Record<string, ParcelProfile>>("SHIPPO_PACKAGE_PROFILES_JSON");
  const missing: string[] = [];
  if (!apiKey) missing.push("Shippo API key");
  if (!origin) missing.push("fulfillment origin");
  if (!profiles) missing.push("package profiles");
  const parcels: ParcelProfile[] = [];
  if (profiles) {
    for (const { product, quantity } of items) {
      if (!product.shippingProfile) continue;
      const profile = profiles[product.shippingProfile];
      if (!profile) {
        missing.push(`package profile: ${product.shippingProfile}`);
        continue;
      }
      for (let index = 0; index < quantity; index += 1) parcels.push(profile);
    }
  }
  return { apiKey, origin, profiles, parcels, missing: Array.from(new Set(missing)) };
}

async function shippoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const apiKey = process.env.SHIPPO_API_KEY;
  if (!apiKey) throw new Error("Shippo is not configured.");
  const response = await fetch(`${SHIPPO_API}${path}`, {
    ...init,
    headers: {
      Authorization: `ShippoToken ${apiKey}`,
      "Shippo-API-Version": SHIPPO_VERSION,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.detail === "string" ? body.detail : "Shippo could not calculate rates.";
    throw new Error(message);
  }
  return body as T;
}

type ShippoRate = {
  object_id: string;
  amount: string;
  currency: string;
  provider: string;
  estimated_days?: number | null;
  servicelevel?: { name?: string; token?: string };
};

type ShippoShipment = {
  object_id: string;
  status: string;
  rates?: ShippoRate[];
  messages?: Array<{ text?: string }>;
};

export async function createShippingQuotes(itemsInput: unknown, addressInput: unknown) {
  const items = normalizeCheckoutItems(itemsInput);
  const physicalItems = items.filter(item => item.product.category !== "digital");
  if (physicalItems.length === 0) return { rates: [], testMode: true };
  const addressTo = normalizeShippingAddress(addressInput);
  const config = shippingConfiguration(physicalItems);
  if (config.missing.length) {
    throw new Error(`Live shipping rates need configuration: ${config.missing.join(", ")}.`);
  }
  const shipment = await shippoRequest<ShippoShipment>("/shipments/", {
    method: "POST",
    body: JSON.stringify({
      address_from: config.origin,
      address_to: { ...addressTo, validate: true },
      parcels: config.parcels,
      async: false,
      metadata: "Mekiel Mitchell website checkout rate quote",
    }),
  });
  if (shipment.status === "ERROR") {
    throw new Error(shipment.messages?.map(message => message.text).filter(Boolean).join(" ") || "Shippo rejected the shipment details.");
  }
  const expiresAt = Date.now() + QUOTE_TTL_MS;
  const rates = (shipment.rates || [])
    .filter(rate => rate.currency === "USD" && Number.isFinite(Number(rate.amount)))
    .map(rate => {
      const quote: ShippingQuote = {
        rateId: rate.object_id,
        shipmentId: shipment.object_id,
        amount: Math.round(Number(rate.amount) * 100),
        currency: "USD",
        provider: rate.provider,
        service: rate.servicelevel?.name || rate.servicelevel?.token || "Shipping",
        estimatedDays: typeof rate.estimated_days === "number" ? rate.estimated_days : null,
        expiresAt,
      };
      return { ...quote, token: signShippingQuote(quote) };
    })
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 6);
  if (!rates.length) throw new Error("No shipping rates were returned for this address.");
  return { rates, testMode: process.env.SHIPPO_API_KEY?.startsWith("shippo_test_") ?? false };
}

export function registerShippoRoutes(app: Express) {
  app.get("/api/shippo/status", (_req, res) => {
    const items = normalizeCheckoutItems([{ id: "ghfp-paperback", qty: 1 }]);
    const config = shippingConfiguration(items);
    res.json({
      authenticated: Boolean(config.apiKey),
      testMode: config.apiKey?.startsWith("shippo_test_") ?? false,
      readyForRates: config.missing.length === 0,
      missing: config.missing,
    });
  });

  app.post("/api/shippo/rates", async (req, res) => {
    try {
      return res.json(await createShippingQuotes(req.body?.items, req.body?.address));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to calculate shipping rates.";
      return res.status(400).json({ error: message });
    }
  });

  app.post("/api/shippo/webhook/:token", async (req, res) => {
    const expected = process.env.SHIPPO_WEBHOOK_TOKEN || "";
    const supplied = req.params.token || "";
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    if (!expected || expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      return res.status(401).json({ error: "Unauthorized webhook." });
    }
    const event = req.body as { event?: string; data?: Record<string, unknown> };
    if (!event?.event || !event.data) return res.status(400).json({ error: "Invalid webhook payload." });
    if (event.event === "transaction_updated") {
      const transactionId = typeof event.data.object_id === "string" ? event.data.object_id : "";
      const trackingNumber = typeof event.data.tracking_number === "string" ? event.data.tracking_number : null;
      const trackingUrl = typeof event.data.tracking_url_provider === "string" ? event.data.tracking_url_provider : null;
      const status = typeof event.data.status === "string" ? event.data.status.toUpperCase() : "";
      if (transactionId) {
        await updateCommerceOrderTracking({
          shippoTransactionId: transactionId,
          trackingNumber,
          trackingUrl,
          fulfillmentStatus: status === "SUCCESS" ? "label_purchased" : "exception",
        });
      }
    }
    console.log("[Shippo] Webhook received", { event: event.event });
    return res.json({ received: true });
  });
}
