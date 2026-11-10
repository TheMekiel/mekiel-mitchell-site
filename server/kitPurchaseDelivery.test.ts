import express from "express";
import type { Server } from "node:http";
import type Stripe from "stripe";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  buildPurchaseDownloadsUrl,
  PURCHASE_TAGS,
  PURCHASE_TAG_IDS,
  syncKitPurchaseDelivery,
} from "./kitPurchaseDelivery";
import { registerStripeRoutes } from "./stripe";
import { registerDigitalDeliveryRoutes } from "./digitalDelivery";

const providerMocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieveSession: vi.fn(),
  createSession: vi.fn(),
  upsertOrder: vi.fn(),
  signedUrl: vi.fn(),
}));
vi.mock("stripe", () => ({
  default: class {
    webhooks = { constructEvent: providerMocks.constructEvent };
    checkout = {
      sessions: {
        retrieve: providerMocks.retrieveSession,
        create: providerMocks.createSession,
      },
    };
  },
}));
vi.mock("./db", () => ({ upsertCommerceOrder: providerMocks.upsertOrder }));
vi.mock("./storage", () => ({ storageGetSignedUrl: providerMocks.signedUrl }));
vi.mock("./shippo", () => ({ verifyShippingQuote: vi.fn() }));

const nativeFetch = globalThis.fetch;
const EMAIL = "buyer+paid@example.com";
const SESSION_ID = "cs_live_testpurchase";
const HUB_URL = `https://themekielmitchell.com/api/digital/downloads?session_id=${SESSION_ID}`;
const existingTags = [
  { id: 1, name: PURCHASE_TAGS.digital },
  { id: 2, name: PURCHASE_TAGS.physical },
  { id: 3, name: PURCHASE_TAGS.ebook },
];

type Subscriber = {
  id: number;
  email_address: string;
  first_name: string | null;
  state: string;
  fields: Record<string, string>;
};
type ApiRequest = {
  url: URL;
  method: string;
  body: Record<string, unknown>;
  headers?: HeadersInit;
};

function paidSession(
  productIds = "ghfp-ebook",
  overrides: Record<string, unknown> = {}
) {
  return {
    id: SESSION_ID,
    payment_status: "paid",
    metadata: { product_ids: productIds },
    customer_details: { email: EMAIL, name: "Buyer Example" },
    ...overrides,
  } as unknown as Stripe.Checkout.Session;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function page(key: string, records: unknown[], endCursor?: string) {
  return json({
    [key]: records,
    pagination: {
      has_next_page: Boolean(endCursor),
      end_cursor: endCursor || "",
    },
  });
}

function mockKit(
  options: {
    subscriber?: Partial<Subscriber> | null;
    tags?: typeof existingTags;
    respond?: (request: ApiRequest) => Response | undefined;
  } = {}
) {
  const requests: ApiRequest[] = [];
  let exists = options.subscriber !== null;
  let subscriber: Subscriber = {
    id: 42,
    email_address: EMAIL,
    first_name: null,
    state: "active",
    fields: { unrelated: "preserve me" },
    ...options.subscriber,
  };
  const tags = [...(options.tags ?? existingTags)];
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request: ApiRequest = {
        url: new URL(String(input)),
        method: init?.method || "GET",
        body: init?.body ? JSON.parse(String(init.body)) : {},
        headers: init?.headers,
      };
      requests.push(request);
      const custom = options.respond?.(request);
      if (custom) return custom;
      const path = request.url.pathname;
      if (path === "/v4/subscribers" && request.method === "GET") {
        return page("subscribers", exists ? [subscriber] : []);
      }
      if (path === "/v4/subscribers" && request.method === "POST") {
        exists = true;
        return json({ subscriber }, 201);
      }
      if (path === "/v4/subscribers/42" && request.method === "PUT") {
        subscriber = {
          ...subscriber,
          ...(Object.hasOwn(request.body, "first_name")
            ? { first_name: request.body.first_name as string }
            : {}),
          fields: {
            ...subscriber.fields,
            ...(request.body.fields as Record<string, string>),
          },
        };
        return json({ subscriber });
      }
      if (
        /^\/v4\/tags\/\d+\/subscribers\/42$/.test(path) &&
        request.method === "POST"
      ) {
        return json({ subscriber }, 200);
      }
      throw new Error(`Unexpected mocked request: ${request.method} ${path}`);
    }
  );
  vi.stubGlobal("fetch", fetchMock);
  return { requests, fetchMock, subscriber: () => subscriber };
}

