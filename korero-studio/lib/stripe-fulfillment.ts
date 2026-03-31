import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { CLASS_LABELS, creditsForClass, sgdForCredits, SGD_PER_CREDIT } from "@/lib/credits";
import type { ClassType } from "@/types";

const BOOKING_AMOUNT_SGD = 45;
const BOOKING_AMOUNT_CENTS = Math.round(BOOKING_AMOUNT_SGD * 100);

function isClassType(s: string | undefined): s is ClassType {
  return s === "no-filming" || s === "half-song" || s === "full-song";
}

/**
 * Apply paid Checkout to the database (idempotent). Called from the Stripe webhook.
 */
export async function fulfillCheckoutSession(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  if (session.payment_status !== "paid") return;

  const amountTotal = session.amount_total;
  if (amountTotal == null) return;

  const meta = session.metadata ?? {};
  const kind = meta.fulfillment_kind;
  const profileId = meta.profile_id;

  if (!profileId || typeof profileId !== "string") {
    console.error("[stripe] fulfill: missing profile_id", session.id);
    return;
  }

  if (kind === "booking") {
    const bookingId = meta.booking_id;
    if (!bookingId) {
      console.error("[stripe] fulfill booking: missing booking_id", session.id);
      return;
    }
    if (amountTotal !== BOOKING_AMOUNT_CENTS) {
      console.error("[stripe] fulfill booking: amount mismatch", session.id, amountTotal);
      return;
    }
    const { data, error } = await admin
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", bookingId)
      .eq("student_id", profileId)
      .eq("payment_status", "pending")
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[stripe] fulfill booking update", error);
      return;
    }
    if (!data) {
      // Already paid or no matching row
    }
    return;
  }

  if (kind === "credits_topup") {
    const credits = parseInt(meta.credits ?? "", 10);
    if (!Number.isFinite(credits) || credits < 1 || credits > 10_000) {
      console.error("[stripe] fulfill topup: bad credits", session.id);
      return;
    }
    const expectedCents = Math.round(credits * SGD_PER_CREDIT * 100);
    if (amountTotal !== expectedCents) {
      console.error("[stripe] fulfill topup: amount mismatch", session.id, amountTotal, expectedCents);
      return;
    }
    const label = `Credits top-up (+${credits} credits) · Stripe Checkout · ${session.id}`;
    await insertCreditLedgerAndIncrement(admin, {
      profileId,
      kind: "top_up",
      credits,
      label,
      paymentRef: session.id,
      classType: null,
    });
    return;
  }

  if (kind === "credits_plan") {
    const classType = meta.class_type;
    if (!isClassType(classType)) {
      console.error("[stripe] fulfill plan: bad class_type", session.id);
      return;
    }
    const credits = creditsForClass(classType);
    const expectedCents = Math.round(credits * SGD_PER_CREDIT * 100);
    if (amountTotal !== expectedCents) {
      console.error("[stripe] fulfill plan: amount mismatch", session.id);
      return;
    }
    const label = `Class plan: ${CLASS_LABELS[classType]} · ${credits} credits · Stripe Checkout · ${session.id}`;
    await insertCreditLedgerAndIncrement(admin, {
      profileId,
      kind: "class_plan",
      credits,
      label,
      paymentRef: session.id,
      classType,
    });
    return;
  }

  console.error("[stripe] fulfill: unknown fulfillment_kind", kind, session.id);
}

async function insertCreditLedgerAndIncrement(
  admin: SupabaseClient,
  args: {
    profileId: string;
    kind: "top_up" | "class_plan";
    credits: number;
    label: string;
    paymentRef: string;
    classType: ClassType | null;
  },
): Promise<void> {
  const { error: insErr } = await admin.from("credit_transactions").insert({
    profile_id: args.profileId,
    kind: args.kind,
    credits_delta: args.credits,
    sgd_delta: sgdForCredits(args.credits),
    label: args.label,
    class_type: args.classType,
    payment_ref: args.paymentRef,
  });

  if (insErr) {
    if (insErr.code === "23505") {
      // Unique payment_ref — already fulfilled
      return;
    }
    console.error("[stripe] credit_transactions insert", insErr);
    return;
  }

  const { data: row, error: selErr } = await admin
    .from("profiles")
    .select("credits")
    .eq("id", args.profileId)
    .single();
  if (selErr || !row) {
    console.error("[stripe] profile select after ledger insert", selErr);
    return;
  }
  const cur = (row.credits as number) ?? 0;
  const { error: upErr } = await admin
    .from("profiles")
    .update({ credits: cur + args.credits })
    .eq("id", args.profileId);
  if (upErr) {
    console.error("[stripe] profile credits update", upErr);
  }
}

export async function isCheckoutFulfilledInDb(
  admin: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<boolean> {
  const meta = session.metadata ?? {};
  const kind = meta.fulfillment_kind;

  if (kind === "booking" && meta.booking_id) {
    const { data } = await admin
      .from("bookings")
      .select("payment_status")
      .eq("id", meta.booking_id)
      .maybeSingle();
    return data?.payment_status === "paid";
  }

  if (kind === "credits_topup" || kind === "credits_plan") {
    const { data } = await admin
      .from("credit_transactions")
      .select("id")
      .eq("payment_ref", session.id)
      .maybeSingle();
    return !!data;
  }

  return false;
}
