/**
 * WhatsApp Cloud API (Meta) — call from server only. If env is missing, returns simulated success for demos.
 * @see https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */

export type WhatsAppSendResult =
  | { ok: true; messageId?: string; simulated?: boolean }
  | { ok: false; error: string; simulated?: boolean };

export async function sendWhatsAppMessage(params: {
  toE164: string;
  body: string;
}): Promise<WhatsAppSendResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  const digits = params.toE164.replace(/\D/g, "");
  if (digits.length < 8) {
    return { ok: false, error: "Invalid phone number" };
  }

  if (!phoneNumberId || !accessToken) {
    console.info("[whatsapp] Simulated send (no WHATSAPP_* env):", params.toE164, params.body.slice(0, 80));
    return { ok: true, simulated: true };
  }

  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: digits,
      type: "text",
      text: { preview_url: false, body: params.body },
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    messages?: { id: string }[];
    error?: { message: string };
  };

  if (!res.ok) {
    return { ok: false, error: json.error?.message ?? res.statusText };
  }

  return { ok: true, messageId: json.messages?.[0]?.id };
}
