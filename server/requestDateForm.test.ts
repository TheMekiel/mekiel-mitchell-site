import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../client/index.html", import.meta.url), "utf8");

describe("Request a Date Kit handoff", () => {
  it("submits form 9856518 with Kit's verified account field names", () => {
    expect(html).toContain('id="bookingInquiryForm" action="https://app.kit.com/forms/9856518/subscriptions"');
    expect(html).toContain('name="first_name"');
    expect(html).toContain('name="email_address"');
    for (const field of [
      "ck_field_1350992_organization",
      "ck_field_1350993_phone",
      "ck_field_1350746_preferred_date",
      "ck_field_1350994_event_location",
      "ck_field_1350744_topic",
      "ck_field_1350745_preferred_format",
      "ck_field_1350995_audience_size",
      "ck_field_1350747_booking_details",
    ]) expect(html).toContain(`name="${field}"`);
  });

  it("removes the held preview handler and discloses Kit plus Zapier", () => {
    expect(html).not.toContain("handleBookingPreview");
    expect(html).not.toContain("FormSubmit");
    expect(html).toContain("Kit.com (ConvertKit)");
    expect(html).toContain("Zapier");
  });
});
