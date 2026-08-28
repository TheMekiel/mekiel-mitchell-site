import { describe, expect, it } from "vitest";
import { normalizeCheckoutItems } from "./stripeProducts";

describe("normalizeCheckoutItems", () => {
  it("maps known products to server-owned price data", () => {
    expect(normalizeCheckoutItems([{ id: "ghfp-audio", qty: 2 }])).toEqual([
      {
        id: "ghfp-audio",
        product: {
          name: "The Group Home Funding Playbook — Audiobook",
          unitAmount: 3700,
          category: "digital",
          available: true,
        },
        quantity: 2,
      },
    ]);
  });

  it("combines duplicate products without trusting client prices", () => {
    const items = normalizeCheckoutItems([
      { id: "ghfp-audio", qty: 1, price: 0.01 },
      { id: "ghfp-audio", qty: 2, price: 999999 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(3);
    expect(items[0]?.product.unitAmount).toBe(3700);
  });

  it("rejects unknown products and invalid quantities", () => {
    expect(() => normalizeCheckoutItems([{ id: "not-a-product", qty: 1 }])).toThrow("Unknown cart product.");
    expect(() => normalizeCheckoutItems([{ id: "ghfp-audio", qty: 11 }])).toThrow("Each item quantity must be between 1 and 10.");
  });

  it("uses the requested prices for physical books and the digital bundle", () => {
    const items = normalizeCheckoutItems([
      { id: "ghfp-paperback", qty: 1 },
      { id: "ghfp-hardcover", qty: 1 },
      { id: "ghfp-bundle", qty: 1 },
    ]);
    expect(items.map(item => item.product.unitAmount)).toEqual([2500, 3000, 5700]);
    expect(items.slice(0, 2).every(item => Boolean(item.product.shippingProfile))).toBe(true);
  });

  it("rejects Coming Soon products", () => {
    expect(() => normalizeCheckoutItems([{ id: "a2o-ebook", qty: 1 }])).toThrow(
      "This product is not available for checkout yet.",
    );
  });
});
