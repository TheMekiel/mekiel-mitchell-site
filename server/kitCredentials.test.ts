import { describe, expect, it } from "vitest";

const KIT_API = "https://api.convertkit.com/v3";
const EXPECTED_FORM_IDS = [
  9827586,
  9849297,
  9856518,
  9827576,
  9827582,
  9849436,
  9849305,
  9849444,
  9827264,
] as const;

describe("Kit credentials and Request a Date form", () => {
  it("authenticates and exposes all nine configured forms plus the account custom fields", async () => {
    const apiKey = process.env.KIT_API_KEY;
    expect(apiKey).toBeTruthy();

    const formsResponse = await fetch(`${KIT_API}/forms?api_key=${encodeURIComponent(apiKey!)}`);
    expect(formsResponse.ok).toBe(true);
    const formsPayload = await formsResponse.json() as { forms?: Array<{ id: number }> };
    const accountFormIds = new Set(formsPayload.forms?.map(form => form.id) ?? []);
    for (const formId of EXPECTED_FORM_IDS) expect(accountFormIds.has(formId)).toBe(true);

    const fieldsResponse = await fetch(`${KIT_API}/custom_fields?api_key=${encodeURIComponent(apiKey!)}`);
    expect(fieldsResponse.ok).toBe(true);
    const fieldsPayload = await fieldsResponse.json() as { custom_fields?: Array<{ id: number; key: string; name: string }> };
    expect(Array.isArray(fieldsPayload.custom_fields)).toBe(true);
    expect(fieldsPayload.custom_fields?.length).toBeGreaterThanOrEqual(8);
  }, 30_000);
});
