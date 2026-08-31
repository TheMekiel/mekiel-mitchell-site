# Shippo Webhook and Book Two Cover Verification

## Official Shippo guidance

Shippo’s current documentation confirms that webhooks are configured in the Shippo API Portal, accept an **Event Type**, **Mode**, and public URL, and can be tested with a sample payload. Shippo supports self-generated tokens in webhook URLs and expects the receiving endpoint to return HTTP 200 for accepted events.

Sources:

- https://docs.goshippo.com/tracking/webhooks
- https://docs.goshippo.com/tracking/webhook-security
- https://docs.goshippo.com/tracking/webhook-debugging

## Supplied cover handoff

The user-provided archive contains a 1254×1254 master PNG and a 1254×1254 optimized WebP. Its README designates the WebP as the preferred website asset, requires the artwork to remain uncropped at its original aspect ratio with `object-fit: contain`, and identifies the artwork as the temporary/current cover pending later approval.

The uploaded persistent website assets are:

- Display WebP: `/manus-storage/from-arbitrage-to-ownership-cover-web_47eb703b.webp`
- Retained master PNG: `/manus-storage/from-arbitrage-to-ownership-cover-master_ea32968b.png`

## Preview verification

Both the Home teaser and visible Shop Book Two image resolve to the uploaded 1254×1254 WebP. The visible Shop image renders at 280×280 with `object-fit: contain`, the full supplied alt text, and no cropping.

The checkout drawer rate test was repeated with one physical paperback plus one digital eBook in the cart and the user-provided North Charleston business address. Shippo returned three selectable USPS test-mode services:

| Service | Estimated transit | Rate |
|---|---:|---:|
| USPS Ground Advantage | About 3 business days | $5.58 |
| USPS Priority Mail | About 3 business days | $8.01 |
| USPS Priority Mail Express | About 1 business day | $31.11 |

No rate was selected in this repeat test, Stripe Checkout was not started, and no label or transaction was created.

## Webhook token verification

`SHIPPO_WEBHOOK_TOKEN` was initially missing. A new 48-character cryptographically random hexadecimal token was stored through the project’s secure environment configuration and validated with a dedicated endpoint test. The preview endpoint returns HTTP 400 for the correct token plus an intentionally incomplete payload, and HTTP 401 for an incorrect token. This distinguishes a recognized token from an unauthorized path without processing a Shippo event.

The currently published production deployment still returns HTTP 401 for both the new token and an incorrect token. This confirms that the new secret will not become active on the custom domain until the next checkpoint is published. Do not enable the Production webhook in Shippo before that publication and a follow-up endpoint test.

## Responsive visual review

Full-page Shop previews were reviewed at 1280×900 and 390×844. The temporary Book Two cover is sharp, uncropped, and legible in both layouts; its title, monogram, skyline, chart, and outer edges remain visible. The existing Coming Soon ribbon remains part of the site presentation and does not obscure the supplied title.

## Final automated validation

| Validation | Result |
|---|---|
| Vitest | 11 files and 32 tests passed |
| TypeScript | `tsc --noEmit` passed |
| Production build | Vite client build and bundled Express server passed |
| Link audit | 19 internal route controls, zero invalid routes, zero unresolved placeholder links, nine Kit forms, and the approved audiobook source |
| Source credential scan | Passed; neither the webhook token nor provider credential formats appear in source or project documentation |

The only credential-shaped match found during the broader workspace scan was the platform-managed `.project-config.json`. That file is untracked and ignored by Git, as intended for environment configuration.
