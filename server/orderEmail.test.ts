import { afterEach, describe, expect, it, vi } from "vitest";
import { sendPaidPhysicalOrderNotification } from "./orderEmail";

const nativeFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = nativeFetch;
  vi.unstubAllEnvs();
});

describe("paid physical-order email", () => {
  it("sends a restricted Resend notice with an idempotency key and no label purchase claim", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "email_123" }), { status: 200 }));
    globalThis.fetch = fetchMock;

    const result = await sendPaidPhysicalOrderNotification({
      session: {
        id: "cs_live_email_test",
        amount_total: 3500,
        customer_details: { name: "Buyer Example", email: "buyer@example.com" },
        collected_information: {
          shipping_details: {
            name: "Buyer Example",
            address: {
              line1: "123 Main Street",
              line2: null,
              city: "Atlanta",
              state: "GA",
              postal_code: "30303",
              country: "US",
            },
          },
        },
      } as never,
      items: [
        {
          id: "ghfp-paperback",
          quantity: 1,
          product: {
            name: "The Group Home Funding Playbook — Paperback",
            unitAmount: 2500,
            category: "book",
            available: true,
            shippingProfile: "paperback",
          },
        },
      ],
      shippoShipmentId: "ship_postpaid",
    });

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer re_test_key",
          "Idempotency-Key": "paid-physical-order-cs_live_email_test",
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    expect(body).toMatchObject({
      from: "Mekiel Mitchell Orders <orders@updates.themekielmitchell.com>",
      to: ["info@themekielmitchell.com"],
    });
    expect(body.text).toContain("No shipping label was purchased automatically");
  });

  it("skips safely when the protected key is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    const result = await sendPaidPhysicalOrderNotification({
      session: { id: "cs_without_key" } as never,
      items: [],
      shippoShipmentId: null,
    });
    expect(result).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
