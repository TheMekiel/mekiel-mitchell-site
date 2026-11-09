# Kit Purchase Delivery Email

The site now sends a paid Stripe checkout session to Kit through the existing purchase form `9849297`. It stores a customer-specific URL in the `purchase_downloads_url` custom field, then adds the subscriber to the purchase form. The form's Kit automation must send the confirmation email below.

## One-time Kit setup

1. Confirm the Kit API key is available to the live website as `KIT_API_KEY` (or `KIT_V4_API_KEY`). The site creates the custom field automatically if the key has write access. If the account already has a field with a different key, set `KIT_PURCHASE_DOWNLOADS_FIELD_KEY` to that existing key.
2. In Kit, open form `9849297`, named for the purchase thank-you flow, and connect it to an automation or sequence that sends one email immediately after the subscriber is added.
3. Use the following subject and body. The Liquid field resolves to the paid customer's session-specific download page, which shows only the ebook and/or audiobook included in that order.

## Confirmation email

**Subject:** Your Mekiel Mitchell digital purchase is ready

**Body:**

Hi `{{ subscriber.first_name | strip | default: "there" }}`,

Thank you for your purchase from The Mekiel Mitchell.

Your digital download links are ready:

`{{ subscriber.purchase_downloads_url }}`

That link is unique to your paid order and includes the ebook and audiobook purchased. If you have any trouble downloading your files, reply to this email or contact info@themekielmitchell.com.

— Mekiel Mitchell

If the email editor is being used in HTML mode, make the Liquid URL a button or linked text. Do not replace it with a static `/manus-storage/` path; the application download page verifies the paid Stripe session before redirecting to a signed file URL.

## Important behavior

The browser success page remains a fallback and shows the links immediately after Stripe confirms payment. The Stripe `checkout.session.completed` webhook is the primary trigger, so the customer can still receive the Kit email even if they close the browser before returning to the website. If Kit is not configured, the paid-session browser links continue to work and the server logs the missing email configuration.

## Official API references

- [Create a subscriber](https://developers.kit.com/api-reference/subscribers/create-a-subscriber)
- [Create a custom field](https://developers.kit.com/api-reference/custom-fields/create-a-custom-field)
- [Add subscriber to a form by email address](https://developers.kit.com/api-reference/forms/add-subscriber-to-form-by-email-address)
