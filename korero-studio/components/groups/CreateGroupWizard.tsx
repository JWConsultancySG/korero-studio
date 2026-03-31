"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/context/AppContext";
import type { ClassType } from "@/types";
import {
  CLASS_LABELS,
  CREDITS_BY_CLASS,
  SGD_PER_CREDIT,
  creditsForClass,
  sgdForCredits,
} from "@/lib/credits";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Search,
  Music,
  Sparkles,
  Loader2,
  Disc3,
  X,
  Wallet,
  Check,
  Video,
  VideoOff,
  Film,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { CreditsPaymentDialog } from "@/components/CreditsPaymentDialog";
import { readVerifySessionResponse } from "@/lib/stripe-client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  MobileStepRail,
  TabletHorizontalStepper,
  DesktopStepSidebar,
  WIZARD_STEPS,
} from "@/components/groups/CreateGroupWizardChrome";

interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  collectionName?: string;
}

const WIZARD_STRIPE_DRAFT_KEY = "korero_wizard_stripe_draft_v1";
const WIZARD_STRIPE_FINALIZE_KEY = "korero_pending_finalize_after_stripe_topup";

type WizardStripeDraftV1 = {
  v: 1;
  step: number;
  query: string;
  memberNames: string[];
  nameInput: string;
  classType: ClassType | null;
  selectedStudioId: string;
  mySlot: string;
  selectedSong: ITunesResult | null;
  skipSongValidation: boolean;
};

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 15;
const TOTAL_STEPS = 5;

const CLASS_ICONS: Record<ClassType, typeof Video> = {
  "no-filming": VideoOff,
  "half-song": Film,
  "full-song": Video,
};

