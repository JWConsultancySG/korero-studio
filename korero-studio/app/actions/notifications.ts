"use server";

import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { createServiceSupabase } from "@/lib/supabase/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildLessonPaymentDueMessage } from "@/lib/notification-messages";

/**
 * After the instructor locks lesson slots, notify every enrolled student (in-app).
 * Uses service role so inserts are not blocked by RLS.
 */
export async function notifyStudentsLessonPaymentDue(payload: {
  classId: string;
  songTitle: string;
  artist: string;
  studentIds: string[];
}): Promise<{ ok: true; inserted: number } | { ok: false; reason: string }> {
  const ids = [...new Set(payload.studentIds)].filter(Boolean);
  if (ids.length === 0) return { ok: true, inserted: 0 };

  const message = buildLessonPaymentDueMessage(payload.songTitle, payload.artist, payload.classId);
  const rows = ids.map((student_id) => ({
    student_id,
    message,
    read: false,
  }));

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("student_notifications").insert(rows);
    if (error) {
      console.error("[korero] notifyStudentsLessonPaymentDue", error);
      return { ok: false, reason: error.message };
    }
    return { ok: true, inserted: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "admin client failed";
    console.error("[korero] notifyStudentsLessonPaymentDue", e);
    return { ok: false, reason: msg };
  }
}

/** Auto: class reached max members — notify admin WhatsApp Business number. */
export async function notifyClassThresholdReached(payload: {
  groupId: string;
  songTitle: string;
  artist: string;
  interestCount: number;
  maxMembers: number;
}) {
  const adminPhone = process.env.WHATSAPP_NOTIFY_ADMIN_E164?.trim();
  const body = [
    `Korero — Class is full`,
    `"${payload.songTitle}" — ${payload.artist}`,
    `Members: ${payload.interestCount}/${payload.maxMembers}`,
    `Class ID: ${payload.groupId}`,
    `Open Admin → Classes to confirm next steps.`,
  ].join("\n");

  const supabase = createServiceSupabase();
  if (supabase) {
    try {
      await supabase.from("classes").update({ full_notified_at: new Date().toISOString() }).eq("id", payload.groupId);
      await supabase.from("korero_notification_log").insert({
        kind: "class_full",
        payload: payload as unknown as Record<string, unknown>,
        to_phone: adminPhone ?? null,
        body,
      });
    } catch (e) {
      console.warn("[korero] korero_notification_log insert skipped:", e);
    }
  }

  if (!adminPhone) {
    return { ok: true as const, simulated: true, reason: "WHATSAPP_NOTIFY_ADMIN_E164 not set" };
  }

  const result = await sendWhatsAppMessage({ toE164: adminPhone, body });
  return result.ok ? { ok: true as const, simulated: result.simulated } : { ok: false as const, error: result.error };
}

/** Manual send from admin console. */
export async function sendManualWhatsAppMessage(payload: { toE164: string; body: string }) {
  const result = await sendWhatsAppMessage({ toE164: payload.toE164, body: payload.body });
  const supabase = createServiceSupabase();
  if (supabase) {
    await supabase.from("korero_notification_log").insert({
      kind: "manual",
      payload: {},
      to_phone: payload.toE164,
      body: payload.body,
    });
  }
  return result;
}

/** Post-payment follow-up: save + WhatsApp student with thank-you + summary. */
export async function submitPostPaymentFollowUp(payload: {
  studentId: string;
  studentEmail?: string;
  studentPhoneE164: string;
  experienceLevel: string;
  note?: string;
  paymentRef?: string;
}) {
  const supabase = createServiceSupabase();
  if (supabase) {
    try {
      await supabase.from("korero_followups").insert({
        student_id: payload.studentId,
        student_email: payload.studentEmail ?? null,
        student_phone: payload.studentPhoneE164,
        experience_level: payload.experienceLevel,
        note: payload.note ?? null,
        payment_ref: payload.paymentRef ?? null,
      });
    } catch (e) {
      console.warn("[korero] korero_followups insert skipped:", e);
    }
  }

  const body = [
    `Thanks for your payment at Korero Studio.`,
    `Experience: ${payload.experienceLevel}`,
    payload.note ? `Note: ${payload.note}` : "",
    payload.paymentRef ? `Ref: ${payload.paymentRef}` : "",
    `We’ll match you with the best class fit. Reply to this chat if anything changes.`,
  ]
    .filter(Boolean)
    .join("\n");

  const result = await sendWhatsAppMessage({ toE164: payload.studentPhoneE164, body });
  if (!result.ok) {
    return { ok: false as const, error: "error" in result ? result.error : "WhatsApp send failed" };
  }
  return { ok: true as const, simulated: result.simulated };
}
