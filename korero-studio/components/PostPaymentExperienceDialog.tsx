"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { submitPostPaymentFollowUp } from "@/app/actions/notifications";
import { toWhatsAppE164Digits } from "@/lib/phone-format";

const LEVELS = ["beginner", "intermediate", "advanced", "pro"] as const;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentEmail?: string;
  defaultPhone?: string;
  paymentRef?: string;
};

export function PostPaymentExperienceDialog({
  open,
  onOpenChange,
  studentId,
  studentEmail,
  defaultPhone = "",
  paymentRef,
}: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [level, setLevel] = useState<string>("intermediate");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && defaultPhone) setPhone(defaultPhone);
  }, [open, defaultPhone]);

  const handleSubmit = async () => {
    const digits = toWhatsAppE164Digits(phone.trim());
    if (digits.length < 10) {
      toast.error("Enter a valid WhatsApp number (e.g. 9123 4567 or +65 9123 4567)");
      return;
    }
    setBusy(true);
    try {
      const res = await submitPostPaymentFollowUp({
        studentId,
        studentEmail,
        studentPhoneE164: digits,
        experienceLevel: level,
        note: note.trim() || undefined,
        paymentRef,
      });
      if (res.ok) {
        toast.success(res.simulated ? "Saved (WhatsApp simulated — add API keys to send real messages)" : "Thanks! Check WhatsApp.");
        onOpenChange(false);
        setNote("");
      } else {
        toast.error("error" in res ? res.error : "Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Quick follow-up
          </DialogTitle>
          <DialogDescription>
            Help us place you in the right class — we&apos;ll send this to your WhatsApp (same number below).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="wa-phone">WhatsApp number</Label>
            <Input
              id="wa-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+65 9123 4567"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Dance / performance experience</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l} className="capitalize">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wa-note">Anything else? (optional)</Label>
            <Textarea
              id="wa-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. prefer evening slots, K-pop only…"
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button type="button" className="rounded-xl font-black gradient-purple" onClick={handleSubmit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit & send to WhatsApp"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
