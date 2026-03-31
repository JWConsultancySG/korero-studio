/** Avoids "Unexpected end of JSON input" when the server returns an empty or non-JSON body (e.g. uncaught 500). */
export async function readCheckoutSessionResponse(
  res: Response,
): Promise<{ url?: string; error?: string }> {
  const text = await res.text();
  if (!text.trim()) {
    if (!res.ok) {
      throw new Error(
        `Checkout failed (${res.status}). Add STRIPE_SECRET_KEY to .env.local and restart \`npm run dev\`.`,
      );
    }
    return {};
  }
  try {
    return JSON.parse(text) as { url?: string; error?: string };
  } catch {
    throw new Error(
      res.ok
        ? "Invalid response from checkout"
        : `Checkout failed (${res.status}). Check the terminal / server logs.`,
    );
  }
}

export type VerifySessionPayload = {
  error?: string;
  paymentStatus?: string;
  fulfilled?: boolean;
  fulfillmentKind?: string | null;
};

export async function readVerifySessionResponse(res: Response): Promise<VerifySessionPayload> {
  const text = await res.text();
  if (!text.trim()) {
    return { error: res.ok ? undefined : `Empty response (${res.status})` };
  }
  try {
    return JSON.parse(text) as VerifySessionPayload;
  } catch {
    return { error: `Invalid response (${res.status})` };
  }
}
