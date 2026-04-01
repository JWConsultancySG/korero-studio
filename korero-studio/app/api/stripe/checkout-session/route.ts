import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin, getStripe, checkoutPaymentMethodTypes } from "@/lib/stripe-server";
import { safeAppReturnTarget, withStripeCanceledParam } from "@/lib/stripe-nav";
import { CLASS_LABELS, creditsForClass, isClassType, SGD_PER_CREDIT } from "@/lib/credits";
import type { ClassType } from "@/types";

export const runtime = "nodejs";

const BOOKING_AMOUNT_SGD = 45;

type Body =
  | { kind: "topup"; credits: number; returnNext?: string }
  | { kind: "class_plan"; classType: ClassType; returnNext?: string }
  | { kind: "booking"; bookingId: string; groupId: string }
  | { kind: "lesson_confirm"; classId: string; returnNext?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profileId = user.id;

  try {
    const origin = getAppOrigin();
    const stripe = getStripe();
    const pmTypes = checkoutPaymentMethodTypes();

    if (body.kind === "topup") {
      const credits = Number(body.credits);
      if (!Number.isFinite(credits) || credits < 1 || credits > 10_000) {
        return NextResponse.json({ error: "Invalid credits amount" }, { status: 400 });
      }
      const amountCents = Math.round(credits * SGD_PER_CREDIT * 100);
      const returnTarget = safeAppReturnTarget(body.returnNext);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email ?? undefined,
        payment_method_types: pmTypes,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "sgd",
              unit_amount: amountCents,
              product_data: {
                name: `Credit top-up (${credits} credits)`,
                description: `Korero Studio · ${credits} credits at S$${SGD_PER_CREDIT} each`,
              },
            },
          },
        ],
        metadata: {
          fulfillment_kind: "credits_topup",
          profile_id: profileId,
          credits: String(credits),
        },
        success_url: `${origin}/payment/stripe-return?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(returnTarget)}`,
        cancel_url: `${origin.replace(/\/$/, "")}${withStripeCanceledParam(returnTarget)}`,
      });
      return NextResponse.json({ url: session.url });
    }

    if (body.kind === "class_plan") {
      if (!isClassType(body.classType)) {
        return NextResponse.json({ error: "Invalid class type" }, { status: 400 });
      }
      const credits = creditsForClass(body.classType);
      const amountCents = Math.round(credits * SGD_PER_CREDIT * 100);
      const returnTarget = safeAppReturnTarget(body.returnNext);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email ?? undefined,
        payment_method_types: pmTypes,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "sgd",
              unit_amount: amountCents,
              product_data: {
                name: `Class plan: ${CLASS_LABELS[body.classType]}`,
                description: `Korero Studio · ${credits} credits`,
              },
            },
          },
        ],
        metadata: {
          fulfillment_kind: "credits_plan",
          profile_id: profileId,
          class_type: body.classType,
        },
        success_url: `${origin}/payment/stripe-return?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(returnTarget)}`,
        cancel_url: `${origin.replace(/\/$/, "")}${withStripeCanceledParam(returnTarget)}`,
      });
      return NextResponse.json({ url: session.url });
    }

    if (body.kind === "lesson_confirm") {
      const classId = typeof body.classId === "string" ? body.classId.trim() : "";
      if (!classId) {
        return NextResponse.json({ error: "Missing class id" }, { status: 400 });
      }

      const { data: cls, error: cErr } = await supabase
        .from("classes")
        .select("id,matching_state,student_payments,class_type_at_creation,song_title")
        .eq("id", classId)
        .maybeSingle();

      if (cErr || !cls) {
        return NextResponse.json({ error: "Class not found" }, { status: 404 });
      }
      if (cls.matching_state !== "instructor_confirmed") {
        return NextResponse.json({ error: "Class is not awaiting lesson payment" }, { status: 400 });
      }

      const payments = (cls.student_payments ?? {}) as Record<string, "pending" | "paid">;
      if (!(profileId in payments) || payments[profileId] !== "pending") {
        return NextResponse.json({ error: "You are not pending payment for this class" }, { status: 400 });
      }

      const classType = cls.class_type_at_creation;
      if (!isClassType(classType)) {
        return NextResponse.json({ error: "Invalid class format" }, { status: 400 });
      }

      const credits = creditsForClass(classType);
      const amountCents = Math.round(credits * SGD_PER_CREDIT * 100);
      const songTitle = (cls.song_title as string)?.trim() || "Class";
      const returnTarget = safeAppReturnTarget(body.returnNext ?? `/browse/${classId}`);

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email ?? undefined,
        payment_method_types: pmTypes,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "sgd",
              unit_amount: amountCents,
              product_data: {
                name: `Lesson confirmation · ${CLASS_LABELS[classType]}`,
                description: `Korero Studio · "${songTitle}" · ${credits} credits equivalent`,
              },
            },
          },
        ],
        metadata: {
          fulfillment_kind: "lesson_confirm",
          profile_id: profileId,
          class_id: classId,
          credits: String(credits),
          class_type: classType,
        },
        success_url: `${origin}/payment/stripe-return?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(returnTarget)}`,
        cancel_url: `${origin.replace(/\/$/, "")}${withStripeCanceledParam(returnTarget)}`,
      });
      return NextResponse.json({ url: session.url });
    }

    if (body.kind === "booking") {
      const { bookingId, groupId } = body;
      if (!bookingId || !groupId || typeof bookingId !== "string" || typeof groupId !== "string") {
        return NextResponse.json({ error: "Missing booking or class id" }, { status: 400 });
      }

      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .select("id, student_id, class_id, payment_status, amount")
        .eq("id", bookingId)
        .single();

      if (bErr || !booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      if (booking.student_id !== profileId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (booking.payment_status !== "pending") {
        return NextResponse.json({ error: "Booking is not awaiting payment" }, { status: 400 });
      }
      if (booking.class_id !== groupId) {
        return NextResponse.json({ error: "Booking does not match class" }, { status: 400 });
      }
      const amt = Number(booking.amount);
      if (!Number.isFinite(amt) || amt !== BOOKING_AMOUNT_SGD) {
        return NextResponse.json({ error: "Unexpected booking amount" }, { status: 400 });
      }

      const amountCents = Math.round(BOOKING_AMOUNT_SGD * 100);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email ?? undefined,
        payment_method_types: pmTypes,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "sgd",
              unit_amount: amountCents,
              product_data: {
                name: "Studio class booking",
                description: "Korero Studio booking payment",
              },
            },
          },
        ],
        metadata: {
          fulfillment_kind: "booking",
          profile_id: profileId,
          booking_id: bookingId,
        },
        success_url: `${origin}/payment/stripe-return?session_id={CHECKOUT_SESSION_ID}&next=${encodeURIComponent(`/booking/${groupId}`)}`,
        cancel_url: `${origin.replace(/\/$/, "")}${withStripeCanceledParam(`/booking/${groupId}`)}`,
      });
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "Unknown checkout kind" }, { status: 400 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe error";
    console.error("[stripe] checkout-session", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
