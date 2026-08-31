import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerShippoRoutes } from "./shippo";

let server: ReturnType<ReturnType<typeof express>["listen"]>;
let baseUrl = "";

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  registerShippoRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Unable to start Shippo status test server.");
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe("SHIPPO_PACKAGE_PROFILES_JSON", () => {
  it("contains the approved origin plus paperback and hardcover profiles and is accepted by the status endpoint", async () => {
    const originRaw = process.env.SHIPPO_ORIGIN_JSON;
    expect(originRaw).toBeTruthy();
    expect(JSON.parse(originRaw!)).toMatchObject({
      name: "The Mekiel Mitchell",
      street1: "2229 James Bell Way",
      city: "North Charleston",
      state: "SC",
      zip: "29406",
      country: "US",
      email: "info@themekielmitchell.com",
    });

    const raw = process.env.SHIPPO_PACKAGE_PROFILES_JSON;
    expect(raw).toBeTruthy();
    const profiles = JSON.parse(raw!) as Record<string, Record<string, string>>;
    expect(profiles.paperback).toEqual({
      length: "11", width: "6.5", height: "0.35", distance_unit: "in",
      weight: "0.40", mass_unit: "lb",
    });
    expect(profiles.hardcover).toEqual({
      length: "11", width: "6.5", height: "0.39", distance_unit: "in",
      weight: "0.40", mass_unit: "lb",
    });

    const response = await fetch(`${baseUrl}/api/shippo/status`);
    expect(response.ok).toBe(true);
    const status = await response.json() as { readyForRates: boolean; missing: string[] };
    expect(status.readyForRates).toBe(true);
    expect(status.missing).toEqual([]);
    expect(status.missing).not.toContain("package profiles");
    expect(status.missing).not.toContain("package profile: paperback");
  });
});
