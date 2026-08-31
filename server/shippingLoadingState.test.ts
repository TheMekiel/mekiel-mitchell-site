import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const html = fs.readFileSync(path.resolve(process.cwd(), "client/index.html"), "utf8");

describe("shipping-rate loading experience", () => {
  it("shows an accessible spinner and live status while rates are fetched", () => {
    expect(html).toContain('class="shipping-rate-spinner" aria-hidden="true"');
    expect(html).toContain('aria-describedby="shippingStatus" aria-busy="false"');
    expect(html).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(html).toContain("button.classList.add('is-loading')");
    expect(html).toContain("button.setAttribute('aria-busy', 'true')");
    expect(html).toContain("Fetching live carrier rates. This can take a few seconds…");
    expect(html).toContain("Live carrier rates are ready. Select one to continue.");
  });

  it("blocks duplicate requests and restores the control after completion", () => {
    expect(html).toContain("let shippingRateRequestInFlight = false");
    expect(html).toContain("if (shippingRateRequestInFlight) return");
    expect(html).toContain("shippingRateRequestInFlight = true");
    expect(html).toContain("shippingRateRequestInFlight = false");
    expect(html).toContain("button.classList.remove('is-loading')");
    expect(html).toContain("button.setAttribute('aria-busy', 'false')");
  });
});