function fieldUpdate(requests: ApiRequest[]) {
  return requests.find(request => request.method === "PUT")!;
}
function tagAdds(requests: ApiRequest[]) {
  return requests.filter(request =>
    /\/tags\/\d+\/subscribers\//.test(request.url.pathname)
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("KIT_API_KEY", "mock-kit-key");
  vi.stubEnv("KIT_V4_API_KEY", "");
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_mock");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_mock");
  providerMocks.constructEvent.mockReset();
  providerMocks.retrieveSession.mockReset();
  providerMocks.createSession.mockReset();
  providerMocks.upsertOrder.mockReset().mockResolvedValue(undefined);
  providerMocks.signedUrl
    .mockReset()
    .mockResolvedValue("https://files.example.com/signed");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Kit paid-order handoff", () => {
  it("builds a stable paid-session downloads hub", () => {
    expect(buildPurchaseDownloadsUrl(SESSION_ID)).toBe(HUB_URL);
  });

  it("updates only existing fields before applying all mixed-order tags", async () => {
    const api = mockKit();
    const session = paidSession("ghfp-bundle,ghfp-paperback", {
      metadata: {
        product_ids: "ghfp-bundle,ghfp-paperback",
        shipping_provider: " USPS ",
        shipping_service: " Ground Advantage ",
      },
    });
    const result = await syncKitPurchaseDelivery(session);
    expect(result).toEqual({
      ok: true,
      status: "queued",
      email: EMAIL,
      subscriberId: 42,
      downloadUrl: HUB_URL,
      tagsApplied: [
        PURCHASE_TAGS.digital,
        PURCHASE_TAGS.physical,
        PURCHASE_TAGS.ebook,
      ],
    });
    expect(
      api.requests.map(request => `${request.method} ${request.url.pathname}`)
    ).toEqual([
      "GET /v4/subscribers",
      "PUT /v4/subscribers/42",
      `POST /v4/tags/${PURCHASE_TAG_IDS.digital}/subscribers/42`,
      `POST /v4/tags/${PURCHASE_TAG_IDS.physical}/subscribers/42`,
      `POST /v4/tags/${PURCHASE_TAG_IDS.ebook}/subscribers/42`,
    ]);
    expect(api.requests[0].url.searchParams.get("email_address")).toBe(EMAIL);
    expect(api.requests[0].url.searchParams.get("status")).toBe("all");
    expect(new Headers(api.requests[0].headers).get("X-Kit-Api-Key")).toBe(
      "mock-kit-key"
    );
    expect(fieldUpdate(api.requests).body).toEqual({
      email_address: EMAIL,
      first_name: "Buyer",
      fields: {
        order_link: HUB_URL,
        shipping_carrier: "USPS Ground Advantage",
      },
    });
    expect(api.subscriber().fields.unrelated).toBe("preserve me");
  });

  it("handles physical-only orders and clears stale digital links", async () => {
    const api = mockKit({
      subscriber: { fields: { order_link: "old digital order" } },
    });
    const result = await syncKitPurchaseDelivery(
      paidSession("ghfp-hardcover", {
        metadata: {
          product_ids: "ghfp-hardcover",
          shipping_provider: "UPS",
          shipping_service: "Ground",
        },
      })
    );
    expect(result).toMatchObject({
      ok: true,
      downloadUrl: null,
      tagsApplied: [PURCHASE_TAGS.physical],
    });
    expect(fieldUpdate(api.requests).body.fields).toEqual({
      order_link: "",
      shipping_carrier: "UPS Ground",
    });
    expect(tagAdds(api.requests).map(request => request.url.pathname)).toEqual([
      `/v4/tags/${PURCHASE_TAG_IDS.physical}/subscribers/42`,
    ]);
  });

  it.each([
    ["ghfp-ebook", [PURCHASE_TAGS.digital, PURCHASE_TAGS.ebook]],
    ["ghfp-bundle", [PURCHASE_TAGS.digital, PURCHASE_TAGS.ebook]],
    ["ghfp-audio", [PURCHASE_TAGS.digital]],
    [
      "ghfp-bundle,ghfp-ebook,ghfp-audio",
      [PURCHASE_TAGS.digital, PURCHASE_TAGS.ebook],
    ],
  ])(
    "applies the correct digital tags for %s and blanks shipping",
    async (products, tags) => {
      const api = mockKit();
      const result = await syncKitPurchaseDelivery(
        paidSession(products, {
          metadata: {
            product_ids: products,
            shipping_provider: "stale",
            shipping_service: "old",
          },
        })
      );
      expect(result).toMatchObject({
        ok: true,
        downloadUrl: HUB_URL,
        tagsApplied: tags,
      });
      expect(fieldUpdate(api.requests).body.fields).toEqual({
        order_link: HUB_URL,
        shipping_carrier: "",
      });
      expect(tagAdds(api.requests)).toHaveLength(tags.length);
    }
  );

  it.each(["unpaid", "no_payment_required", undefined])(
    "independently rejects payment status %s before any Kit call",
    async payment_status => {
      const api = mockKit();
      expect(
        await syncKitPurchaseDelivery(
          paidSession("ghfp-ebook", { payment_status })
        )
      ).toEqual({
        ok: false,
        reason: "Payment is not confirmed.",
      });
      expect(
        await syncKitPurchaseDelivery(
          paidSession("ghfp-ebook", { payment_status }),
          { applyPurchaseTags: false }
        )
      ).toMatchObject({ ok: false });
      expect(api.fetchMock).not.toHaveBeenCalled();
    }
  );

  it.each(["cancelled", "bounced", "complained", "inactive", "active"])(
    "preserves an existing first name and %s state",
    async state => {
      const api = mockKit({ subscriber: { first_name: "Saved Name", state } });
      await syncKitPurchaseDelivery(paidSession());
      expect(fieldUpdate(api.requests).body).not.toHaveProperty("first_name");
      expect(
        api.requests.every(request => !Object.hasOwn(request.body, "state"))
      ).toBe(true);
      expect(api.subscriber()).toMatchObject({
        first_name: "Saved Name",
        state,
      });
    }
  );

  it.each([null, "", "   "])(
    "fills a blank Kit first name (%s) from Stripe customer_details.name only",
    async first_name => {
      const api = mockKit({ subscriber: { first_name } });
      await syncKitPurchaseDelivery(
        paidSession("ghfp-audio", {
          customer_details: { email: EMAIL, name: "  Jane   Example " },
        })
      );
      expect(fieldUpdate(api.requests).body.first_name).toBe("Jane");
    }
  );

  it("does not invent a first name from email or shipping details", async () => {
    const api = mockKit();
    await syncKitPurchaseDelivery(
      paidSession("ghfp-ebook", {
        customer_details: { email: EMAIL, name: " " },
        shipping_details: { name: "Do Not Use" },
      })
    );
    expect(fieldUpdate(api.requests).body).not.toHaveProperty("first_name");
  });

  it("creates absent subscribers without setting state/name, then updates fields and blank name", async () => {
    const api = mockKit({ subscriber: null });
    await syncKitPurchaseDelivery(paidSession());
    expect(api.requests[1]).toMatchObject({
      method: "POST",
      body: { email_address: EMAIL },
    });
    expect(api.requests[1].url.pathname).toBe("/v4/subscribers");
    expect(fieldUpdate(api.requests).body.first_name).toBe("Buyer");
  });

  it("preserves a name/state returned by an upsert after an eventually consistent lookup miss", async () => {
    const api = mockKit({
      subscriber: { first_name: "Saved", state: "cancelled" },
      respond: request => {
        if (
          request.method === "GET" &&
          request.url.pathname === "/v4/subscribers"
        )
          return page("subscribers", []);
      },
    });
    await syncKitPurchaseDelivery(paidSession());
    expect(
      api.requests.find(
        request =>
          request.method === "POST" &&
          request.url.pathname === "/v4/subscribers"
      )?.body
    ).toEqual({ email_address: EMAIL });
    expect(fieldUpdate(api.requests).body).not.toHaveProperty("first_name");
    expect(api.subscriber()).toMatchObject({
      first_name: "Saved",
      state: "cancelled",
    });
  });

  it("follows subscriber pagination using an encoded cursor", async () => {
    const api = mockKit({
      respond: request => {
        if (
          request.url.pathname === "/v4/subscribers" &&
          !request.url.searchParams.has("after")
        ) {
          return page("subscribers", [], "subscriber+/=");
        }
      },
    });
    await syncKitPurchaseDelivery(paidSession(), { applyPurchaseTags: false });
    expect(api.requests[1].url.searchParams.get("after")).toBe("subscriber+/=");
    expect(api.requests[1].url.searchParams.get("status")).toBe("all");
    expect(api.requests.some(request => request.method === "POST")).toBe(false);
  });

  it("uses the verified immutable tag IDs without listing or creating tags", async () => {
    const api = mockKit({ tags: [] });
    await syncKitPurchaseDelivery(paidSession());
    expect(api.requests.some(request => request.url.pathname === "/v4/tags")).toBe(
      false
    );
    expect(tagAdds(api.requests).map(request => request.url.pathname)).toEqual([
      `/v4/tags/${PURCHASE_TAG_IDS.digital}/subscribers/42`,
      `/v4/tags/${PURCHASE_TAG_IDS.ebook}/subscribers/42`,
    ]);
    expect(PURCHASE_TAGS.digital).toContain(" \u2013 ");
  });

  it("idempotently adds tags on every repeat paid order without any removal", async () => {
    const api = mockKit();
    await syncKitPurchaseDelivery(paidSession());
    await syncKitPurchaseDelivery(
      paidSession("ghfp-ebook", { id: "cs_live_repeat" })
    );
    await syncKitPurchaseDelivery(
      paidSession("ghfp-ebook", { id: "cs_live_repeat" })
    );
    expect(tagAdds(api.requests)).toHaveLength(6);
    expect(api.requests.some(request => request.method === "DELETE")).toBe(
      false
    );
    expect(api.subscriber().fields.order_link).toContain(
      "session_id=cs_live_repeat"
    );
  });

  it.each(["ghfp-ebook", "ghfp-bundle,ghfp-paperback", "ghfp-hardcover"])(
    "exports field-only backfill for %s with no tags/forms/emails",
    async products => {
      const api = mockKit({ tags: [] });
      const result = await syncKitPurchaseDelivery(paidSession(products), {
        applyPurchaseTags: false,
      });
      expect(result).toMatchObject({
        ok: true,
        status: "fields_updated",
        tagsApplied: [],
      });
      expect(api.requests.map(request => request.url.pathname)).toEqual([
        "/v4/subscribers",
        "/v4/subscribers/42",
      ]);
      expect(
        api.requests.every(
          request => request.method === "GET" || request.method === "PUT"
        )
      ).toBe(true);
    }
  );

  it("rejects missing email/configuration and unknown products without API calls", async () => {
    const api = mockKit();
    expect(await syncKitPurchaseDelivery(paidSession("unknown"))).toMatchObject(
      { ok: false }
    );
    expect(await syncKitPurchaseDelivery(paidSession(""))).toMatchObject({
      ok: false,
    });
    expect(
      await syncKitPurchaseDelivery(
        paidSession("ghfp-ebook", { customer_details: null })
      )
    ).toMatchObject({ ok: false });
    vi.stubEnv("KIT_API_KEY", "");
    expect(await syncKitPurchaseDelivery(paidSession())).toMatchObject({
      ok: false,
    });
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it("uses Stripe customer_email when customer_details has no email", async () => {
    const api = mockKit();
    await syncKitPurchaseDelivery(
      paidSession("ghfp-ebook", {
        customer_details: null,
        customer_email: EMAIL,
      })
    );
    expect(api.requests[0].url.searchParams.get("email_address")).toBe(EMAIL);
    expect(fieldUpdate(api.requests).body).not.toHaveProperty("first_name");
  });

  it("does not tag when fields fail; raw provider errors never escape", async () => {
    const api = mockKit({
      respond: request =>
        request.method === "PUT"
          ? json(
              { errors: [`secret error for ${SESSION_ID} buyer@example.com`] },
              422
            )
          : undefined,
    });
    await expect(syncKitPurchaseDelivery(paidSession())).rejects.toThrow(
      "Kit purchase handoff failed (HTTP 422)."
    );
    expect(
      api.requests.some(request => request.url.pathname.includes("/tags"))
    ).toBe(false);
  });

  it("logs Kit failure diagnostics without logging the API key", async () => {
    mockKit({
      respond: request =>
        request.method === "PUT"
          ? json({ errors: ["field update failed"] }, 422)
          : undefined,
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(syncKitPurchaseDelivery(paidSession())).rejects.toThrow(
      "Kit purchase handoff failed (HTTP 422)."
    );
    expect(warn).toHaveBeenCalledWith("[Kit] API request failed", {
      method: "PUT",
      path: "/subscribers/42",
      status: 422,
      body: JSON.stringify({ errors: ["field update failed"] }),
    });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("mock-kit-key");
  });

  it("does not tag when existing fields are ignored with API warnings", async () => {
    const api = mockKit({
      respond: request =>
        request.method === "PUT"
          ? json({ subscriber: { id: 42 }, warnings: ["Unknown order_link"] })
          : undefined,
    });
    await expect(syncKitPurchaseDelivery(paidSession())).rejects.toThrow(
      "Kit did not accept the existing purchase fields."
    );
    expect(tagAdds(api.requests)).toHaveLength(0);
  });

  it("rejects incomplete tag adds rather than claiming a queued handoff", async () => {
    const api = mockKit({
      respond: request =>
        request.url.pathname ===
          `/v4/tags/${PURCHASE_TAG_IDS.ebook}/subscribers/42`
          ? json({ errors: ["raw Kit failure"] }, 500)
          : undefined,
    });
    await expect(syncKitPurchaseDelivery(paidSession())).rejects.toThrow(
      "Kit purchase handoff failed (HTTP 500)."
    );
    expect(tagAdds(api.requests)).toHaveLength(2);
  });

  it("sanitizes network errors and malformed API responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error(`secret ${SESSION_ID}`))
    );
    await expect(syncKitPurchaseDelivery(paidSession())).rejects.toThrow(
      "Kit purchase handoff is temporarily unavailable."
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("raw secret", { status: 200 }))
    );
    await expect(syncKitPurchaseDelivery(paidSession())).rejects.toThrow(
      "Kit returned an invalid purchase handoff response."
    );
  });

  it("fails closed on malformed subscriber pagination", async () => {
    mockKit({
      respond: request =>
        request.url.pathname === "/v4/subscribers"
          ? json({
              subscribers: [],
              pagination: { has_next_page: true, end_cursor: "" },
            })
          : undefined,
    });
    await expect(
      syncKitPurchaseDelivery(paidSession(), { applyPurchaseTags: false })
    ).rejects.toThrow(
      "Kit returned an invalid pagination cursor."
    );
  });
});

