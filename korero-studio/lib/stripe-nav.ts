/**
 * Internal return targets only (Stripe success redirect). Blocks protocol-relative and absolute URLs.
 */
export function safeAppReturnTarget(next: string | undefined | null, fallback = "/profile"): string {
  if (!next || typeof next !== "string") return fallback;
  const raw = next.trim();
  const qIndex = raw.indexOf("?");
  const pathPart = (qIndex === -1 ? raw : raw.slice(0, qIndex)).split("#")[0];
  if (!pathPart.startsWith("/") || pathPart.startsWith("//")) return fallback;
  if (pathPart.includes("://")) return fallback;
  return raw.startsWith("/") ? raw : fallback;
}

/** Append `stripe_canceled=1` for Checkout cancel_url (returnTarget is a path like `/profile` or `/browse/new?asAdmin=1`). */
export function withStripeCanceledParam(returnTarget: string): string {
  return returnTarget.includes("?")
    ? `${returnTarget}&stripe_canceled=1`
    : `${returnTarget}?stripe_canceled=1`;
}
