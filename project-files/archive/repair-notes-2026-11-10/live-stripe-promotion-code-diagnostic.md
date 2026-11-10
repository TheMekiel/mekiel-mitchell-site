# Live Stripe Promotion-Code Diagnostic

## Result

The customer-facing code `MANUS100OFF9HD` exists in the authorized **live** Stripe account. The promotion code is active, unexpired, unused, unrestricted by customer, unrestricted to first-time transactions, has no minimum order amount, and has no redemption cap.

| Field | Live Stripe value |
|---|---|
| Mode | Live |
| Active | Yes |
| Expiration | None |
| Times redeemed | 0 |
| Maximum redemptions | None |
| Customer restriction | None |
| First-time transaction only | No |
| Minimum amount | None |

The underlying coupon is valid and live. It provides **99% off**, has no expiration or redemption cap, and uses a `forever` duration. The API response contained no product-applicability restriction.

## Root cause

The website-managed Stripe server and publishable credentials still reported **test mode** after a synchronized restart and authenticated read-only validation. Stripe objects are mode-specific. Therefore, a Checkout Session created by the website’s current test credentials cannot resolve this live-only promotion code and reports it as invalid.

The website’s Checkout Session code already enables `allow_promotion_codes: true`, so the input control itself is correctly configured. The mismatch is the Stripe environment, not the promotion-code restrictions.

## Additional checkout consideration

The coupon discounts the merchandise subtotal by 99%. For lower-priced digital items, the remaining merchandise amount can be below Stripe’s normal minimum charge threshold. That would be a payment-amount issue after successful code recognition, not the present “invalid code” error. Physical-book orders retain an undiscounted shipping charge in the current Checkout Session design.

No Stripe object was created, modified, redeemed, archived, or deleted during this diagnostic.

## References

1. [Stripe Promotion Code object](https://docs.stripe.com/api/promotion_codes/object)
2. [Stripe coupons and promotion codes](https://docs.stripe.com/billing/subscriptions/coupons)
3. [Stripe promotion-code list API](https://docs.stripe.com/api/promotion_codes/list)
