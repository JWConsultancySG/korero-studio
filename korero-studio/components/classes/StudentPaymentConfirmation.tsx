"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ClassType, MatchedHourSlot, SongGroup, GroupMemberEnrollment } from "@/types";
import { CheckCircle, Circle, Clock, CreditCard, Users } from "lucide-react";
import { toast } from "sonner";
import { CLASS_LABELS, creditsForClass, sgdForCredits } from "@/lib/credits";

function formatHour12(h: number): string {
  if (h === 0 || h === 24) return "12am";
  if (h === 12) return "12pm";
  if (h > 12) return `${h - 12}pm`;
  return `${h}am`;
}

type Props = {
  group: SongGroup;
  currentUserId: string;
  /** Current user's credit balance (for pay-with-credits vs Stripe). */
  creditBalance: number;
  isInstructor: boolean;
  enrollments: GroupMemberEnrollment[];
  /** Resolves when the server action finishes; `stripeCheckout` means a dialog/redirect will follow. */
  onConfirmPayment: () => Promise<{ ok: boolean; stripeCheckout?: boolean }>;
};

export default function StudentPaymentConfirmation({
  group,
  currentUserId,
  creditBalance,
  isInstructor,
  enrollments,
  onConfirmPayment,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const selectedSlots = group.selectedLessonSlots ?? [];
  const payments = group.studentPayments ?? {};
  const totalStudents = Object.keys(payments).length;
  const paidStudents = Object.values(payments).filter((v) => v === "paid").length;
  const allPaid = totalStudents > 0 && paidStudents === totalStudents;
  const myPaymentStatus = payments[currentUserId];
  const hasPaid = myPaymentStatus === "paid";
  const classType: ClassType | undefined = group.classTypeAtCreation;
  const lessonCostCredits = classType != null ? creditsForClass(classType) : null;
  const canPayWithCredits =
    lessonCostCredits != null && creditBalance >= lessonCostCredits && !hasPaid && !allPaid;

  const sortedSlots = [...selectedSlots].sort((a, b) =>
    a.date === b.date ? a.hour - b.hour : a.date.localeCompare(b.date),
  );

  const handlePay = async () => {
    setSubmitting(true);
    try {
      const r = await onConfirmPayment();
      if (r.ok) toast.success("Lesson payment confirmed.");
      else if (r.stripeCheckout) toast.message("Continue to Stripe to complete payment.");
    } catch {
      toast.error("Payment failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="text-base font-black text-foreground">
          {allPaid ? "All Payments Collected" : "Lesson Confirmation"}
        </h3>
      </div>

      {allPaid ? (
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-sm font-black text-foreground">Class is locked and scheduled</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All students have confirmed. The lesson slots are now locked in everyone&apos;s schedule.
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isInstructor
            ? "Waiting for students to confirm and pay. Track their progress below."
            : "Review the confirmed lesson schedule and confirm your payment to lock in your spot."}
        </p>
      )}

      {!isInstructor && lessonCostCredits != null && !hasPaid && !allPaid && (
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs space-y-1">
          <p className="font-black text-foreground">
            {lessonCostCredits} credits ({classType ? CLASS_LABELS[classType] : ""}) · S$
            {sgdForCredits(lessonCostCredits).toFixed(2)} equivalent
          </p>
          <p className="text-muted-foreground">
            {canPayWithCredits
              ? `You have ${creditBalance} credits — we will deduct ${lessonCostCredits} when you confirm.`
              : `You have ${creditBalance} credits — not enough to cover this step. You will pay with Stripe (same price as buying credits).`}
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card/50 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            Lesson Schedule ({sortedSlots.length} session{sortedSlots.length === 1 ? "" : "s"})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sortedSlots.map((slot) => (
            <Badge
              key={`${slot.date}|${slot.hour}`}
              className="rounded-xl gradient-purple text-primary-foreground font-bold px-3 py-1.5"
            >
              {format(parseISO(slot.date), "MMM d")} · {formatHour12(slot.hour)}–{formatHour12(slot.hour + 1)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/50 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-primary" />
            Student Payments
          </p>
          <Badge variant={allPaid ? "default" : "secondary"} className="font-bold tabular-nums">
            {paidStudents}/{totalStudents} confirmed
          </Badge>
        </div>
        <Progress value={totalStudents > 0 ? (paidStudents / totalStudents) * 100 : 0} className="h-2.5 bg-muted" />

        <div className="space-y-1.5">
          {Object.entries(payments).map(([studentId, status]) => {
            const enrollment = enrollments.find((e) => e.studentId === studentId);
            const name = enrollment?.studentName ?? studentId.slice(0, 8);
            const isMe = studentId === currentUserId;
            return (
              <div key={studentId} className="flex items-center justify-between py-1">
                <p className="text-xs font-bold text-foreground">
                  {name}
                  {isMe && <span className="text-primary ml-1">(you)</span>}
                </p>
                {status === "paid" ? (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">Paid</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Circle className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-bold">Pending</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {!isInstructor && !hasPaid && !allPaid && (
        lessonCostCredits == null ? (
          <p className="text-xs text-destructive font-medium">
            This class is missing pricing information. Please contact support.
          </p>
        ) : (
          <Button
            type="button"
            onClick={handlePay}
            disabled={submitting}
            className="w-full rounded-2xl gradient-purple text-primary-foreground font-black btn-press h-12"
          >
            {submitting
              ? "Processing…"
              : canPayWithCredits
                ? `Confirm & pay (${lessonCostCredits} credits)`
                : "Pay with Stripe"}
          </Button>
        )
      )}
    </div>
  );
}