describe("Stripe webhook and digital delivery contracts", () => {
  let server: Server;
  let baseUrl: string;
  beforeAll(async () => {
    const app = express();
    registerStripeRoutes(app);
    registerDigitalDeliveryRoutes(app);
    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string")
          throw new Error("Test listener unavailable");
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close(error => (error ? reject(error) : resolve()))
    );
  });

  function webhook(
    session: Stripe.Checkout.Session,
    type = "checkout.session.completed"
  ) {
    providerMocks.constructEvent.mockReturnValue({
      id: "evt_mock_signed",
      type,
      data: { object: session },
    });
    return nativeFetch(`${baseUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "mock-signature",
      },
      body: "{}",
    });
  }
  function delivery(path = "delivery", query = `session_id=${SESSION_ID}`) {
    return nativeFetch(`${baseUrl}/api/digital/${path}?${query}`, {
      redirect: "manual",
    });
  }

  it("preserves safe cart validation errors but hides raw Stripe checkout failures", async () => {
    const invalid = await nativeFetch(`${baseUrl}/api/stripe/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual({
      error: "A cart with 1–25 items is required.",
    });
    providerMocks.createSession.mockRejectedValue(
      new Error(`Stripe raw API error ${SESSION_ID}`)
    );
    const response = await nativeFetch(`${baseUrl}/api/stripe/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: "ghfp-ebook", qty: 1 }] }),
    });
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Unable to start secure checkout. Please try again.",
    });
  });

  it.each([
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
  ])("accepts paid %s and applies purchase tags", async type => {
    const api = mockKit();
    const response = await webhook(paidSession("ghfp-paperback"), type);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      received: true,
      kitHandoffAccepted: true,
    });
    expect(providerMocks.upsertOrder).toHaveBeenCalledOnce();
    expect(tagAdds(api.requests)).toHaveLength(1);
  });

  it("does not fulfill or tag unpaid checkout completions or unrelated events", async () => {
    const api = mockKit();
    const unpaid = await webhook(
      paidSession("ghfp-ebook", { payment_status: "unpaid" })
    );
    expect(unpaid.status).toBe(200);
    expect(await unpaid.json()).toEqual({ received: true });
    const ignored = await webhook(paidSession(), "payment_intent.succeeded");
    expect(await ignored.json()).toEqual({ received: true });
    expect(api.fetchMock).not.toHaveBeenCalled();
    expect(providerMocks.upsertOrder).not.toHaveBeenCalled();
  });

  it("returns a sanitized 503 for Kit failure so Stripe retries the paid order", async () => {
    const api = mockKit({
      respond: request =>
        request.method === "PUT"
          ? json({ errors: [`API secret ${SESSION_ID}`] }, 500)
          : undefined,
    });
    const response = await webhook(paidSession());
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).not.toContain(SESSION_ID);
    expect(text).not.toContain("API secret");
    expect(JSON.parse(text)).toEqual({
      error: "Purchase handoff is temporarily unavailable. Please retry.",
    });
    expect(tagAdds(api.requests)).toHaveLength(0);
  });

  it("returns 503 for missing Kit configuration, not a success acknowledgment", async () => {
    const api = mockKit();
    vi.stubEnv("KIT_API_KEY", "");
    const response = await webhook(paidSession());
    expect(response.status).toBe(503);
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it("returns 503 for partial tag failure and retries all applicable idempotent adds", async () => {
    let fail = true;
    const api = mockKit({
      respond: request =>
        fail &&
          request.url.pathname ===
            `/v4/tags/${PURCHASE_TAG_IDS.ebook}/subscribers/42`
          ? json({ errors: ["failure"] }, 500)
          : undefined,
    });
    expect((await webhook(paidSession())).status).toBe(503);
    fail = false;
    expect((await webhook(paidSession())).status).toBe(200);
    expect(tagAdds(api.requests)).toHaveLength(4);
    expect(api.requests.some(request => request.method === "DELETE")).toBe(
      false
    );
  });

  it("returns 503 for order persistence failures without leaking session IDs", async () => {
    const api = mockKit();
    providerMocks.upsertOrder.mockRejectedValue(
      new Error(`database ${SESSION_ID}`)
    );
    const response = await webhook(paidSession());
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain(SESSION_ID);
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it("rejects invalid webhook signatures before any write", async () => {
    const api = mockKit();
    providerMocks.constructEvent.mockImplementation(() => {
      throw new Error("private signature error");
    });
    const response = await nativeFetch(`${baseUrl}/api/stripe/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": "bad",
      },
      body: "{}",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid webhook signature.",
    });
    expect(api.fetchMock).not.toHaveBeenCalled();
    expect(providerMocks.upsertOrder).not.toHaveBeenCalled();
  });

  it("returns paid download links and field-only Kit acceptance on repeated browser fallback", async () => {
    const api = mockKit({ tags: [] });
    providerMocks.retrieveSession.mockResolvedValue(paidSession("ghfp-bundle"));
    for (let i = 0; i < 2; i++) {
      const response = await delivery();
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const payload = await response.json();
      expect(payload.downloads).toHaveLength(2);
      expect(payload.kitHandoffAccepted).toBe(true);
      expect(payload).not.toHaveProperty("emailDelivery");
    }
    expect(
      api.requests.every(request => !request.url.pathname.includes("/tags"))
    ).toBe(true);
    expect(
      api.requests.filter(request => request.method === "PUT")
    ).toHaveLength(2);
  });

  it("keeps paid downloads available when the Kit field-only fallback fails", async () => {
    mockKit({ respond: () => json({ errors: [`raw ${SESSION_ID}`] }, 503) });
    providerMocks.retrieveSession.mockResolvedValue(paidSession());
    const response = await delivery();
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.downloads).toHaveLength(1);
    expect(payload.kitHandoffAccepted).toBe(false);
    expect(payload).not.toHaveProperty("error");
  });

  it.each(["delivery", "downloads", "download"])(
    "keeps the unpaid payment gate on /%s",
    async path => {
      const api = mockKit();
      providerMocks.retrieveSession.mockResolvedValue(
        paidSession("ghfp-ebook", { payment_status: "unpaid" })
      );
      const response = await delivery(path);
      expect(response.status).toBe(403);
      expect(await response.text()).toContain("payment is confirmed");
      expect(api.fetchMock).not.toHaveBeenCalled();
      expect(providerMocks.signedUrl).not.toHaveBeenCalled();
    }
  );

  it.each(["delivery", "downloads", "download"])(
    "returns safe errors without raw API messages or session IDs on /%s",
    async path => {
      mockKit();
      providerMocks.retrieveSession.mockRejectedValue(
        new Error(`No such checkout.session: ${SESSION_ID}; raw API error`)
      );
      const response = await delivery(path);
      expect(response.status).toBe(502);
      const text = await response.text();
      expect(text).not.toContain(SESSION_ID);
      expect(text).not.toContain("No such");
      expect(text).not.toContain("raw API");
    }
  );

  it("rejects invalid session IDs before contacting providers", async () => {
    const api = mockKit();
    const response = await delivery(
      "downloads",
      "session_id=bad-session-secret"
    );
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain("bad-session-secret");
    expect(providerMocks.retrieveSession).not.toHaveBeenCalled();
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it("serves a paid hub with only purchased assets and never invokes Kit", async () => {
    const api = mockKit();
    providerMocks.retrieveSession.mockResolvedValue(paidSession());
    const response = await delivery("downloads");
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("asset=ebook");
    expect(html).not.toContain("asset=audiobook");
    expect(api.fetchMock).not.toHaveBeenCalled();
    expect(providerMocks.signedUrl).not.toHaveBeenCalled();
  });

  it("keeps the asset entitlement gate and signed redirect without Kit writes", async () => {
    const api = mockKit();
    providerMocks.retrieveSession.mockResolvedValue(paidSession());
    expect(
      (await delivery("download", `session_id=${SESSION_ID}&asset=audiobook`))
        .status
    ).toBe(404);
    expect(providerMocks.signedUrl).not.toHaveBeenCalled();
    const response = await delivery(
      "download",
      `session_id=${SESSION_ID}&asset=ebook`
    );
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://files.example.com/signed"
    );
    expect(providerMocks.signedUrl).toHaveBeenCalledOnce();
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it("returns 404 for physical-only download hubs", async () => {
    const api = mockKit();
    providerMocks.retrieveSession.mockResolvedValue(
      paidSession("ghfp-paperback")
    );
    const response = await delivery("downloads");
    expect(response.status).toBe(404);
    expect(api.fetchMock).not.toHaveBeenCalled();
  });

  it("sanitizes storage failures in file download responses", async () => {
    mockKit();
    providerMocks.retrieveSession.mockResolvedValue(paidSession());
    providerMocks.signedUrl.mockRejectedValue(
      new Error(`storage credential ${SESSION_ID}`)
    );
    const response = await delivery(
      "download",
      `session_id=${SESSION_ID}&asset=ebook`
    );
    expect(response.status).toBe(502);
    const text = await response.text();
    expect(text).not.toContain(SESSION_ID);
    expect(text).not.toContain("storage credential");
  });
});
