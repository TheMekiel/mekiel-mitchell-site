import { describe, expect, it } from "vitest";

const ELEVENLABS_USER_URL = "https://api.elevenlabs.io/v1/user";
const SHIPPO_ACCOUNT_LIST_URL = "https://api.goshippo.com/shippo-accounts";

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

  it("authenticates the supplied Shippo test key without exposing it", async () => {
    const apiKey = process.env.SHIPPO_API_KEY;
    expect(apiKey).toMatch(/^shippo_test_/);

    const response = await fetch(SHIPPO_ACCOUNT_LIST_URL, {
      headers: { Authorization: `ShippoToken ${apiKey}` },
    });

    await expectSuccessfulAuthentication(response, "Shippo");
  }, 20_000);
});
