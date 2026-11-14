import type Stripe from "stripe";
import type { CheckoutItem } from "./stripeProducts";

const NOTIFICATION_RECIPIENT = "info@themekielmitchell.com";
const NOTIFICATION_SENDER = "Mekiel Mitchell Orders <orders@updates.themekielmitchell.com>";

type OrderNotificationInput = {
  session: Stripe.Checkout.Session;
  items: CheckoutItem[];
  shippoShipmentId: string | null;
};

function formatMoney(amount: number | null | undefined) {
  return typeof amount === "number" ? `$${(amount / 100).toFixed(2)}` : "Not available";
}

function buildText({ session, items, shippoShipmentId }: OrderNotificationInput) {
  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address;
  const productLines = items
    .map(item => `- ${item.product.name} x${item.quantity}`)
    .join("\n");
  const addressLines = shipping && address
    ? [
        shipping.name,
        address.line1,
        address.line2,
        [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
        address.country,
      ].filter(Boolean).join("\n")
    : "Shipping address unavailable";

  return [
    "A new paid physical order was received on the Mekiel Mitchell website.",
    "",
    `Stripe checkout session: ${session.id}`,
    `Customer: ${session.customer_details?.name || "Not provided"}`,
    `Email: ${session.customer_details?.email || "Not provided"}`,
    `Total: ${formatMoney(session.amount_total)}`,
    "",
    "Items:",
    productLines || "- Not available",
    "",
    "Shipping address:",
    addressLines,
    "",
    `Shippo shipment: ${shippoShipmentId || "Not created"}`,
    "No shipping label was purchased automatically. Review and purchase the label manually in Shippo.",
  ].join("\n");
}

export async function sendPaidPhysicalOrderNotification(input: OrderNotificationInput) {
  const resendApiKey = process.env.RESEND_API_KEY ?? "";
  if (!resendApiKey) {
    console.warn("[Resend] Paid-order notification skipped: API key is not configured.");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `paid-physical-order-${input.session.id}`,
    },
    body: JSON.stringify({
      from: NOTIFICATION_SENDER,
      to: [NOTIFICATION_RECIPIENT],
      subject: `New paid physical order — ${input.session.id}`,
      text: buildText(input),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.warn(
      `[Resend] Paid-order notification failed (${response.status})${errorBody ? `: ${errorBody.slice(0, 300)}` : ""}`,
    );
    return false;
  }

  return true;
}
