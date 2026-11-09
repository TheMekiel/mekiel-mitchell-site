import type Stripe from "stripe";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPurchaseDownloadsUrl, sendPurchaseDeliveryEmail } from "./kitPurchaseDelivery";

const originalApiKey = process.env.KIT_API_KEY;
const originalFieldKey = process.env.KIT_PURCHASE_DOWNLOADS_FIELD_KEY;

afterEach(() => {
  vi.restoreAllMocks();
  if (originalApiKey === undefined) delete process.env.KIT_API_KEY;
  else process.env.KIT_API_KEY = originalApiKey;
  if (originalFieldKey === undefined) delete process.env.KIT_PURCHASE_DOWNLOADS_FIELD_KEY;
  else process.env.KIT_PURCHASE_DOWNLOADS_FIELD_KEY = originalFieldKey;
});

describe("Kit purchase delivery", () => {
  it("builds a stable paid-session download hub URL", () => {
    expect(buildPurchaseDownloadsUrl("cs_live_123")).toBe(
      "https://themekielmitchell.com/api/digital/downloads?session_id=cs_live_123",
    );
  });

  it("upserts the customer download URL and triggers the purchase form", async () => {
    process.env.KIT_API_KEY = "test-kit-key";
    delete process.env.KIT_PURCHASE_DOWNLOADS_FIELD_KEY;

    const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        requests.push({ url, body });

        if (url.endsWith("/custom_fields")) {
          return new Response(JSON.stringify({ custom_field: { key: "purchase_downloads_url" } }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ subscriber: { id: 42 } }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const result = await sendPurchaseDeliveryEmail({
      id: "cs_live_123",
      metadata: { product_ids: "ghfp-ebook,ghfp-audio" },
      customer_details: { email: "buyer@example.com", name: "Buyer Example", address: null, tax_exempt: "none", tax_ids: [] },
      customer_email: "buyer@example.com",
    } as unknown as Stripe.Checkout.Session);

    expect(result).toMatchObject({ ok: true, email: "buyer@example.com", formId: 9849297 });
    expect(requests.map(request => request.url)).toEqual([
      "https://api.kit.com/v4/custom_fields",
      "https://api.kit.com/v4/subscribers",
      "https://api.kit.com/v4/forms/9849297/subscribers",
    ]);
    expect(requests[1].body).toMatchObject({
      email_address: "buyer@example.com",
      fields: { purchase_downloads_url: "https://themekielmitchell.com/api/digital/downloads?session_id=cs_live_123" },
    });
    expect(requests[2].body).toMatchObject({ email_address: "buyer@example.com" });
  });

  it("skips Kit cleanly when no digital product is in the session", async () => {
    process.env.KIT_API_KEY = "test-kit-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendPurchaseDeliveryEmail({
      id: "cs_live_physical",
      metadata: { product_ids: "ghfp-paperback" },
    } as unknown as Stripe.Checkout.Session);

    expect(result).toEqual({ ok: false, reason: "No digital products in session." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
