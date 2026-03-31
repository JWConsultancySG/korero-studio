"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeAppReturnTarget } from "@/lib/stripe-nav";
import { readVerifySessionResponse } from "@/lib/stripe-client";

export function StripeReturnClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const nextRaw = searchParams.get("next") || "/profile";
  const [phase, setPhase] = useState<"loading" | "error" | "timeout">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!sessionId || !sessionId.startsWith("cs_")) {
      setPhase("error");
      setErrorMessage("Missing or invalid checkout session.");
      return;
    }

    let cancelled = false;
    const started = Date.now();
    const maxMs = 90_000;

    const poll = async () => {
      try {
        const r = await fetch(
          `/api/stripe/verify-session?session_id=${encodeURIComponent(sessionId)}`,
          { credentials: "include" },
        );
        const data = await readVerifySessionResponse(r);
        if (cancelled) return;
        if (!r.ok) {
          setPhase("error");
          setErrorMessage(data.error ?? "Verification failed");
          return;
        }
        if (data.paymentStatus === "paid" && data.fulfilled) {
          const path = safeAppReturnTarget(nextRaw);
          const u = new URL(path, window.location.origin);
          u.searchParams.set("stripe_ref", sessionId);
          router.replace(u.pathname + u.search);
          return;
        }
        if (Date.now() - started > maxMs) {
          setPhase("timeout");
          return;
        }
        setTimeout(poll, 1400);
      } catch {
        if (!cancelled) {
          setPhase("error");
          setErrorMessage("Network error while confirming payment.");
        }
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId, nextRaw, router]);

  if (phase === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          Confirming payment with Stripe… This usually takes a few seconds.
        </p>
      </div>
    );
  }

  if (phase === "timeout") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-muted-foreground max-w-md">
          Payment may still be processing. Check your balance or booking status in a moment, or refresh the page.
        </p>
        <Button asChild className="rounded-2xl font-bold">
          <Link href={safeAppReturnTarget(nextRaw)}>Continue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm text-destructive max-w-md">{errorMessage}</p>
      <Button asChild variant="outline" className="rounded-2xl font-bold">
        <Link href={safeAppReturnTarget(nextRaw)}>Go back</Link>
      </Button>
    </div>
  );
}
