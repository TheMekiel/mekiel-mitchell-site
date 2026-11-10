# Kit paid-order field and tag handoff

- [x] Stop adding paid buyers to Kit form `9849297`; do not create custom fields or emails.
- [x] Update existing `order_link` and `shipping_carrier` from the paid Stripe session, clearing shipping for digital-only orders and old digital links for physical-only orders.
- [x] Look up existing subscribers by email across all states; preserve saved first names and cancelled/bounced/complained/inactive state.
- [x] Apply exact `Purchased – Digital`, `Purchased – Physical`, and applicable existing `Purchased – GHFP eBook` tags only after fields are accepted, using verified immutable Kit tag IDs.
- [x] Reject unpaid orders independently in the exported helper; expose `applyPurchaseTags: false` for field-only backfill without tags/forms/emails.
- [x] Make the signed paid-checkout webhook primary, return retryable `503` for failed handoffs, and keep the browser fallback field-only.
- [x] Remove public raw API errors/session IDs from download and checkout errors; show Kit handoff acceptance, not an email-sent claim.
- [x] Add focused mocked-provider tests for payment/entitlement gates, order categories, bundles, subscriber preservation, pagination, repeats, backfills and failure contracts.
- [x] Run TypeScript check and focused tests, including redacted Kit failure diagnostics.
- [x] Run the final production build and `git diff --check`.

Validation passed: `pnpm check`; 71 focused tests across Kit purchase delivery, site links, digital products, Stripe products, and purchase-download styling; `pnpm build`; and `git diff --check`. The only tool warning is the existing pnpm configuration deprecation for keys in `package.json`.

The earlier handoff implementation made no live Kit subscriber/tag/form/email changes, historical backfill, credential changes, infrastructure changes, commits, pushes or publication. Existing automations may not re-enter when a purchase tag is already present; API acceptance is not an email-delivery guarantee. The standalone opening-page copy already has neutral download-ready copy and needed no edit.

# Purchase thank-you overlay accessibility fix

- [x] Update `#purchaseDownloads` links to use visible gold text on the navy panel, with a clear underline or button treatment while preserving the gold border.
- [x] Run focused source validation, TypeScript checks, tests, and production build.
- [x] Verify the thank-you overlay link styling in the preview and publish the fix.

# Live Kit handoff repair for the $1 eBook test

- [x] Confirm the Stripe signature was accepted and the three failed deliveries returned the app's sanitized HTTP 503.
- [x] Replace fragile live tag name lookup/create behavior with the verified Kit tag IDs; preserve the existing `order_link` and `shipping_carrier` field payload.
- [x] Add redacted Kit endpoint/status/error-shape diagnostics without logging API keys.
- [x] Run the focused handoff tests, TypeScript check, deterministic test suite, and production build.
- [x] Save the repair checkpoint; do not resend the Stripe event from the application.
