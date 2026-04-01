"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/context/AppContext";
import DateTimeOverlapView from "@/components/groups/DateTimeOverlapView";
import LessonSlotPicker from "@/components/classes/LessonSlotPicker";
import StudentPaymentConfirmation from "@/components/classes/StudentPaymentConfirmation";
import { CLASS_LABELS, creditsForClass, sgdForCredits } from "@/lib/credits";
import { CreditsPaymentDialog } from "@/components/CreditsPaymentDialog";
import { ArrowLeft, Music, Users, Sparkles, CalendarDays, AlertCircle, MapPin, CheckCircle, XCircle, Lock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fetchArtwork = async (songTitle: string, artist: string): Promise<string | null> => {
  try {
    const q = `${songTitle} ${artist}`.trim();
    const res = await fetch(`/api/itunes/search?q=${encodeURIComponent(q)}&limit=1`);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Array<{ artworkUrl100?: string }> };
    const raw = data.results?.[0]?.artworkUrl100;
    if (typeof raw !== "string") return null;
    return raw.replace("100x100", "200x200");
  } catch {
    return null;
  }
};

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = typeof params.groupId === "string" ? params.groupId : "";
  const router = useRouter();
  const {
    groups, student, studios, isAdmin,
    recomputeGroupMatching, selectLessonSlots, confirmPayment, cancelClassById,
  } = useApp();
  const [lessonCheckoutOpen, setLessonCheckoutOpen] = useState(false);
  const [artwork, setArtwork] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const recomputedKeyRef = useRef<string | null>(null);

  const group = useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId]);

  useEffect(() => {
    if (!group?.imageUrl && group) {
      fetchArtwork(group.songTitle, group.artist).then(setArtwork);
    } else if (group?.imageUrl) {
      setArtwork(group.imageUrl);
    }
  }, [group]);

  useEffect(() => {
    if (!groupId) return;
    if (!groups.some((g) => g.id === groupId)) {
      router.replace("/browse");
    }
  }, [groupId, groups, router]);

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <p className="text-muted-foreground text-sm text-center">This class listing doesn&apos;t exist or was removed.</p>
      </div>
    );
  }

  const fill = group.maxMembers > 0 ? (group.interestCount / group.maxMembers) * 100 : 0;
  const enrollments = group.enrollments ?? [];
  const isCreator = student?.id === group.creatorId;
  const matchedSlots = group.finalizedSlotBlocks ?? [];
  const openSlots = Math.max(group.maxMembers - group.interestCount, 0);
  const hasSelectedStudio = Boolean(group.studioSelection?.studioId);
  const selectedStudio = studios.find((s) => s.id === group.studioSelection?.studioId);
  const studentCount = enrollments.length;
  const hasConfirmedInstructor = group.instructorAssignment?.status === "confirmed";
  const isClassFull = studentCount > 0 && studentCount >= group.maxMembers;
  const includesInstructor = hasConfirmedInstructor && isClassFull;
  const recomputeKey = `${group.id}|${group.studioSelection?.studioId ?? "none"}|${studentCount}|${group.maxMembers}|${
    group.instructorAssignment?.id ?? "none"
  }|${group.instructorAssignment?.status ?? "none"}`;

  useEffect(() => {
    if (!hasSelectedStudio) return;
    if (recomputedKeyRef.current === recomputeKey) return;
    recomputedKeyRef.current = recomputeKey;
    void recomputeGroupMatching(group.id);
  }, [group.id, hasSelectedStudio, recomputeGroupMatching, recomputeKey]);

  const matchingState = group.matchingState;
  const isCurrentInstructor =
    student?.id === group.instructorAssignment?.instructorId &&
    group.instructorAssignment?.status === "confirmed";
  const isEnrolledStudent = enrollments.some((e) => e.studentId === student?.id);
  const showSlotPicker = matchingState === "golden" && (isCurrentInstructor || isAdmin);
  const showPaymentPanel =
    matchingState === "instructor_confirmed" || matchingState === "fixed";
  const isCancelled = Boolean(group.cancelledAt);

  const handleSelectSlots = async (slots: import("@/types").MatchedHourSlot[]) => {
    const res = await selectLessonSlots(group.id, slots);
    if (!res.ok) {
      toast.error(`Failed to confirm: ${res.reason ?? "unknown error"}`);
      return;
    }
    if (res.notifyFailed) {
      toast.warning("Schedule saved, but in-app notifications could not be sent. Ask students to open the class page.");
      return;
    }
    const n = res.studentsNotified;
    toast.success(
      n === 0
        ? "Lesson schedule confirmed."
        : `Lesson schedule confirmed. ${n} student${n === 1 ? "" : "s"} notified to confirm payment.`,
    );
  };

  const handleConfirmPayment = async (): Promise<{ ok: boolean; stripeCheckout?: boolean }> => {
    const res = await confirmPayment(group.id);
    if (res.ok) {
      return { ok: true };
    }
    if (res.reason === "needs_payment") {
      if (!group.classTypeAtCreation) {
        toast.error("This class is missing format data — contact support.");
        return { ok: false };
      }
      setLessonCheckoutOpen(true);
      return { ok: false, stripeCheckout: true };
    }
    toast.error(
      res.reason === "not_enrolled"
        ? "You are not listed for payment on this class."
        : res.reason === "not_instructor_confirmed"
          ? "This class is not ready for payment yet."
          : "Could not confirm payment.",
    );
    return { ok: false };
  };

  const handleCancelClass = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation.");
      return;
    }
    const res = await cancelClassById(group.id, cancelReason.trim());
    if (res.ok) {
      toast.success("Class cancelled. Slots released and credits refunded.");
      setShowCancelDialog(false);
      setCancelReason("");
    } else {
      toast.error("Failed to cancel class.");
    }
  };

  return (
    <div className="min-h-screen pb-28 md:pb-10 bg-background">
      <div className="gradient-purple-subtle px-5 pt-4 pb-7 md:pt-8 md:pb-9">
        <div className="content-max space-y-5">
          <button
            type="button"
            onClick={() => router.push("/browse")}
            className="flex items-center gap-2 text-muted-foreground text-sm md:text-base font-bold btn-press min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to browse
          </button>

          <div className="grid gap-4 md:gap-5 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_22rem]">
            <div className="rounded-3xl border border-border/80 bg-card/70 p-4 md:p-5 lg:p-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-start">
                <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-2xl overflow-hidden bg-muted shrink-0 shadow-md ring-2 ring-primary/10">
                  {artwork ? (
                    <img src={artwork} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center gradient-purple">
                      <Music className="w-8 h-8 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="secondary" className="font-black text-[10px] uppercase tracking-wide">
                      {group.status === "forming" ? "Forming" : group.status}
                    </Badge>
                    {group.classTypeAtCreation && (
                      <Badge className="gradient-purple text-primary-foreground font-bold text-[10px]">
                        {CLASS_LABELS[group.classTypeAtCreation]}
                      </Badge>
                    )}
                    {isCreator && (
                      <Badge variant="outline" className="text-[10px] font-black border-primary/30">
                        You started this
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight">{group.songTitle}</h1>
                  <p className="text-muted-foreground font-bold mt-1">{group.artist}</p>
                  <p className="text-xs md:text-sm text-muted-foreground mt-3 leading-relaxed max-w-2xl">
                    Coordinate with your group using shared availability and studio availability.
                    {includesInstructor ? " Instructor availability is now included too because the class is full." : ""}
                  </p>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-border/80 bg-card/70 p-4 md:p-5 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Formation
                  </span>
                  <span className="text-foreground tabular-nums">
                    {group.interestCount}/{group.maxMembers}
                  </span>
                </div>
                <Progress value={fill} className="h-2.5 bg-muted" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-background/70 px-3 py-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Open spots</p>
                  <p className="text-lg font-black text-foreground tabular-nums">{openSlots}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/70 px-3 py-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Progress</p>
                  <p className="text-lg font-black text-foreground tabular-nums">{Math.round(fill)}%</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Studio room and final class time are confirmed by Korero after matching.
              </p>
            </aside>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 md:pt-8 content-max space-y-6 md:space-y-7">
        {group.awaitingAdminReview && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex gap-3 items-start">
            <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-foreground">Waiting for admin review</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Korero is reviewing this class request and finalizing the class profile (formation and roles). You&apos;ll
                be notified when this listing goes live for others to join.
              </p>
            </div>
          </div>
        )}

        {isCancelled && (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex gap-3 items-start">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-foreground">Class Cancelled</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {group.cancellationReason ?? "This class has been cancelled."} All locked
                slots have been released and credits refunded.
              </p>
            </div>
          </div>
        )}

        {matchingState === "fixed" && !isCancelled && (
          <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 flex gap-3 items-start">
            <Lock className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-foreground">Lessons Locked</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                All payments are collected and lessons are confirmed. The time slots are locked in
                everyone&apos;s schedule and cannot be manually modified.
              </p>
            </div>
          </div>
        )}

        {matchingState === "golden" && !showSlotPicker && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3 items-start">
            <CheckCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-foreground">Golden Match Found</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Enough common availability has been found. Waiting for the instructor to select the
                final lesson slots.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] xl:grid-cols-[1fr_22rem] lg:items-start">
          <div className="space-y-6 min-w-0">
            {showSlotPicker && (
              <section className="rounded-3xl border border-primary/30 bg-primary/5 p-4 md:p-5 lg:p-6">
                <LessonSlotPicker
                  availableSlots={matchedSlots}
                  requiredCount={group.requiredMatchHours ?? 0}
                  onConfirm={handleSelectSlots}
                />
              </section>
            )}

            {showPaymentPanel && (
              <section className="rounded-3xl border border-border/80 bg-card/50 p-4 md:p-5 lg:p-6">
                <StudentPaymentConfirmation
                  group={group}
                  currentUserId={student?.id ?? ""}
                  creditBalance={student?.credits ?? 0}
                  isInstructor={isCurrentInstructor}
                  enrollments={enrollments}
                  onConfirmPayment={handleConfirmPayment}
                />
              </section>
            )}

            {(matchingState === "forming" || matchingState === "matching" || matchingState === "golden") && (
              <section className="rounded-3xl border border-border/80 bg-card/50 p-4 md:p-5 lg:p-6">
                <h2 className="text-lg md:text-xl font-black text-foreground mb-1.5 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
                  Common slots
                </h2>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed max-w-3xl">
                  The calendar below shows 1-hour windows over the next 30 days where studio and
                  all {studentCount} enrolled student{studentCount === 1 ? "" : "s"} align.
                  {includesInstructor ? " Instructor alignment is included because this class is full." : ""}
                </p>
                <DateTimeOverlapView enrollments={enrollments} matchedSlots={matchedSlots} />
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <section className="rounded-3xl border border-border/80 bg-card/50 p-4 md:p-5">
              <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Studio room
              </h3>
              {selectedStudio ? (
                <div className="space-y-1.5">
                  <p className="text-sm font-black text-foreground">{selectedStudio.name}</p>
                  {selectedStudio.location && (
                    <p className="text-xs text-muted-foreground">{selectedStudio.location}</p>
                  )}
                  {selectedStudio.address && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{selectedStudio.address}</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Studio room is not selected yet. Korero admin will confirm this soon.
                </p>
              )}
            </section>

            {matchingState && (
              <section className="rounded-3xl border border-border/80 bg-card/50 p-4 md:p-5">
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  Matching status
                </h3>
                <Badge
                  variant={matchingState === "fixed" ? "default" : "secondary"}
                  className={cn(
                    "font-bold text-xs",
                    matchingState === "golden" && "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30",
                    matchingState === "instructor_confirmed" && "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30",
                    matchingState === "fixed" && "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
                  )}
                >
                  {matchingState === "forming" && "Forming"}
                  {matchingState === "matching" && "Finding common slots"}
                  {matchingState === "golden" && "Golden — ready for instructor"}
                  {matchingState === "instructor_confirmed" && "Awaiting student payments"}
                  {matchingState === "fixed" && (isCancelled ? "Cancelled" : "Locked & scheduled")}
                </Badge>
              </section>
            )}

            {group.slotLabels && group.slotLabels.length > 0 && (
              <section className="rounded-3xl border border-border/80 bg-card/50 p-4 md:p-5">
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Member slots
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.slotLabels.map((slot) => {
                    const taken = enrollments.some((e) => e.slotLabel === slot);
                    const isMe = enrollments.some((e) => e.slotLabel === slot && e.studentId === student?.id);
                    return (
                      <Badge
                        key={slot}
                        variant={taken ? "default" : "secondary"}
                        className={cn(
                          "rounded-xl px-3 py-1.5 text-xs font-bold",
                          isMe && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                        )}
                      >
                        {slot}
                        {isMe && " (you)"}
                        {!taken && " · open"}
                      </Badge>
                    );
                  })}
                </div>
              </section>
            )}

            {isAdmin && matchingState === "fixed" && !isCancelled && (
              <section className="rounded-3xl border border-red-500/30 bg-card/50 p-4 md:p-5">
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5" />
                  Admin: Cancel Class
                </h3>
                {showCancelDialog ? (
                  <div className="space-y-3">
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Reason for cancellation…"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground resize-none h-20"
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleCancelClass}
                        className="rounded-xl font-bold text-xs flex-1"
                      >
                        Confirm Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowCancelDialog(false); setCancelReason(""); }}
                        className="rounded-xl font-bold text-xs"
                      >
                        Back
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCancelDialog(true)}
                    className="w-full rounded-xl font-bold text-xs border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  >
                    Cancel this class
                  </Button>
                )}
              </section>
            )}

            <section className="rounded-3xl border border-border/80 bg-muted/30 p-4 md:p-5">
              <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
                <span className="font-black text-foreground">Heads up:</span>{" "}
                {matchingState === "fixed" && !isCancelled
                  ? "Lesson slots are locked. They cannot be manually modified. Contact admin if changes are needed."
                  : (
                    <>
                      This section is for scheduling alignment only. Keep{" "}
                      <Link href="/schedule" className="font-bold text-primary underline-offset-2 hover:underline">
                        My Schedule
                      </Link>{" "}
                      updated so your group sees accurate common slots.
                    </>
                  )}
              </p>
            </section>
          </aside>
        </div>
      </div>

      {lessonCheckoutOpen && group.classTypeAtCreation ? (
        <CreditsPaymentDialog
          open
          onOpenChange={(o) => {
            if (!o) setLessonCheckoutOpen(false);
          }}
          title="Pay for lesson confirmation"
          subtitle="Same price as the equivalent credits. After Stripe, your spot is confirmed on this class."
          amountSgd={sgdForCredits(creditsForClass(group.classTypeAtCreation))}
          creditsLine={`${creditsForClass(group.classTypeAtCreation)} credits · ${CLASS_LABELS[group.classTypeAtCreation]}`}
          stripeIntent={{ kind: "lesson_confirm", classId: group.id }}
          returnNext={`/browse/${group.id}`}
        />
      ) : null}
    </div>
  );
}
