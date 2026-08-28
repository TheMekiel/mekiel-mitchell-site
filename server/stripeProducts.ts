export type StripeProduct = {
  name: string;
  unitAmount: number;
  category: "digital" | "book" | "merch";
  available: boolean;
  shippingProfile?: "paperback" | "hardcover" | "tee" | "accessory" | "bundle";
};

export const STRIPE_PRODUCTS: Record<string, StripeProduct> = {
  "ghfp-ebook": { name: "The Group Home Funding Playbook — eBook", unitAmount: 2700, category: "digital", available: true },
  "ghfp-audio": { name: "The Group Home Funding Playbook — Audiobook", unitAmount: 3700, category: "digital", available: true },
  "ghfp-bundle": { name: "The Group Home Funding Playbook — Digital Bundle (eBook + Audiobook)", unitAmount: 5700, category: "digital", available: true },
  "ghfp-paperback": { name: "The Group Home Funding Playbook — Paperback", unitAmount: 2500, category: "book", available: true, shippingProfile: "paperback" },
  "ghfp-hardcover": { name: "The Group Home Funding Playbook — Hardcover", unitAmount: 3000, category: "book", available: true, shippingProfile: "hardcover" },
  "a2o-ebook": { name: "From Arbitrage To Ownership — eBook", unitAmount: 2700, category: "digital", available: false },
  "a2o-audio": { name: "From Arbitrage To Ownership — Audiobook", unitAmount: 3700, category: "digital", available: false },
  "a2o-bundle": { name: "From Arbitrage To Ownership — Digital Bundle (eBook + Audiobook)", unitAmount: 5700, category: "digital", available: false },
};

export type CheckoutItem = {
  id: string;
  product: StripeProduct;
  quantity: number;
};

export function normalizeCheckoutItems(input: unknown): CheckoutItem[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 25) {
    throw new Error("A cart with 1–25 items is required.");
  }

  const quantities = new Map<string, number>();
  for (const rawItem of input) {
    if (!rawItem || typeof rawItem !== "object") throw new Error("Invalid cart item.");
    const { id, qty } = rawItem as { id?: unknown; qty?: unknown };
    if (typeof id !== "string" || !(id in STRIPE_PRODUCTS)) throw new Error("Unknown cart product.");
    if (!STRIPE_PRODUCTS[id]?.available) throw new Error("This product is not available for checkout yet.");
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 10) {
      throw new Error("Each item quantity must be between 1 and 10.");
    }
    quantities.set(id, (quantities.get(id) ?? 0) + qty);
  }

  return Array.from(quantities.entries()).map(([id, quantity]) => {
    if (quantity > 10) throw new Error("Each item quantity must be between 1 and 10.");
    return { id, product: STRIPE_PRODUCTS[id], quantity };
  });
}