function formatHoldCountdown(expiresAt: number, now: number) {
  const ms = Math.max(0, expiresAt - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CreateGroupWizard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** Admin flow from /browse/new?asAdmin=1 — no song-validation hold. */
  const skipSongValidation = searchParams.get("asAdmin") === "1";
  /** Student creating a new request: draft isn’t visible to others yet — no slot competition / 30‑min hold. */
  const skipSlotHoldUX = !skipSongValidation;
  const {
    student,
    createSongGroup,
    setClassPreference,
    claimSlotHold,
    clearDraftSlotHolds,
    getSlotHoldsForDraft,
    studios,
    chooseStudioForGroup,
    refreshApp,
  } = useApp();

  const draftIdRef = useRef<string | null>(null);
  if (draftIdRef.current === null) draftIdRef.current = crypto.randomUUID();
  const draftId = draftIdRef.current;

  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ITunesResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<ITunesResult | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [mySlot, setMySlot] = useState<string>("");

  const [classType, setClassType] = useState<ClassType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shortfallPayment, setShortfallPayment] = useState<null | { credits: number; sgd: number }>(null);
  const [selectedStudioId, setSelectedStudioId] = useState("");
  const [wizardBootstrapped, setWizardBootstrapped] = useState(false);
  const autoStripeFinalizeRef = useRef(false);

  const returnNextWizard = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${pathname}?${q}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!student) router.replace("/login");
  }, [student, router]);

  useEffect(() => {
    if (!student) {
      setWizardBootstrapped(true);
      return;
    }
    try {
      const raw = sessionStorage.getItem(WIZARD_STRIPE_DRAFT_KEY);
      if (raw) {
        const o = JSON.parse(raw) as Partial<WizardStripeDraftV1>;
        sessionStorage.removeItem(WIZARD_STRIPE_DRAFT_KEY);
        if (o.v === 1) {
          if (typeof o.step === "number") setStep(o.step);
          if (typeof o.query === "string") setQuery(o.query);
          if (Array.isArray(o.memberNames)) setMemberNames(o.memberNames);
          if (typeof o.nameInput === "string") setNameInput(o.nameInput);
          if (o.classType === null || o.classType === "no-filming" || o.classType === "half-song" || o.classType === "full-song") {
            setClassType(o.classType);
          }
          if (typeof o.selectedStudioId === "string") setSelectedStudioId(o.selectedStudioId);
          if (typeof o.mySlot === "string") setMySlot(o.mySlot);
          if (o.selectedSong && typeof o.selectedSong === "object") setSelectedSong(o.selectedSong as ITunesResult);
        }
      }
    } catch {
      /* ignore corrupt draft */
    }
    setWizardBootstrapped(true);
  }, [student]);

  useEffect(() => {
    if (searchParams.get("stripe_canceled") !== "1") return;
    toast.message("Checkout was canceled.");
    sessionStorage.removeItem(WIZARD_STRIPE_FINALIZE_KEY);
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("stripe_canceled");
    const q = sp.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (student?.classPreference) setClassType(student.classPreference);
  }, [student?.classPreference]);

  const memberKey = memberNames.join("\0");
  useEffect(() => {
    setMySlot("");
    clearDraftSlotHolds(draftId);
  }, [memberKey, draftId, clearDraftSlotHolds]);

  useEffect(() => {
    return () => {
      clearDraftSlotHolds(draftId);
    };
  }, [draftId, clearDraftSlotHolds]);

  const searchiTunes = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/itunes/search?q=${encodeURIComponent(term)}&limit=8`,
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => searchiTunes(query), 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchiTunes]);

  const addMemberName = () => {
    const t = nameInput.trim();
    if (!t || memberNames.length >= MAX_MEMBERS) return;
    if (memberNames.some((n) => n.toLowerCase() === t.toLowerCase())) {
      toast.error("That name is already in the list");
      return;
    }
    setMemberNames((prev) => [...prev, t]);
    setNameInput("");
  };

  const removeMemberName = (name: string) => {
    setMemberNames((prev) => prev.filter((n) => n !== name));
    if (mySlot === name) setMySlot("");
  };

  const slotLabels = memberNames;

  const canNextSong = Boolean(selectedSong);
  /** Group size = number of member names added (each name is one role/slot). */
  const canNextMembers =
    memberNames.length >= MIN_MEMBERS && memberNames.length <= MAX_MEMBERS;
  const canNextSlot = Boolean(mySlot && slotLabels.includes(mySlot));
  const canNextStudio = Boolean(selectedStudioId);
  const resolvedClass = classType ?? student?.classPreference ?? null;

  const cost = resolvedClass ? creditsForClass(resolvedClass) : 0;
  const balance = student?.credits ?? 0;
  const shortfall = Math.max(0, cost - balance);

  const saveWizardDraftForStripe = useCallback(() => {
    if (!selectedSong || !resolvedClass || !shortfallPayment) return;
    const payload: WizardStripeDraftV1 = {
      v: 1,
      step,
      query,
      memberNames,
      nameInput,
      classType,
      selectedStudioId,
      mySlot,
      selectedSong,
      skipSongValidation,
    };
    sessionStorage.setItem(WIZARD_STRIPE_DRAFT_KEY, JSON.stringify(payload));
    sessionStorage.setItem(WIZARD_STRIPE_FINALIZE_KEY, "1");
  }, [
    step,
    query,
    memberNames,
    nameInput,
    classType,
    selectedStudioId,
    mySlot,
    selectedSong,
    skipSongValidation,
    shortfallPayment,
    resolvedClass,
  ]);

  const handleBack = () => {
    if (step <= 1) {
      router.push("/browse");
      return;
    }
    setStep((s) => s - 1);
  };

  /** Industry pattern: jump back to earlier steps only (checkout-style). */
  const handleStepClick = (target: number) => {
    if (target >= step) return;
    setStep(target);
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep((s) => s + 1);
  };

  const finalizeGroupCreation = useCallback(async () => {
    if (!student || !selectedSong || !resolvedClass) return null;
    const imageUrl = selectedSong.artworkUrl100.replace("100x100", "200x200");
    if (classType && classType !== student.classPreference) {
      await setClassPreference(classType);
    }
    return createSongGroup({
      songTitle: selectedSong.trackName,
      artist: selectedSong.artistName,
      imageUrl,
      maxMembers: memberNames.length,
      slotLabels: [...memberNames],
      creatorSlotLabel: mySlot,
      classType: resolvedClass,
      draftId,
      itunesTrackId: selectedSong.trackId,
      skipSongValidation,
    });
  }, [
    student,
    selectedSong,
    resolvedClass,
    classType,
    memberNames,
    mySlot,
    draftId,
    createSongGroup,
    setClassPreference,
    skipSongValidation,
  ]);

  useEffect(() => {
    if (!student || !wizardBootstrapped || autoStripeFinalizeRef.current) return;
    const ref = searchParams.get("stripe_ref");
    if (!ref?.startsWith("cs_")) return;

    const cleanStripeRefFromUrl = () => {
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete("stripe_ref");
      const q = sp.toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    };

    if (sessionStorage.getItem(WIZARD_STRIPE_FINALIZE_KEY) !== "1") {
      cleanStripeRefFromUrl();
      return;
    }

    autoStripeFinalizeRef.current = true;

    void (async () => {
      try {
        for (let i = 0; i < 60; i++) {
          await refreshApp();
          const r = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(ref)}`, {
            credentials: "include",
          });
          const d = await readVerifySessionResponse(r);
          if (d.fulfilled && d.fulfillmentKind === "credits_topup") break;
          await new Promise((res) => setTimeout(res, 900));
        }
      } finally {
        sessionStorage.removeItem(WIZARD_STRIPE_FINALIZE_KEY);
        cleanStripeRefFromUrl();
      }

      setSubmitting(true);
      try {
        const result = await finalizeGroupCreation();
        if (!result || !result.ok) {
          if (result?.reason === "insufficient_credits") {
            toast.error("Not enough credits after payment — try confirming again from the last step");
          } else {
            toast.error("Could not create class listing after payment");
          }
          return;
        }
        if (result.awaitingSongValidation) {
          toast.success(
            `Top-up applied · Used ${result.creditsCharged} credits · Listing submitted — we’ll validate the song and notify you when it’s live.`,
          );
        } else {
          toast.success(`Top-up applied · Used ${result.creditsCharged} credits · Class listing created`);
        }
        if (selectedStudioId) {
          const selected = await chooseStudioForGroup(result.groupId, selectedStudioId);
          if (selected.ok && (selected.overlapHours ?? 0) < 2) {
            toast.warning("Your current class has less than 2 hours overlap with this studio.");
          }
        }
        router.push(`/browse/${result.groupId}`);
      } finally {
        setSubmitting(false);
      }
    })();
  }, [
    student,
    wizardBootstrapped,
    searchParams,
    pathname,
    router,
    refreshApp,
    finalizeGroupCreation,
    chooseStudioForGroup,
    selectedStudioId,
  ]);

  const handleConfirmPay = async () => {
    if (!student || !selectedSong || !resolvedClass) {
      toast.error("Pick a class format to see pricing");
      return;
    }
    if (!canNextSlot || !memberNames.length) return;
    if (shortfall > 0) {
      setShortfallPayment({ credits: shortfall, sgd: sgdForCredits(shortfall) });
      return;
    }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 600));
    try {
      const result = await finalizeGroupCreation();
      if (!result || !result.ok) {
        toast.error("Could not create class listing");
        return;
      }
      if (result.awaitingSongValidation) {
        toast.success(
          `Used ${result.creditsCharged} credits · Listing submitted — we’ll validate the song and notify you when it’s live.`,
        );
      } else {
        toast.success(`Used ${result.creditsCharged} credits · Class listing created`);
      }
      if (selectedStudioId) {
        const selected = await chooseStudioForGroup(result.groupId, selectedStudioId);
        if (selected.ok && (selected.overlapHours ?? 0) < 2) {
          toast.warning("Your current class has less than 2 hours overlap with this studio.");
        }
      }
      router.push(`/browse/${result.groupId}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const slotHolds = skipSlotHoldUX ? ({} as ReturnType<typeof getSlotHoldsForDraft>) : getSlotHoldsForDraft(draftId);
  /** Stable across SSR / hydration; updates every second for hold countdowns (admin / multi-tab path only). */
  const [nowMs, setNowMs] = useState(0);
  useEffect(() => {
    if (skipSlotHoldUX) {
      setNowMs(Date.now());
      return;
    }
    const tick = () => setNowMs(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [skipSlotHoldUX]);
  const clockReady = skipSlotHoldUX || nowMs > 0;

  if (!wizardBootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[env(safe-area-inset-bottom)] md:min-h-[100dvh]">
      <header className="sticky top-0 z-40 glass-strong border-b border-border/60 px-4 py-3 md:py-4">
        <div className="wizard-shell space-y-3 md:space-y-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-xl hover:bg-muted btn-press -ml-2 shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1 min-w-0 md:hidden">
              <MobileStepRail
                steps={WIZARD_STEPS}
                currentStep={step}
                totalSteps={TOTAL_STEPS}
              />
            </div>
            <div className="hidden md:flex lg:hidden flex-1 min-w-0 items-baseline justify-center gap-2 text-center px-2">
              <span className="text-sm font-black text-foreground truncate">
                {WIZARD_STEPS[step - 1]?.label}
              </span>
              <span className="text-[11px] font-bold text-muted-foreground tabular-nums shrink-0">
                {step}/{TOTAL_STEPS}
              </span>
            </div>
            <div className="hidden lg:flex flex-1 min-w-0 items-baseline gap-3">
              <h1 className="text-lg font-black tracking-tight text-foreground truncate">New song class</h1>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                Step {step} of {TOTAL_STEPS}
              </span>
            </div>
          </div>
          <TabletHorizontalStepper
            steps={WIZARD_STEPS}
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            onStepClick={handleStepClick}
          />
        </div>
      </header>

      <main className="flex-1 py-6 md:py-8 lg:py-10 wizard-shell w-full">
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-10 xl:gap-14">
          <DesktopStepSidebar
            steps={WIZARD_STEPS}
            currentStep={step}
            totalSteps={TOTAL_STEPS}
            onStepClick={handleStepClick}
          />
          <div className="flex-1 min-w-0 w-full">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-4 md:space-y-6"
            >
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-3xl font-black text-foreground leading-tight tracking-tight">
                  Pick your song
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2 max-w-2xl">
                  Search Apple Music, then select the exact track.
                </p>
              </div>

              {selectedSong ? (
                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl md:rounded-3xl bg-primary/5 border-2 border-primary/25">
                  <img
                    src={selectedSong.artworkUrl100.replace("100x100", "200x200")}
                    alt=""
                    className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-sm truncate">{selectedSong.trackName}</p>
                    <p className="text-xs text-muted-foreground truncate">{selectedSong.artistName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSong(null);
                      setQuery("");
                      setResults([]);
                    }}
                    className="p-2 rounded-full hover:bg-muted shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    {loading && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
                    )}
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search song or artist..."
                      className="pl-11 pr-10 h-12 md:h-14 md:text-base rounded-2xl border-2"
                    />
                  </div>
                  {results.length > 0 && (
                    <div className="rounded-2xl md:rounded-3xl border border-border bg-card divide-y divide-border max-h-[45vh] md:max-h-[min(50vh,28rem)] lg:max-h-[min(45vh,32rem)] overflow-y-auto shadow-sm">
                      {results.map((track) => (
                        <button
                          key={track.trackId}
                          type="button"
                          onClick={() => {
                            setSelectedSong(track);
                            setQuery("");
                            setResults([]);
                          }}
                          className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/60 transition-colors"
                        >
                          <img
                            src={track.artworkUrl100}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm truncate">{track.trackName}</p>
                            <p className="text-xs text-muted-foreground truncate">{track.artistName}</p>
                          </div>
                          <Disc3 className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2-members"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-4 md:space-y-6"
            >
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-3xl font-black text-foreground leading-tight">
                  Who&apos;s in this class?
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2 leading-relaxed max-w-3xl">
                  Add one name per member (e.g. Jennie, Lisa). That&apos;s your full line-up —{" "}
                  <span className="font-bold text-foreground">
                    {memberNames.length} member{memberNames.length !== 1 ? "s" : ""}
                  </span>{" "}
                  so far. Need at least {MIN_MEMBERS}, up to {MAX_MEMBERS}.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-2.5 min-h-[44px] md:min-h-[52px] p-3 md:p-4 rounded-2xl md:rounded-3xl border-2 border-dashed border-border bg-muted/20">
                {memberNames.map((name) => (
                  <Badge
                    key={name}
                    variant="secondary"
                    className="pl-3 pr-1 py-1.5 text-sm font-bold rounded-xl gap-1 bg-card border border-border"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeMemberName(name)}
                      className="ml-1 p-0.5 rounded-lg hover:bg-muted"
                      aria-label={`Remove ${name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Badge>
                ))}
                {memberNames.length < MAX_MEMBERS && (
                  <span className="text-xs text-muted-foreground self-center">
                    Type a name and tap Add
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-stretch">
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMemberName();
                    }
                  }}
                  placeholder="e.g. Jennie"
                  className="h-12 md:h-14 rounded-2xl flex-1 md:text-base"
                  maxLength={32}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-12 md:h-14 rounded-2xl font-bold shrink-0 px-5 sm:w-auto w-full sm:min-w-[100px]"
                  onClick={addMemberName}
                  disabled={memberNames.length >= MAX_MEMBERS}
                >
                  Add
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s3-slot"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-4 md:space-y-6"
            >
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-3xl font-black text-foreground leading-tight">Your slot</h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2 max-w-2xl">
                  {skipSlotHoldUX ? (
                    <>
                      Which member position are you taking for this song? This request is only visible to you until you
                      finish — tap the slot that&apos;s <span className="font-bold text-foreground">you</span>, then
                      continue to studio and payment.
                    </>
                  ) : (
                    <>
                      Which member position are you taking for this song? Positions update live. Choosing a slot starts a{" "}
                      <span className="font-bold text-foreground">30-minute hold</span> — finish payment on the next step to
                      secure it.
                    </>
                  )}
                </p>
              </div>

              {!skipSlotHoldUX && (
                <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-[11px] md:text-xs text-muted-foreground leading-relaxed flex gap-2.5 items-start">
                  <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    Holds are shared across tabs and refresh about every second. After you pay, your role is{" "}
                    <span className="font-bold text-foreground">locked in</span> for this class.
                  </span>
                </div>
              )}

              <div
                className={cn(
                  "grid gap-3 md:gap-4",
                  slotLabels.length >= 4 && "sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3",
                )}
                role="radiogroup"
                aria-label="Choose your member slot"
              >
                {slotLabels.map((label) => {
                  const hold = slotHolds[label];
                  const blockedByOther = skipSlotHoldUX
                    ? false
                    : Boolean(
                        clockReady &&
                          hold &&
                          hold.studentId !== student.id &&
                          hold.expiresAt > nowMs,
                      );
                  const heldByMe = skipSlotHoldUX
                    ? false
                    : Boolean(
                        clockReady &&
                          hold &&
                          hold.studentId === student.id &&
                          hold.expiresAt > nowMs,
                      );
                  const selected = skipSlotHoldUX ? mySlot === label : mySlot === label && heldByMe;
                  const countdown =
                    !skipSlotHoldUX && clockReady && hold && hold.expiresAt > nowMs
                      ? formatHoldCountdown(hold.expiresAt, nowMs)
                      : null;

                  return (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={blockedByOther}
                      onClick={() => {
                        if (blockedByOther) return;
                        if (skipSlotHoldUX) {
                          setMySlot(label);
                          return;
                        }
                        const ok = claimSlotHold(draftId, label);
                        if (!ok) {
                          toast.error("This position is temporarily held by someone else — try another or wait.");
                          return;
                        }
                        setMySlot(label);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border-2 p-4 md:p-5 text-left transition-colors w-full min-h-[72px] md:min-h-[80px]",
                        blockedByOther && "opacity-60 cursor-not-allowed border-border bg-muted/30",
                        !blockedByOther && selected && "border-primary bg-accent ring-2 ring-primary/20 btn-press",
                        !blockedByOther && !selected && "border-border bg-card hover:bg-muted/50 btn-press",
                      )}
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                          selected ? "border-primary bg-primary" : "border-muted-foreground/40",
                        )}
                      >
                        {selected && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
                        {blockedByOther && <Lock className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-foreground">{label}</p>
                        {skipSlotHoldUX ? (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {selected ? "Your position" : "Tap to choose"}
                          </p>
                        ) : (
                          <>
                            {blockedByOther && hold && (
                              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-bold mt-0.5">
                                Held by {hold.studentName} · {countdown} left
                              </p>
                            )}
                            {heldByMe && !blockedByOther && (
                              <p className="text-[11px] text-primary font-bold mt-0.5">
                                Your hold · {countdown} · complete payment to secure
                              </p>
                            )}
                            {!hold && (
                              <p className="text-[11px] text-muted-foreground">Available — tap to hold 30 min</p>
                            )}
                          </>
                        )}
                      </div>
                      <Music className="w-5 h-5 text-primary shrink-0 opacity-80" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="s4-studio"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-5"
            >
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-3xl font-black text-foreground leading-tight">Pick a studio</h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2 max-w-2xl">
                  Choose the studio for this class before payment.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {studios.map((studio) => (
                  <button
                    key={studio.id}
                    type="button"
                    onClick={() => setSelectedStudioId(studio.id)}
                    className={cn(
                      "rounded-2xl border-2 p-4 text-left btn-press",
                      selectedStudioId === studio.id ? "border-primary bg-accent" : "border-border bg-card",
                    )}
                  >
                    <p className="font-black text-foreground">{studio.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{studio.location}</p>
                    <p className="text-xs text-muted-foreground">{studio.address}</p>
                  </button>
                ))}
              </div>
              <div className="md:hidden">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="rounded-2xl w-full">
                      Open studio picker
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-3xl">
                    <SheetHeader>
                      <SheetTitle>Select studio</SheetTitle>
                    </SheetHeader>
                    <div className="space-y-2 mt-4">
                      {studios.map((studio) => (
                        <button
                          key={studio.id}
                          type="button"
                          onClick={() => setSelectedStudioId(studio.id)}
                          className={cn(
                            "w-full rounded-xl border p-3 text-left",
                            selectedStudioId === studio.id ? "border-primary bg-accent" : "border-border bg-card",
                          )}
                        >
                          <p className="font-bold">{studio.name}</p>
                          <p className="text-xs text-muted-foreground">{studio.location}</p>
                        </button>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="s5-credits"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-5 md:space-y-8 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] xl:gap-10 xl:items-start"
            >
              <div className="space-y-5 md:space-y-8 min-w-0">
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-3xl font-black text-foreground leading-tight">
                  Credits & payment
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1 md:mt-2 max-w-2xl">
                  Price depends on class format. 1 credit = S${SGD_PER_CREDIT}.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-1 xl:gap-4 2xl:grid-cols-3 2xl:gap-5 2xl:items-stretch">
                {(Object.keys(CREDITS_BY_CLASS) as ClassType[]).map((ct) => {
                  const Icon = CLASS_ICONS[ct];
                  const active = classType === ct;
                  return (
                    <button
                      key={ct}
                      type="button"
                      onClick={() => setClassType(ct)}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border-2 p-4 md:p-5 text-left transition-all btn-press min-h-[100px] sm:min-h-[120px] lg:flex-col lg:items-center lg:text-center lg:gap-3 lg:pt-6",
                        active ? "border-primary bg-accent shadow-sm" : "border-border bg-card",
                      )}
                    >
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                          active ? "gradient-purple" : "bg-muted",
                        )}
                      >
                        <Icon className={cn("w-5 h-5", active ? "text-primary-foreground" : "text-muted-foreground")} />
                      </div>
                      <div className="flex-1 min-w-0 lg:text-center">
                        <p className="font-black text-sm md:text-base">{CLASS_LABELS[ct]}</p>
                        <p className="text-[11px] md:text-xs text-muted-foreground mt-0.5">
                          {CREDITS_BY_CLASS[ct]} credits · S${sgdForCredits(CREDITS_BY_CLASS[ct])}
                        </p>
                      </div>
                      {active && <Check className="w-5 h-5 text-primary shrink-0 lg:mx-auto" />}
                    </button>
                  );
                })}
              </div>
              </div>

              <div className="space-y-4 xl:sticky xl:top-28 min-w-0">
              <div className="card-premium rounded-3xl p-5 md:p-6 space-y-4 md:max-w-xl md:mx-auto xl:max-w-none xl:mx-0">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Wallet className="w-4 h-4 text-primary" />
                  Your balance
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-black tabular-nums">{balance}</span>
                  <span className="text-xs text-muted-foreground font-medium">credits</span>
                </div>
                {resolvedClass && (
                  <>
                    <div className="h-px bg-border" />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">This class</span>
                        <span className="font-black">{cost} credits</span>
                      </div>
                      {shortfall > 0 && (
                        <div className="flex justify-between text-primary">
                          <span className="font-bold">Top-up needed</span>
                          <span className="font-black">
                            {shortfall} credits (S${sgdForCredits(shortfall)})
                          </span>
                        </div>
                      )}
                      {shortfall === 0 && (
                        <p className="text-xs text-muted-foreground">No top-up — balance covers this class.</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <div className="rounded-2xl bg-muted/50 p-4 md:p-5 text-xs md:text-sm text-muted-foreground leading-relaxed md:max-w-3xl md:mx-auto xl:max-w-none xl:mx-0">
                If you&apos;re short on credits, you&apos;ll complete a payment step first; your balance and transaction
                history update only after that succeeds, then the class listing is created.
              </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
          </div>
        </div>
      </main>

      {shortfallPayment && resolvedClass && (
        <CreditsPaymentDialog
          open
          onOpenChange={(o) => {
            if (!o) setShortfallPayment(null);
          }}
          title="Top up to create this class"
          subtitle={`You need ${shortfallPayment.credits} more credits for ${CLASS_LABELS[resolvedClass]} (${cost} total for this format).`}
          amountSgd={shortfallPayment.sgd}
          creditsLine={`${shortfallPayment.credits} credits top-up`}
          stripeIntent={{ kind: "topup", credits: shortfallPayment.credits }}
          returnNext={returnNextWizard}
          onBeforeStripeRedirect={saveWizardDraftForStripe}
        />
      )}

      <footer className="sticky bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:py-5 lg:static lg:border-t lg:bg-muted/30">
        <div className="wizard-shell flex justify-center">
          {step < TOTAL_STEPS ? (
            <Button
              type="button"
              className="w-full max-w-md md:max-w-lg lg:max-w-xl h-14 md:h-12 lg:h-14 rounded-2xl font-black text-base md:text-lg gradient-purple text-primary-foreground btn-press"
              disabled={
                (step === 1 && !canNextSong) ||
                (step === 2 && !canNextMembers) ||
                (step === 3 && !canNextSlot) ||
                (step === 4 && !canNextStudio)
              }
              onClick={handleNext}
            >
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full max-w-md md:max-w-lg lg:max-w-xl h-14 md:h-12 lg:h-14 rounded-2xl font-black text-base md:text-lg gradient-purple-deep text-primary-foreground btn-press glow-purple"
              disabled={!resolvedClass || submitting}
              onClick={handleConfirmPay}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : shortfall > 0 ? (
                `Pay S$${sgdForCredits(shortfall).toFixed(0)} & create`
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create class ({cost} credits)
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
