'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import type { RoleName, Booking } from '@/types';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Music,
  Star,
  Timer,
  Sparkles,
  Shield,
  Mic2,
  Users,
  Zap,
  CircleCheck,
  BookOpen,
  MessageSquare,
  ArrowRight,
  CalendarDays,
  Lock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { readCheckoutSessionResponse, readVerifySessionResponse } from '@/lib/stripe-client';

const STEPS = ['Role', 'Pay', 'Done'];

const ROLE_ICONS: Record<string, typeof Mic2> = {
  'Main Vocal': Mic2,
  'Sub Vocal': Music,
  'Main Dancer': Zap,
  'Sub Dancer': Users,
  'Rapper': Star,
  'Center': Sparkles,
};

export default function BookingFlow({ groupId }: { groupId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { groups, roles, selectRole, createBooking, student, timeSlots, availability, isAdmin, refreshApp, bookings } =
    useApp();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<RoleName | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [holdTimer, setHoldTimer] = useState(1800);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAvailabilityPrompt, setShowAvailabilityPrompt] = useState(false);
  const [showPreferencePrompt, setShowPreferencePrompt] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const expectStripeAdvanceRef = useRef(false);

  const stripeRef = searchParams.get('stripe_ref');

  useEffect(() => {
    if (searchParams.get('stripe_canceled') === '1') {
      toast.message('Checkout was canceled.');
      const sp = new URLSearchParams(searchParams.toString());
      sp.delete('stripe_canceled');
      const q = sp.toString();
      router.replace(q ? `/booking/${groupId}?${q}` : `/booking/${groupId}`, { scroll: false });
    }
  }, [searchParams, groupId, router]);

  useEffect(() => {
    if (!stripeRef?.startsWith('cs_') || !student) return;
    let alive = true;
    void (async () => {
      const r = await fetch(`/api/stripe/verify-session?session_id=${encodeURIComponent(stripeRef)}`, {
        credentials: 'include',
      });
      const d = await readVerifySessionResponse(r);
      if (!alive) return;
      await refreshApp();
      if (d.fulfilled && d.fulfillmentKind === 'booking') {
        expectStripeAdvanceRef.current = true;
        toast.success("Payment received! You're booked.");
      } else if (d.paymentStatus === 'paid') {
        toast.message('Payment received; confirming booking… refresh if this takes long.');
      }
      router.replace(`/booking/${groupId}`, { scroll: false });
    })();
    return () => {
      alive = false;
    };
  }, [stripeRef, student, groupId, refreshApp, router]);

  useEffect(() => {
    if (!student || !expectStripeAdvanceRef.current) return;
    const b = bookings.find(
      (x) => x.groupId === groupId && x.studentId === student.id && x.paymentStatus === 'paid',
    );
    if (b) {
      setBooking(b);
      setSelectedRole(b.role);
      setStep(2);
      setShowConfetti(true);
      expectStripeAdvanceRef.current = false;
    }
  }, [bookings, groupId, student]);

  const group = groups.find(g => g.id === groupId);

  const hasFreeAvailability =
    availability.filter((s) => !s.isConfirmedClass).length > 0;

  useEffect(() => {
    if (!student) router.push('/register');
  }, [student, router]);

  /** Preference first, then at least one free schedule slot — only then role / pay steps (admin booking flow). */
  useEffect(() => {
    if (!student || !isAdmin) return;
    if (!student.classPreference) {
      setShowPreferencePrompt(true);
      setShowAvailabilityPrompt(false);
    } else if (!hasFreeAvailability) {
      setShowPreferencePrompt(false);
      setShowAvailabilityPrompt(true);
    } else {
      setShowPreferencePrompt(false);
      setShowAvailabilityPrompt(false);
    }
  }, [student, isAdmin, hasFreeAvailability]);

  useEffect(() => {
    if (step !== 0 || !selectedRole) return;
    const interval = setInterval(() => {
      setHoldTimer(prev => {
        if (prev <= 0) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, selectedRole]);

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 pb-24 text-center bg-background">
        <Shield className="w-12 h-12 text-primary mb-4" />
        <h1 className="text-xl font-black text-foreground mb-2">Admin only</h1>
        <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
          Studio sessions and rehearsal bookings are created by Korero admin only. Students coordinate availability in My
          Schedule; final slots are determined from member + instructor + studio availability.
        </p>
        <Button onClick={() => router.push('/browse')} className="rounded-2xl font-bold gradient-purple text-primary-foreground">
          Back to browse
        </Button>
      </div>
    );
  }

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSelectRole = (role: RoleName) => {
    setSelectedRole(role);
    selectRole(role);
    setHoldTimer(1800);
  };

  const handleStripePay = async () => {
    if (!selectedRole || !groupId) return;
    setCheckoutLoading(true);
    try {
      let b = booking;
      if (!b) {
        const defaultSlot = timeSlots[0];
        b = await createBooking(groupId, selectedRole, defaultSlot);
        setBooking(b);
      }
      const res = await fetch('/api/stripe/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'booking', bookingId: b.id, groupId }),
        credentials: 'include',
      });
      const data = await readCheckoutSessionResponse(res);
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed');
      if (!data.url) throw new Error('Stripe did not return a checkout URL');
      window.location.href = data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Checkout failed');
      setCheckoutLoading(false);
    }
  };

  if (!group) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Class not found</p>
    </div>
  );

  // Preference gate screen
  if (showPreferencePrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center content-narrow">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl gradient-purple flex items-center justify-center mx-auto mb-6 glow-purple">
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">Choose your class style first 💃</h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Tell us your preferred class type so we can match you with the right class!
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push(`/preferences?returnTo=/booking/${groupId}`)}
              className="w-full h-14 rounded-2xl font-black text-base gradient-purple text-primary-foreground btn-press relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">Choose My Style <ArrowRight className="w-4 h-4" /></span>
              <div className="absolute inset-0 shimmer" />
            </Button>
            <Button variant="ghost" onClick={() => router.back()} className="w-full font-bold text-muted-foreground">Go Back</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Availability gate screen
  if (showAvailabilityPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center content-narrow">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl gradient-purple flex items-center justify-center mx-auto mb-6 glow-purple">
            <CalendarDays className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">Pick your free time first 🔥</h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Share your availability for the next 30 days — we&apos;ll use it to lock in the best class times for you and your class!
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push(`/schedule?returnTo=/booking/${groupId}`)}
              className="w-full h-14 rounded-2xl font-black text-base gradient-purple text-primary-foreground btn-press relative overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">Set My Availability <ArrowRight className="w-4 h-4" /></span>
              <div className="absolute inset-0 shimmer" />
            </Button>
            <Button variant="ghost" onClick={() => router.back()} className="w-full font-bold text-muted-foreground">Go Back</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <div className="min-h-screen pb-8 md:pb-10">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 glass-strong border-b border-border/50 px-5 py-4 md:px-8 md:py-5">
        <div className="content-max">
          <div className="flex items-center gap-3 mb-4">
            {step < 2 && (
              <button
                onClick={() => {
                  if (step > 0) {
                    if (step === 1) setBooking(null);
                    setStep(step - 1);
                  } else router.back();
                }}
                className="text-muted-foreground btn-press p-1.5 -ml-1.5"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider truncate">
                {group.songTitle} — {group.artist}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-[10px] font-black text-accent-foreground">
              Step {step + 1}/{STEPS.length}
            </div>
          </div>

          <div className="flex gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${
                  i <= step ? 'gradient-purple' : 'bg-muted'
                }`} />
                <p className={`text-[9px] font-bold mt-1.5 text-center ${
                  i <= step ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {s}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 md:pt-8 content-max">
        <AnimatePresence mode="wait">
          {/* Step 0: Role */}
          {step === 0 && (
            <motion.div key="role" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-black mb-1.5 text-foreground flex items-center gap-2">
                Choose your role <Star className="w-5 h-5 text-primary" />
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">What's your vibe?</p>

              {selectedRole && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2.5 mb-6 p-4 rounded-2xl bg-accent border border-primary/20"
                >
                  <div className="w-7 h-7 rounded-full gradient-purple flex items-center justify-center pulse-ring">
                    <Timer className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-black text-primary">Role held for {formatTimer(holdTimer)}</span>
                </motion.div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {roles.map((role, i) => {
                  const RoleIcon = ROLE_ICONS[role.name] || Star;
                  const isSelected = selectedRole === role.name;
                  const isHeldByMe = role.heldBy === student?.id;
                  const isTaken = !role.available && !isHeldByMe;

                  return (
                    <motion.button
                      key={role.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => !isTaken && handleSelectRole(role.name)}
                      disabled={isTaken}
                      className={`p-5 rounded-2xl border-2 text-center transition-all btn-press min-h-[120px] flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-primary bg-accent glow-purple'
                          : isTaken
                          ? 'border-border bg-muted opacity-40'
                          : 'border-border bg-card hover:border-primary/30'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                        isSelected ? 'gradient-purple' : 'bg-muted'
                      }`}>
                        <RoleIcon className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                      </div>
                      <p className="font-black text-sm text-foreground">{role.name}</p>
                      <p className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {isSelected ? (
                          <><CircleCheck className="w-3 h-3" /> Selected</>
                        ) : isTaken ? (
                          <><Lock className="w-3 h-3" /> Taken</>
                        ) : (
                          <><CircleCheck className="w-3 h-3 text-primary" /> Available</>
                        )}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
              <div className="sticky bottom-0 pt-5 pb-4 bg-gradient-to-t from-background via-background to-transparent">
                <Button
                  onClick={() => setStep(1)}
                  disabled={!selectedRole}
                  className="w-full h-14 rounded-2xl font-black text-base gradient-purple text-primary-foreground btn-press disabled:opacity-40"
                >
                  <span className="flex items-center gap-2">Continue <ArrowRight className="w-4 h-4" /></span>
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Payment */}
          {step === 1 && (
            <motion.div key="pay" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-black mb-1.5 text-foreground flex items-center gap-2">
                Payment <CreditCard className="w-5 h-5 text-primary" />
              </h2>
              <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                Pay with Stripe Checkout (test mode). You will leave this page and return after payment.
              </p>

              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Song</span>
                    <span className="font-bold text-right">{group.songTitle}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-bold">{selectedRole ?? '—'}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between gap-3 items-center">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-xl font-black tabular-nums">S$45.00</span>
                  </div>
                </div>
                <Button
                  type="button"
                  className="w-full h-14 rounded-2xl font-black text-base gradient-purple text-primary-foreground"
                  disabled={checkoutLoading || !selectedRole}
                  onClick={handleStripePay}
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Opening Stripe…
                    </>
                  ) : (
                    'Pay S$45 with Stripe'
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Test card <span className="font-mono">4242 4242 4242 4242</span> — any future expiry, any CVC. PayNow if enabled on your Stripe account.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 2: Confirmation */}
          {step === 2 && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center pt-8">
              {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 1, x: '50vw', y: '40vh', scale: 0 }}
                      animate={{
                        opacity: 0,
                        x: `${(i * 37) % 100}vw`,
                        y: `${(i * 17) % 100}vh`,
                        scale: 1,
                        rotate: (i * 24) % 720,
                      }}
                      transition={{ duration: 1.5 + (i % 10) / 10, ease: "easeOut" }}
                      className="absolute w-2 h-2 rounded-full"
                      style={{ background: ['hsl(270 68% 32%)', 'hsl(280 100% 65%)', 'hsl(45 100% 60%)', 'hsl(270 40% 70%)'][i % 4] }}
                    />
                  ))}
                </div>
              )}

              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 rounded-3xl gradient-purple-deep flex items-center justify-center mx-auto mb-8 glow-purple-intense"
              >
                <Check className="w-12 h-12 text-primary-foreground" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <h2 className="text-3xl font-black mb-2 text-foreground flex items-center justify-center gap-2">
                  You're in! <Sparkles className="w-6 h-6 text-primary" />
                </h2>
                <p className="text-muted-foreground mb-2">Welcome to the crew</p>
                <p className="text-xs text-muted-foreground mb-10 flex items-center justify-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> You'll receive a WhatsApp confirmation shortly
                </p>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="card-premium p-6 text-left mb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 gradient-purple" />
                <p className="text-xs font-black uppercase tracking-wider text-primary mb-5">Your Booking</p>
                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Song</span>
                    <span className="font-bold text-foreground">{group.songTitle} — {group.artist}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Role</span>
                    <span className="font-bold text-foreground">{selectedRole}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment</span>
                    <Badge className="gradient-purple text-primary-foreground font-black flex items-center gap-1">
                      <CircleCheck className="w-3 h-3" /> Paid
                    </Badge>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-3">
                <Button onClick={() => router.push('/my-classes')} className="w-full h-14 rounded-2xl font-black gradient-purple text-primary-foreground btn-press relative overflow-hidden">
                  <span className="relative z-10 flex items-center gap-2">View My Classes <BookOpen className="w-4 h-4" /></span>
                  <div className="absolute inset-0 shimmer" />
                </Button>
                <Button variant="outline" onClick={() => router.push('/feedback')} className="w-full h-13 rounded-2xl font-bold border-2 btn-press">
                  <span className="flex items-center gap-2">Quick Feedback <MessageSquare className="w-4 h-4" /></span>
                </Button>
                <Button variant="ghost" onClick={() => router.push('/')} className="w-full font-bold text-muted-foreground">
                  Back to Home
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
