import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

describe("production site links", () => {
  it("has no bare hash anchors and all client routes point to existing pages", () => {
    const pageIds = new Set([...html.matchAll(/id="page-([^"]+)"/g)].map(match => match[1]));
    const links = [...html.matchAll(/<a\b([^>]*)>/g)].map(match => match[1]);
    for (const attributes of links) {
      if (/href="#"/.test(attributes)) expect(attributes).toMatch(/onclick=/);
      const page = attributes.match(/data-page="([^"]+)"/)?.[1];
      if (page) expect(pageIds.has(page)).toBe(true);
    }
  });

  it("uses the approved Kit forms, Calendly links, and audiobook preview asset", () => {
    for (const formId of [9827586, 9849297, 9856518, 9827576, 9827582, 9849436, 9849305, 9849444, 9827264]) {
      expect(html).toContain(`https://app.kit.com/forms/${formId}/subscriptions`);
    }
    expect(html).toContain("https://calendly.com/mekielmitchell/60-minute-real-estate-strategy-call");
    expect(html).toContain("https://calendly.com/mekielmitchell/30min");
    expect(html).toContain("/manus-storage/group-home-funding-playbook-audiobook-preview_1ebd3633.mp3");
  });

  it("applies the supplied temporary Book Two cover without cropping it", () => {
    expect(html).toContain("/manus-storage/from-arbitrage-to-ownership-cover-web_47eb703b.webp");
    expect(html).toContain("From Arbitrage to Ownership by Mekiel Mitchell book cover");
    expect(html).toContain("object-fit: contain");
    expect(html).toContain("applyTemporaryBookTwoCover();");
  });
});
