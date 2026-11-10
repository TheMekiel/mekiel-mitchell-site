# Kit paid-order handoff

The site uses existing Kit subscriber fields and purchase tags. It does **not** add anyone to purchase form `9849297`, create custom fields, create emails, send email directly, or enroll anyone in a sequence. Existing newsletter, waitlist and speaking forms are unchanged. Existing Kit automations remain responsible for any messages they already send.

## Existing fields and subscriber preservation

`order_link` receives the paid-session downloads hub at `https://themekielmitchell.com/api/digital/downloads?session_id=…` when the order includes a supported digital asset. The hub verifies payment and shows only assets purchased in that session. Each download verifies payment and entitlement again before redirecting to a signed file URL. Physical-only orders clear `order_link`, rather than leaving an unrelated prior digital purchase link.

`shipping_carrier` receives the selected Stripe metadata `shipping_provider` and `shipping_service`, joined with one space. It is blank for digital-only orders; missing physical shipping metadata is not guessed. These are the only custom fields this integration writes. Deprecated `KIT_PURCHASE_DOWNLOADS_FIELD_KEY` and `KIT_PURCHASE_FORM_ID` overrides are no longer used.

Kit is authenticated with the existing `KIT_V4_API_KEY` or `KIT_API_KEY`. No credentials or infrastructure are changed by this implementation. Both custom fields must already exist. Unknown-field API warnings are treated as a failed handoff, so purchase tags are not applied to incomplete fields.

Subscriber lookup uses the documented `GET /v4/subscribers?email_address=…&status=all`, following cursor pagination. Kit defaults to active-only lookup, so `status=all` is necessary to find cancelled, bounced, complained and inactive subscribers. Updates use `PUT /v4/subscribers/{id}` and never supply `state`; existing suppression/cancellation is preserved. The Stripe customer's first name, taken only from `customer_details.name`, is written only when the existing Kit `first_name` is null, empty or whitespace. A saved Kit name is not overwritten. [1] [2]

If lookup finds nobody, `POST /v4/subscribers` creates/upserts with the email address only, then the returned subscriber is updated. The create endpoint cannot update an existing subscriber's state. Omitting the name on this upsert also avoids overwriting a saved name if an eventually consistent lookup missed an existing subscriber. This code never makes a separate activation request. [1] [3]

## Paid-order purchase tags

After the fields update is accepted, every paid order adds the applicable exact labels:

- `Purchased – Digital` for catalog category `digital`.
- `Purchased – Physical` for catalog categories `book` or `merch`.
- `Purchased – GHFP eBook` for `ghfp-ebook` and `ghfp-bundle`, in addition to the Digital tag.

Mixed orders get both Digital and Physical. Audiobook-only orders get Digital, not the GHFP eBook tag. Labels contain an en dash (`U+2013`) with one space on each side. Existing tags are found by traversing all `GET /v4/tags` pages with `after=<end_cursor>`; only missing applicable tags are created through `POST /v4/tags` with the exact `name`. Tag creation is name-idempotent, so concurrent creation does not intentionally duplicate tags. An unexpected differently named tag is rejected rather than renamed. [4] [5]

The code adds each applicable tag using `POST /v4/tags/{tag_id}/subscribers/{id}` on every paid order and Stripe retry. Kit returns `200` if the subscriber already has the tag and `201` for a new membership. It never removes/re-adds a tag to force automation re-entry. An existing automation **may not re-enter when the tag is already present**; API acceptance does not prove an automation ran, an email was queued by Kit, or a message was sent. Repeat purchases therefore do not guarantee a new email from an existing tag-triggered automation. The browser still provides paid downloads directly. [6]

## Entry points and retries

The signed Stripe webhook `POST /api/stripe/webhook` is primary. It handles `checkout.session.completed` and `checkout.session.async_payment_succeeded` only when `payment_status === "paid"`. Unpaid completions and unrelated events are acknowledged without order fulfillment or Kit writes. Paid events persist the commerce order and then perform the Kit handoff. Kit failures, missing configuration, failed field updates, or incomplete tag adds return `503` with a generic error so Stripe can retry; successful handoffs return `200` with `{ received: true, kitHandoffAccepted: true }`. No public error contains Stripe session IDs or raw Kit/Stripe API response text. The helper independently rejects unpaid sessions even if a caller forgets its gate.

`GET /api/digital/delivery?session_id=…` verifies payment and returns `{ downloads, kitHandoffAccepted }`. Its fallback calls the helper with `applyPurchaseTags: false`: it can repair subscriber fields but never lists, creates or applies tags, adds forms, enrolls sequences, or writes emails. Reloads cannot retrigger purchase tags. `kitHandoffAccepted: true` means that this field-only Kit handoff was accepted, **not** that the webhook applied tags or an email was sent. If Kit is unavailable, the route still returns the paid downloads and `kitHandoffAccepted: false`. The client reflects this limited status truthfully.

`GET /api/digital/downloads?session_id=…` and `GET /api/digital/download?session_id=…&asset=ebook|audiobook` remain read-only download gates. Invalid session IDs return `400`; unpaid sessions return `403`; provider failures return generic `502`; missing digital products or unpurchased assets return `404`. Successful file downloads use a `307` signed-URL redirect. None of these two download endpoints invokes Kit.

## Field-only backfill helper

The exported TypeScript helper is `syncKitPurchaseDelivery(session, { applyPurchaseTags: false })`. Pass a trusted Stripe session retrieved server-side and already verified as paid; the helper checks payment again. This option writes subscriber fields and fills a blank first name, creating the subscriber only if absent. It does not read/write tags or subscribe to any form/sequence and does not create or send any email. Existing automations that independently listen for subscriber/field changes remain outside this helper's control; the code makes no email-delivery guarantee. A field-only result is `{ ok: true, status: "fields_updated", email, subscriberId, downloadUrl, tagsApplied: [] }`. Do not omit the option in a historical backfill: the default is paid-order tagging.

The default helper result is `{ ok: true, status: "queued", email, subscriberId, downloadUrl, tagsApplied }`, where `queued` means the application's handoff has been accepted and all applicable tag-add requests have succeeded. `downloadUrl` is null for physical-only orders. Rejected unpaid orders, missing email/configuration, or unrecognized products return `{ ok: false, reason }`; API/network/malformed-response failures throw a sanitized error. Partial tag failure is not success and can safely be retried with idempotent adds. No historical orders were backfilled and no live Kit changes were performed as part of this code change.

## Validation

Focused tests cover mixed, physical and digital orders, bundle/eBook tags, unpaid rejection, existing-name and subscriber-state preservation, field-only backfills, paginated tag discovery/creation, repeat idempotent adds, safe API errors, webhook retries, client copy, and unchanged download entitlement/payment gates. Tests use mocked providers only.

## References

[1]: https://developers.kit.com/api-reference/subscribers/list-subscribers "Kit v4 list subscribers and email lookup"
[2]: https://developers.kit.com/api-reference/subscribers/update-a-subscriber "Kit v4 update a subscriber"
[3]: https://developers.kit.com/api-reference/subscribers/create-a-subscriber "Kit v4 create a subscriber and upsert behavior"
[4]: https://developers.kit.com/api-reference/tags/list-tags "Kit v4 list tags and cursor pagination"
[5]: https://developers.kit.com/api-reference/tags/create-a-tag "Kit v4 name-idempotent tag creation"
[6]: https://developers.kit.com/api-reference/tags/tag-a-subscriber "Kit v4 idempotent subscriber tag adds"
