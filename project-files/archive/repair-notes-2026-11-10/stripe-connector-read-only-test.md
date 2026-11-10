# Stripe Connector Read-Only Test

## Connector context

The built-in **Stripe** connector is enabled for this task. The initial account-context listing returned only **The Mekiel Mitchell sandbox**, with `livemode: false`. After the user added and authorized the production account, the connector returned a second context: **The Mekiel Mitchell**, with `livemode: true`.

All connector calls in this test are restricted to read-only operations. No customer, payment, refund, subscription, invoice, product, price, or other Stripe resource will be created, changed, or deleted.

## Data fetched

| Read-only check | Result |
|---|---|
| Connected accounts | The Mekiel Mitchell sandbox; The Mekiel Mitchell |
| Account modes | Test (`livemode: false`) and live (`livemode: true`) |
| Balance summary | $0.00 USD across the two authorized account contexts |
| Sandbox products | 0 |
| Customers | 0 |
| Payment intents | 0 |
| Invoices | 0 |
| Subscriptions, all statuses | 0 |
| Live products | 5 active Group Home Funding Playbook products: eBook, audiobook, bundle, paperback, and hardcover |

Each sandbox list response reported `has_more: false`, so the connected sandbox currently contains no records in those categories. The live product response also reported `has_more: false`, confirming the five returned products comprise the current live catalog. The connector authenticated successfully against both test and live contexts and returned structured Stripe API responses.

## Capability brief

The connector can discover Stripe API operations, inspect their exact parameters, and read Stripe resources through GET operations. It also provides account and balance summaries, Stripe documentation search, integration planning, and SQL-style analytics for revenue, charges, products, invoices, subscriptions, disputes, transactions, tax, and payment reporting.

Write operations are available for workflows such as customers, products and prices, Checkout/payment objects, subscriptions, invoices, refunds, coupons, payment links, and dispute handling. Those operations use a separate write tool and can require human confirmation; none was invoked during this test.

## Website comparison

The Stripe connector now has a verified live account context, but the website’s managed `STRIPE_SECRET_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` still report test mode. Connector authorization and website payment-secret selection are separate. Therefore, the connector can read the live Stripe account, but the public website must not yet be described as accepting live payments. The live account still needs to be selected in the website’s Settings → Payment integration before production checkout can be verified.

## References

1. [Stripe API keys](https://docs.stripe.com/keys)
2. [Stripe webhooks](https://docs.stripe.com/webhooks)
