import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe-server";
import { fulfillCheckoutSession, isCheckoutFulfilledInDb } from "@/lib/stripe-fulfillment";

export const runtime = "nodejs";

/**
 * Lets the return page poll until the webhook has updated Supabase (or session failed).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session_id")?.trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ error: "Invalid session_id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.profile_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const paymentStatus = session.payment_status;
    if (paymentStatus !== "paid") {
      return NextResponse.json({
        paymentStatus,
        fulfilled: false,
        fulfillmentKind: session.metadata?.fulfillment_kind ?? null,
      });
    }

    let fulfilled = false;
    let fulfillmentError: string | null = null;
    try {
      const admin = createAdminClient();
      fulfilled = await isCheckoutFulfilledInDb(admin, session);
      // Fallback for environments where webhook delivery is delayed/misconfigured:
      // apply fulfillment directly from verified paid session (idempotent by payment_ref unique key).
      if (paymentStatus === "paid" && !fulfilled) {
        await fulfillCheckoutSession(admin, session);
        fulfilled = await isCheckoutFulfilledInDb(admin, session);
      }
    } catch (e) {
      fulfillmentError = e instanceof Error ? e.message : "Fulfillment check failed";
      const meta = session.metadata ?? {};
      const kind = meta.fulfillment_kind;
      if (kind === "booking" && meta.booking_id) {
        const { data } = await supabase
          .from("bookings")
          .select("payment_status")
          .eq("id", meta.booking_id)
          .eq("student_id", user.id)
          .maybeSingle();
        fulfilled = data?.payment_status === "paid";
      } else if (kind === "credits_topup" || kind === "credits_plan" || kind === "lesson_confirm") {
        const { data } = await supabase
          .from("credit_transactions")
          .select("id")
          .eq("payment_ref", session.id)
          .eq("profile_id", user.id)
          .maybeSingle();
        fulfilled = !!data;
      }
    }

    if (paymentStatus === "paid" && !fulfilled && fulfillmentError) {
      return NextResponse.json(
        {
          error: `Payment captured but credits/booking not applied yet: ${fulfillmentError}`,
          paymentStatus,
          fulfilled: false,
          fulfillmentKind: session.metadata?.fulfillment_kind ?? null,
        },
        { status: 500 },
      );
    }
    return NextResponse.json({
      paymentStatus,
      fulfilled,
      fulfillmentKind: session.metadata?.fulfillment_kind ?? null,
      paymentRef: session.id,
      bookingId: session.metadata?.booking_id ?? null,
    });
  } catch (e) {
    console.error("[stripe] verify-session", e);
    return NextResponse.json({ error: "Could not verify session" }, { status: 502 });
  }
}
