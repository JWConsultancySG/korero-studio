"use client";

import { useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendManualWhatsAppMessage } from "@/app/actions/notifications";
import { toWhatsAppE164Digits } from "@/lib/phone-format";
import { AdminTutorialCallout } from "@/components/admin/AdminTutorialCallout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminWhatsAppPanel() {
  const [to, setTo] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const digits = toWhatsAppE164Digits(to.trim());
    if (digits.length < 10) {
      toast.error("Enter a valid number (e.g. 9123 4567 or +65 …)");
      return;
    }
    if (!body.trim()) {
      toast.error("Enter a message");
      return;
    }
    setBusy(true);
    try {
      const res = await sendManualWhatsAppMessage({ toE164: digits, body: body.trim() });
      if (res.ok) {
        toast.success(res.simulated ? "Simulated send (configure WHATSAPP_* env for live API)" : "Message sent");
        setBody("");
      } else {
        toast.error("error" in res ? res.error : "Failed to send");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <AdminTutorialCallout title="WhatsApp Business (Cloud API)" defaultOpen={false}>
        <p>
          Set <strong>WHATSAPP_PHONE_NUMBER_ID</strong>, <strong>WHATSAPP_ACCESS_TOKEN</strong> (Meta Business), and{" "}
          <strong>WHATSAPP_NOTIFY_ADMIN_E164</strong> for auto “class full” alerts. Without them, sends are{" "}
          <strong>simulated</strong> in the server log only.
        </p>
        <p>
          Recipients must have opted in per WhatsApp policy. Use this manual send for class reminders or coordination.
        </p>
      </AdminTutorialCallout>
      <div className="rounded-2xl border border-border bg-card/50 p-4 space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <MessageCircle className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">Manual WhatsApp</span>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa-to">To (WhatsApp)</Label>
          <Input
            id="wa-to"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="+65 9123 4567"
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wa-body">Message</Label>
          <Textarea
            id="wa-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Hi! Your class is confirmed for Saturday 2pm at Orchard…"
            className="rounded-xl"
          />
        </div>
        <Button
          type="button"
          className="w-full rounded-xl font-black gradient-purple"
          onClick={send}
          disabled={busy}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Send via WhatsApp
        </Button>
      </div>
    </div>
  );
}
