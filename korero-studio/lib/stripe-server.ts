import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeSingleton) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is missing. Add your Stripe test secret key to .env.local and restart the dev server.",
      );
    }
    stripeSingleton = new Stripe(key, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeSingleton;
}

/** Absolute site URL for Checkout redirect URLs. */
export function getAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function getWebhookSecret(): string {
  const s = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!s) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is missing. For local dev run: stripe listen --forward-to localhost:3000/api/stripe/webhook",
    );
  }
  return s;
}

/**
 * Comma-separated list; default card + PayNow for SG Checkout.
 * Set STRIPE_CHECKOUT_PAYMENT_METHODS=card if PayNow is not enabled on the account.
 */
export function checkoutPaymentMethodTypes(): Stripe.Checkout.SessionCreateParams.PaymentMethodType[] {
  const raw = process.env.STRIPE_CHECKOUT_PAYMENT_METHODS?.trim() ?? "card,paynow";
  const parts = raw.split(",").map((p) => p.trim().toLowerCase()) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];
  return parts.length > 0 ? parts : ["card"];
}
