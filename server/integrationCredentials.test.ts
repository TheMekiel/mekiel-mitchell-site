import { describe, expect, it } from "vitest";

const ELEVENLABS_USER_URL = "https://api.elevenlabs.io/v1/user";
const SHIPPO_ACCOUNT_LIST_URL = "https://api.goshippo.com/shippo-accounts";
const STRIPE_ACCOUNT_URL = "https://api.stripe.com/v1/account";

function credentialMode(value: string | undefined, testPrefix: string, livePrefix: string) {
  if (value?.startsWith(testPrefix)) return "test";
  if (value?.startsWith(livePrefix)) return "live";
  return "invalid";
}

async function expectSuccessfulAuthentication(response: Response, service: string) {
  if (!response.ok) {
    throw new Error(`${service} credential validation failed with HTTP ${response.status}`);
  }
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
}

describe("server-side integration credentials", () => {
  it("authenticates the authorized ElevenLabs API key without exposing it", async () => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    expect(apiKey).toBeTruthy();

    const response = await fetch(ELEVENLABS_USER_URL, {
      headers: { "xi-api-key": apiKey! },
    });

    await expectSuccessfulAuthentication(response, "ElevenLabs");
  }, 20_000);

  it("authenticates the configured Shippo test or live key without exposing it", async () => {
    const apiKey = process.env.SHIPPO_API_KEY;
    expect(apiKey).toMatch(/^shippo_(test|live)_/);

    const response = await fetch(SHIPPO_ACCOUNT_LIST_URL, {
      headers: { Authorization: `ShippoToken ${apiKey}` },
    });

    await expectSuccessfulAuthentication(response, "Shippo");
  }, 20_000);

  it("authenticates Stripe and requires matching server and publishable modes", async () => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.VITE_STRIPE_PUBLISHABLE_KEY;
    const secretMode = credentialMode(secretKey, "sk_test_", "sk_live_");
    const restrictedMode = credentialMode(secretKey, "rk_test_", "rk_live_");
    const serverMode = secretMode === "invalid" ? restrictedMode : secretMode;
    const clientMode = credentialMode(publishableKey, "pk_test_", "pk_live_");

    expect(serverMode).not.toBe("invalid");
    expect(clientMode).toBe(serverMode);

    const response = await fetch(STRIPE_ACCOUNT_URL, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    await expectSuccessfulAuthentication(response, "Stripe");
  }, 20_000);
});
