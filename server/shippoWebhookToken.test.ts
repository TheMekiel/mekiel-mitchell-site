import express from "express";
import type { Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { registerShippoRoutes } from "./shippo";

describe("Shippo webhook token", () => {
  let server: Server;
  let baseUrl = "";

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerShippoRoutes(app);
    await new Promise<void>(resolve => {
      server = app.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("Unable to start webhook test server.");
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  });

  it("accepts the configured token path and rejects an incorrect token", async () => {
    const token = process.env.SHIPPO_WEBHOOK_TOKEN;
    expect(token).toMatch(/^[a-f0-9]{48}$/);

    const rejected = await fetch(`${baseUrl}/api/shippo/webhook/not-the-configured-token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(rejected.status).toBe(401);

    const acceptedToken = await fetch(`${baseUrl}/api/shippo/webhook/${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(acceptedToken.status).toBe(400);
    await expect(acceptedToken.json()).resolves.toEqual({ error: "Invalid webhook payload." });
  });
});
