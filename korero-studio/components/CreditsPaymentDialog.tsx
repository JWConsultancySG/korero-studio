"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export type DemoPaymentMethod = "paynow" | "card";

export type CreditsPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  amountSgd: number;
  creditsLine: string;
  /** Called after the simulated gateway succeeds — add credits / plans here only. */
  onPaymentConfirmed: (meta: { paymentMethod: DemoPaymentMethod; paymentRef: string }) => void | Promise<void>;
};

export function CreditsPaymentDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  amountSgd,
  creditsLine,
  onPaymentConfirmed,
}: CreditsPaymentDialogProps) {
  const [method, setMethod] = useState<DemoPaymentMethod>("paynow");
  const [cardName, setCardName] = useState("");
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (method === "card" && cardName.trim().length < 2) {
      toast.error("Enter the name on card");
      return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1400));
    const paymentRef = `PAY-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    try {
      await onPaymentConfirmed({ paymentMethod: method, paymentRef });
      onOpenChange(false);
      setCardName("");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">{title}</DialogTitle>
          {subtitle ? <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p> : null}
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 space-y-1">
            <p className="text-sm font-bold text-foreground">{creditsLine}</p>
            <p className="text-2xl font-black tabular-nums text-foreground">S${amountSgd.toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Pay with</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={method === "paynow" ? "default" : "outline"}
                className="rounded-xl font-bold"
                onClick={() => setMethod("paynow")}
              >
                PayNow
              </Button>
              <Button
                type="button"
                variant={method === "card" ? "default" : "outline"}
                className="rounded-xl font-bold"
                onClick={() => setMethod("card")}
              >
                Card
              </Button>
            </div>
          </div>
          {method === "card" && (
            <div className="space-y-2">
              <Label htmlFor="card-name" className="text-xs font-bold">
                Name on card
              </Label>
              <Input
                id="card-name"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="As shown on card"
                className="rounded-xl h-11"
                autoComplete="cc-name"
              />
            </div>
          )}
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Demo checkout: no real charge. Credits apply only after you confirm payment.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl font-bold"
            disabled={processing}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-xl font-black gradient-purple text-primary-foreground"
            disabled={processing}
            onClick={handlePay}
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing…
              </>
            ) : (
              `Pay S$${amountSgd.toFixed(2)}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
