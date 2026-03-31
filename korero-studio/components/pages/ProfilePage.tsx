"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import {
  User,
  Wallet,
  Music,
  ArrowRight,
  LogOut,
  History,
  Sparkles,
  Users,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { CLASS_LABELS, CREDITS_BY_CLASS, SGD_PER_CREDIT, creditsForClass, sgdForCredits } from "@/lib/credits";
import type { ClassType } from "@/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CreditsPaymentDialog } from "@/components/CreditsPaymentDialog";
import { PostPaymentExperienceDialog } from "@/components/PostPaymentExperienceDialog";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    student,
    logoutStudent,
    creditTransactions,
    groups,
    bookings,
    refreshApp,
  } = useApp();
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [topUpCredits, setTopUpCredits] = useState("");
  const [paymentTarget, setPaymentTarget] = useState<
    null | { kind: "plan"; classType: ClassType } | { kind: "topup"; credits: number }
  >(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpPaymentRef, setFollowUpPaymentRef] = useState<string | undefined>();

  useEffect(() => {
    if (!student) return;
    const ref = searchParams.get("stripe_ref");
    const canceled = searchParams.get("stripe_canceled");
    if (ref?.startsWith("cs_")) {
      void refreshApp();
      setFollowUpPaymentRef(ref);
      setShowFollowUp(true);
      router.replace("/profile", { scroll: false });
      return;
    }
    if (canceled === "1") {
      toast.message("Checkout was canceled.");
      router.replace("/profile", { scroll: false });
    }
  }, [student, searchParams, router, refreshApp]);

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28 md:pb-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
          <User className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-black text-foreground mb-2">Your profile</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to see credits, classes, and activity.</p>
          <Button
            onClick={() => router.push("/login")}
            className="rounded-2xl font-bold gradient-purple text-primary-foreground btn-press h-12 px-8"
          >
            Sign in <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const balance = student.credits ?? 0;
  const createdGroups = groups.filter((g) => g.creatorId === student.id);
  const joinedGroups = groups.filter(
    (g) => g.members.includes(student.id) && g.creatorId !== student.id,
  );
  const txSorted = [...creditTransactions].sort((a, b) => b.at.localeCompare(a.at));

  const paymentDialogProps =
    paymentTarget?.kind === "plan"
      ? {
          title: `Buy ${CLASS_LABELS[paymentTarget.classType]} plan`,
          subtitle: "Complete checkout to add these credits to your balance.",
          amountSgd: sgdForCredits(creditsForClass(paymentTarget.classType)),
          creditsLine: `${creditsForClass(paymentTarget.classType)} credits · ${CLASS_LABELS[paymentTarget.classType]}`,
        }
      : paymentTarget?.kind === "topup"
        ? {
            title: "Top up credits",
            subtitle: "Complete checkout to add credits to your balance.",
            amountSgd: sgdForCredits(paymentTarget.credits),
            creditsLine: `${paymentTarget.credits} credits`,
          }
        : null;

  return (
    <div className="min-h-screen pb-28 md:pb-10">
      <div className="gradient-purple-subtle px-5 pt-6 pb-6 md:pt-10 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="content-max">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black mb-1 text-foreground tracking-tight flex items-center gap-2">
                Profile <User className="w-6 h-6 md:w-7 md:h-7 text-primary shrink-0" />
              </h1>
              <p className="text-sm text-muted-foreground">{student.email}</p>
            </div>
            <Button
              variant="outline"
              className="rounded-2xl font-bold shrink-0"
              onClick={() => {
                logoutStudent();
                router.push("/");
              }}
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </Button>
          </div>
        </motion.div>
      </div>

      <div className="px-5 pt-5 content-max space-y-8 md:space-y-10">
        <section className="card-premium p-5 md:p-6">
          <h2 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-4">Account</h2>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground font-bold">Name</p>
              <p className="font-black text-foreground">{student.name}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-bold">WhatsApp</p>
              <p className="font-bold text-foreground">{student.whatsapp || "—"}</p>
            </div>
            {student.classPreference && (
              <div className="sm:col-span-2">
                <p className="text-[11px] text-muted-foreground font-bold">Class preference</p>
                <Badge className="mt-1 gradient-purple text-primary-foreground">{CLASS_LABELS[student.classPreference]}</Badge>
              </div>
            )}
          </div>
        </section>

        <section className="card-premium p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black text-foreground">Credits balance</h2>
          </div>
          <p className="text-4xl font-black tabular-nums text-foreground">{balance}</p>
          <p className="text-xs text-muted-foreground mt-1">1 credit = S${SGD_PER_CREDIT} · used when you create or join song classes.</p>

          <Collapsible open={creditsOpen} onOpenChange={setCreditsOpen} className="mt-4 space-y-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3 text-left text-sm font-bold text-foreground btn-press hover:bg-muted/60">
              <span>View class plans & top up</span>
              <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform", creditsOpen && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-1">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Each format matches a song-class type. You pay first; credits and transaction history update only
                after checkout succeeds.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(CREDITS_BY_CLASS) as ClassType[]).map((ct) => {
                  const cr = CREDITS_BY_CLASS[ct];
                  const sgd = cr * SGD_PER_CREDIT;
                  return (
                    <div key={ct} className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-2">
                      <p className="text-xs font-black text-foreground leading-tight">{CLASS_LABELS[ct]}</p>
                      <p className="text-[11px] text-muted-foreground">{cr} credits · S${sgd}</p>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-xl font-bold gradient-purple text-primary-foreground mt-auto"
                        onClick={() => setPaymentTarget({ kind: "plan", classType: ct })}
                      >
                        Buy plan
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-2xl border border-dashed border-border p-4 space-y-2">
                <p className="text-xs font-black text-foreground">Custom top-up</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    inputMode="numeric"
                    placeholder="Credits"
                    value={topUpCredits}
                    onChange={(e) => setTopUpCredits(e.target.value.replace(/\D/g, ""))}
                    className="rounded-2xl border-2 h-11 max-w-[140px]"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-2xl font-bold"
                    onClick={() => {
                      const n = parseInt(topUpCredits, 10);
                      if (!n || n < 1) {
                        toast.error("Enter a positive number of credits");
                        return;
                      }
                      setPaymentTarget({ kind: "topup", credits: n });
                    }}
                  >
                    Add credits
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Charged at S${SGD_PER_CREDIT} per credit.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black text-foreground">Transaction history</h2>
          </div>
          {txSorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center rounded-2xl border border-dashed border-border">
              No transactions yet — top-ups and class charges appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {txSorted.map((tx) => (
                <li
                  key={tx.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      {tx.kind === "class_plan" && (
                        <Badge variant="secondary" className="text-[9px] font-black h-5">
                          Class plan
                        </Badge>
                      )}
                      {tx.kind === "group_create" && (
                        <Badge variant="outline" className="text-[9px] font-black h-5">
                          Class charge
                        </Badge>
                      )}
                      {tx.classType && (
                        <Badge className="text-[9px] font-black h-5 gradient-purple text-primary-foreground">
                          {CLASS_LABELS[tx.classType]}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-bold text-foreground leading-snug">{tx.label}</p>
                    {tx.paymentRef ? (
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{tx.paymentRef}</p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">
                      {format(new Date(tx.at), "MMM d, yyyy · HH:mm")}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-black tabular-nums shrink-0 ${
                      tx.creditsDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                    }`}
                  >
                    {tx.creditsDelta >= 0 ? "+" : ""}
                    {tx.creditsDelta} cr
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black text-foreground">Song classes you created</h2>
          </div>
          {createdGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">You haven&apos;t created a class listing yet.</p>
          ) : (
            <ul className="space-y-2">
              {createdGroups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/browse/${g.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 btn-press hover:bg-muted/50"
                  >
                    <span className="font-bold text-foreground truncate">{g.songTitle}</span>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {g.status}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" className="mt-4 rounded-2xl w-full sm:w-auto font-bold">
            <Link href="/browse/new">Create a song class</Link>
          </Button>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-black text-foreground">Classes you joined</h2>
          </div>
          {joinedGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No joined classes yet — browse open listings and tap to join.</p>
          ) : (
            <ul className="space-y-2">
              {joinedGroups.map((g) => (
                <li key={g.id}>
                  <Link
                    href={`/browse/${g.id}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 btn-press hover:bg-muted/50"
                  >
                    <span className="font-bold text-foreground truncate">{g.songTitle}</span>
                    <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Button asChild variant="outline" className="mt-4 rounded-2xl w-full sm:w-auto font-bold">
            <Link href="/browse">Browse classes</Link>
          </Button>
        </section>

        {bookings.length > 0 && (
          <section>
            <h2 className="text-lg font-black text-foreground mb-3">Class bookings</h2>
            <p className="text-sm text-muted-foreground mb-2">
              {bookings.filter((b) => b.paymentStatus === "paid").length} paid booking
              {bookings.filter((b) => b.paymentStatus === "paid").length !== 1 ? "s" : ""} — details also in{" "}
              <Link href="/my-classes" className="font-bold text-primary underline-offset-2 hover:underline">
                Classes
              </Link>
              .
            </p>
          </section>
        )}
      </div>

      {paymentDialogProps && paymentTarget && (
        <CreditsPaymentDialog
          open
          onOpenChange={(o) => {
            if (!o) setPaymentTarget(null);
          }}
          title={paymentDialogProps.title}
          subtitle={paymentDialogProps.subtitle}
          amountSgd={paymentDialogProps.amountSgd}
          creditsLine={paymentDialogProps.creditsLine}
          stripeIntent={
            paymentTarget.kind === "plan"
              ? { kind: "class_plan", classType: paymentTarget.classType }
              : { kind: "topup", credits: paymentTarget.credits }
          }
        />
      )}

      <PostPaymentExperienceDialog
        open={showFollowUp}
        onOpenChange={setShowFollowUp}
        studentId={student.id}
        studentEmail={student.email}
        defaultPhone={student.whatsapp}
        paymentRef={followUpPaymentRef}
      />
    </div>
  );
}
