# Mekiel Mitchell Website — Unpublished Review Build

**Status:** Ready for visual review; no new checkpoint has been saved and no updated code has been published.

**Preview:** `https://3000-ivt8nup73gkpo577lrq9w-37d075ca.us3.manus.computer/`

## Completed in the Review Build

| Area | Verified update |
|---|---|
| Book Mekiel | Horizontal Booking Inquiry / Strategy Calls tabs; the word “Inquire” removed; 30-minute and 60-minute Calendly options retained; Request a Date form matches the supplied topic/format specification. |
| Request a Date | External FormSubmit handoff removed. The form validates on-site and displays a preview-only confirmation; email delivery is intentionally held. |
| Kit | Active forms mapped to Website Subscribers, purchase thank-you, Newsletter, The Guide, Reserve My Copy, New Product Drop, Notify Me When Available, and Priority Waitlist. The general Coming Soon form was removed at the user’s request. |
| Shop | Amazon copy/links removed; The Group Home Funding Playbook labeled Book One; From Arbitrage to Ownership labeled Book Two; paperback $25; hardcover $30; digital bundle $57; eBook $27; audiobook $37. The requested Stripe/Shippo explanatory sentence was removed. |
| Upcoming book | From Arbitrage to Ownership has a Coming Soon banner, unavailable purchase buttons, and Reserve My Copy capture. |
| Merch | Entire page marked Coming Soon; product-drop and item notification forms added; apparel notification includes product and size selectors. |
| Cart | Active purchase drawer retained; quantity/removal/subtotal controls work; physical books reveal destination-address and live Shippo-rate controls. |
| Stripe | Secure server-side Checkout Session flow retained; shipping selections use server-signed quote tokens. Stripe account selection remains on hold. |
| Shippo | Authenticated test-mode integration, live-rate endpoint, address validation, protected webhook route, and minimal order/fulfillment identifiers implemented. |
| Digital delivery | The supplied eBook and the approved 99.9-minute audiobook are stored outside the codebase and available only through a paid-Stripe-session-gated download route. |
| Navigation | Home, About, Shop, Merch, and Coming Soon hash navigation responds to direct hash changes without reloads or 404s. The top-navigation Book Mekiel control is a one-line horizontal bar. |
| Legacy references | Amazon, PayPal, Printful, `book@themekielmitchell.com`, FormSubmit, and placeholder Kit form IDs are absent from the review source. |

## Verification Completed

| Check | Result |
|---|---|
| Unit tests | 14 passed across 5 test files |
| TypeScript | `tsc --noEmit` passed |
| Production build | Passed; client and server bundles generated |
| Custom domains | `themekielmitchell.com` serves HTTP 200 over HTTPS; `www.themekielmitchell.com` redirects to the apex domain |
| Kit audit | All currently active use cases map to the supplied IDs; the general Coming Soon form is intentionally removed |
| Booking form | Validates on-site, has no external action, and displays a held-delivery preview confirmation |
| Client router | Home, About, Shop, Merch, and Coming Soon each become the active in-page section when their hash changes |

## Deliberately Held or Data-Dependent

| Item | Status / required input |
|---|---|
| Request a Date email delivery | Held at the user’s direction. The form is visible and testable, but it does not send. |
| Live Shippo rate test | The purchase drawer and Get Live Rates control were tested. The UI correctly reported that fulfillment origin and package profiles are incomplete. It still needs the sender phone number and the third packaged dimension for paperback (`9 × 7 × ? in`) and hardcover (`11 × 9 × ? in`). Both supplied weights are currently understood as 0.50 lb but should be confirmed. |
| Live Shippo key/webhook registration | Do not configure yet. Complete test-mode rate selection first. Prepared production path: `/api/shippo/webhook/:token`. |
| Stripe account choice | Still on hold. No payment should be completed during visual review. |
| Paid purchase download test | Requires a completed Stripe test session after the account hold is lifted. |

## Latest Cart and Shippo Preview Test

The active purchase drawer opened with two review items, displayed subtotal and quantity/removal controls, and revealed the live-shipping address form for the physical paperback. Submitting the supplied North Charleston destination to **Get Live Rates** returned the exact on-site status:

> “Live shipping rates need configuration: fulfillment origin, package profiles.”

No carrier rate options were returned because the fulfillment profile remains incomplete. The remaining required inputs are the sender phone number, paperback depth for `9 × 7 × ? inches`, and hardcover depth for `11 × 9 × ? inches`. The supplied weights are recorded as `0.50 lb` each but still require confirmation.

## Review Instructions

Open the Preview panel and review **Book Mekiel**, **Shop**, **Merch**, **Coming Soon**, and the cart drawer. The custom domains continue to show the previously published version until a new checkpoint is approved and saved.
