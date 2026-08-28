import { afterEach, describe, expect, it } from "vitest";
import { normalizeShippingAddress, signShippingQuote, verifyShippingQuote } from "./shippo";

const previousSecret = process.env.JWT_SECRET;

afterEach(() => {
  process.env.JWT_SECRET = previousSecret;
});

describe("Shippo quote helpers", () => {
  it("normalizes a valid US destination without inventing optional fields", () => {
    expect(
      normalizeShippingAddress({
        name: "Jane Customer",
        street1: "123 Main Street",
        city: "Atlanta",
        state: "ga",
        zip: "30303",
        country: "US",
      }),
    ).toMatchObject({ state: "GA", country: "US", zip: "30303" });
  });

  it("rejects unsupported destinations and malformed state codes", () => {
    expect(() =>
      normalizeShippingAddress({ name: "A", street1: "B", city: "C", state: "Georgia", zip: "30303", country: "US" }),
    ).toThrow("two-letter");
    expect(() =>
      normalizeShippingAddress({ name: "A", street1: "B", city: "C", state: "ON", zip: "M5V", country: "CA" }),
    ).toThrow("United States");
  });

  it("signs, verifies, and rejects tampered shipping quotes", () => {
    process.env.JWT_SECRET = "test-signing-secret";
    const token = signShippingQuote({
      rateId: "rate_test",
      shipmentId: "ship_test",
      amount: 695,
      currency: "USD",
      provider: "USPS",
      service: "Ground Advantage",
      estimatedDays: 4,
      expiresAt: Date.now() + 60_000,
    });
    expect(verifyShippingQuote(token).amount).toBe(695);
    expect(() => verifyShippingQuote(`${token}tampered`)).toThrow("Invalid shipping quote");
  });
});
