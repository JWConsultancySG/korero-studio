"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ClassType } from "@/types";
import { readCheckoutSessionResponse } from "@/lib/stripe-client";

export type StripeCheckoutIntent =
  | { kind: "topup"; credits: number }
  | { kind: "class_plan"; classType: ClassType };

export type CreditsPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  amountSgd: number;
  creditsLine: string;
  stripeIntent: StripeCheckoutIntent;
  /** Where to send the user after Stripe (e.g. `/browse/new?asAdmin=1`). Defaults to `/profile`. */
  returnNext?: string;
  /** Called immediately before redirecting to Stripe (e.g. persist wizard state). */
  onBeforeStripeRedirect?: () => void;
};

export function CreditsPaymentDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  amountSgd,
  creditsLine,
  stripeIntent,
  returnNext,
  onBeforeStripeRedirect,
}: CreditsPaymentDialogProps) {
  const [loading, setLoading] = useState(false);

  const startStripeCheckout = async () => {
    setLoading(true);
    try {
      onBeforeStripeRedirect?.();
      const body =
        stripeIntent.kind === "topup"
          ? {
              kind: "topup" as const,
              credits: stripeIntent.credits,
              ...(returnNext ? { returnNext } : {}),
            }
          : {
              kind: "class_plan" as const,
              classType: stripeIntent.classType,
              ...(returnNext ? { returnNext } : {}),
            };
      const res = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      const data = await readCheckoutSessionResponse(res);
      if (!res.ok) {
        throw new Error(data.error ?? "Could not start checkout");
      }
      if (!data.url) {
        throw new Error("Stripe did not return a checkout URL");
      }
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto rounded-2xl border-border p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {subtitle ?? "You will be redirected to Stripe Checkout (test mode) to pay securely."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">{creditsLine}</span>
              <span className="font-bold tabular-nums">S${amountSgd.toFixed(2)}</span>
            </div>
          </div>
          <Button
            type="button"
            className="w-full h-12 rounded-xl font-bold gradient-purple text-primary-foreground"
            disabled={loading}
            onClick={startStripeCheckout}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Opening Stripe…
              </>
            ) : (
              `Pay S$${amountSgd.toFixed(2)} with Stripe`
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Uses your configured Stripe <strong>test</strong> keys. No real charges in test mode. Example card:{" "}
            <span className="font-mono">4242 4242 4242 4242</span>, any future expiry, any CVC. PayNow appears if enabled
            for your Stripe account (Singapore).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
