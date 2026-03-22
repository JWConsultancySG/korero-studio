import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { RoleName, Booking } from '@/types';
import { ArrowLeft, Check, Clock, CreditCard, Music, Star, Timer, Sparkles, Shield, Mic2, Users, Zap, CircleCheck, CircleX, BookOpen, MessageSquare, ArrowRight, CalendarDays, QrCode, Lock } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['Role', 'Pay', 'Done'];

const ROLE_ICONS: Record<string, typeof Mic2> = {
  'Main Vocal': Mic2,
  'Sub Vocal': Music,
  'Main Dancer': Zap,
  'Sub Dancer': Users,
  'Rapper': Star,
  'Center': Sparkles,
};

export default function BookingFlow() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { groups, roles, selectRole, createBooking, completePayment, student, timeSlots, availability } = useApp();
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState<RoleName | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paynow'>('stripe');
  const [processing, setProcessing] = useState(false);
  const [holdTimer, setHoldTimer] = useState(1800);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAvailabilityPrompt, setShowAvailabilityPrompt] = useState(false);

  // Mock card form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  const group = groups.find(g => g.id === groupId);

  useEffect(() => {
    if (!student) navigate('/register');
  }, [student, navigate]);

  // Check availability on mount
  useEffect(() => {
    if (student && availability.length === 0) {
      setShowAvailabilityPrompt(true);
    }
  }, [student, availability]);

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

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleSelectRole = (role: RoleName) => {
    setSelectedRole(role);
    selectRole(role);
    setHoldTimer(1800);
  };

  const handlePayment = async () => {
    if (!selectedRole || !groupId) return;
    setProcessing(true);
    const defaultSlot = timeSlots[0];
    const b = createBooking(groupId, selectedRole, defaultSlot);
    setBooking(b);
    await new Promise(r => setTimeout(r, 2500));
    completePayment(b.id);
    setBooking(prev => prev ? { ...prev, paymentStatus: 'paid' } : null);
    setProcessing(false);
    setShowConfetti(true);
    setStep(2);
    toast.success("You're in!");
  };

  if (!group) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Group not found</p>
    </div>
  );

  // Availability gate screen
  if (showAvailabilityPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-sm mx-auto"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 rounded-3xl gradient-purple flex items-center justify-center mx-auto mb-6 glow-purple"
          >
            <CalendarDays className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          <h2 className="text-2xl font-black text-foreground mb-2">Pick your free time first 🔥</h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Share your availability for the next 30 days — we’ll use it to lock in the best class times for you and your group!
          </p>

          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/schedule?returnTo=/booking/${groupId}`)}
              className="w-full h-14 rounded-2xl font-black text-base gradient-purple text-primary-foreground btn-press relative overflow-hidden"
            >
              <span className="relative z-10 flex items-center gap-2">
                Set My Availability <ArrowRight className="w-4 h-4" />
              </span>
              <div className="absolute inset-0 shimmer" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="w-full font-bold text-muted-foreground"
            >
              Go Back
            </Button>
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
    <div className="min-h-screen pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 glass-strong border-b border-border/50 px-5 py-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-4">
            {step < 2 && (
              <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="text-muted-foreground btn-press p-1.5 -ml-1.5">
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

      <div className="px-5 pt-6 max-w-md mx-auto">
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

              <div className="grid grid-cols-2 gap-3">
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
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed">Almost there — one more step!</p>

              {/* Order Summary */}
              <div className="card-premium p-6 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 gradient-purple" />
                <p className="text-xs font-black uppercase tracking-wider text-primary mb-5">Order Summary</p>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Music className="w-3.5 h-3.5" /> Song
                    </span>
                    <span className="font-bold text-foreground">{group.songTitle}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Star className="w-3.5 h-3.5" /> Role
                    </span>
                    <span className="font-bold text-foreground">{selectedRole}</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between items-center">
                    <span className="font-black text-foreground">Total</span>
                    <span className="text-2xl font-black text-primary">$45.00</span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="mb-6">
                <p className="text-sm font-black text-foreground mb-4">Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'stripe' as const, label: 'Card Payment', icon: CreditCard },
                    { id: 'paynow' as const, label: 'PayNow QR', icon: QrCode },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-5 rounded-2xl border-2 text-center transition-all btn-press min-h-[80px] ${
                        paymentMethod === method.id ? 'border-primary bg-accent glow-purple' : 'border-border bg-card'
                      }`}
                    >
                      <method.icon className={`w-5 h-5 mx-auto mb-2.5 ${paymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-xs font-bold text-foreground">{method.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stripe Mock Card Form */}
              {paymentMethod === 'stripe' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-premium p-5 mb-6 space-y-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent">
                      <Shield className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-wider">Powered by Stripe</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground">Card Number</label>
                    <Input
                      placeholder="4242 4242 4242 4242"
                      value={cardNumber}
                      onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                      className="h-12 rounded-xl text-sm border-2 border-border bg-card font-mono tracking-wider"
                      maxLength={19}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">Expiry</label>
                      <Input
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(formatExpiry(e.target.value))}
                        className="h-12 rounded-xl text-sm border-2 border-border bg-card font-mono"
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-muted-foreground">CVC</label>
                      <Input
                        placeholder="123"
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                        className="h-12 rounded-xl text-sm border-2 border-border bg-card font-mono"
                        maxLength={3}
                        type="password"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* PayNow QR Mock */}
              {paymentMethod === 'paynow' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card-premium p-6 mb-6 text-center"
                >
                  <p className="text-xs font-bold text-muted-foreground mb-4 uppercase tracking-wider">Scan to pay with PayNow</p>

                  {/* Mock QR Code */}
                  <div className="w-48 h-48 mx-auto mb-4 bg-card border-2 border-border rounded-2xl flex items-center justify-center relative overflow-hidden">
                    <div className="grid grid-cols-8 gap-[2px] w-36 h-36">
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-[1px] ${
                            Math.random() > 0.4 ? 'bg-foreground' : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-xl bg-card border-2 border-border flex items-center justify-center">
                        <span className="text-xs font-black text-primary">PN</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm font-bold text-foreground mb-1">PayNow to: Korero Studio</p>
                  <p className="text-xs text-muted-foreground">UEN: 202412345A</p>
                  <p className="text-lg font-black text-primary mt-2">$45.00</p>

                  <div className="mt-4 p-3 rounded-xl bg-accent">
                    <p className="text-[11px] text-muted-foreground">
                      After scanning, tap "Pay Now" below to confirm your booking
                    </p>
                  </div>
                </motion.div>
              )}

              <Button
                onClick={handlePayment}
                disabled={processing}
                className="w-full h-14 rounded-2xl text-lg font-black gradient-purple-deep text-primary-foreground glow-purple-intense btn-press relative overflow-hidden"
              >
                <span className="relative z-10">
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                      Processing...
                    </span>
                  ) : <span className="flex items-center gap-2">Pay $45.00 <ArrowRight className="w-4 h-4" /></span>}
                </span>
                {!processing && <div className="absolute inset-0 shimmer" />}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground mt-4 flex items-center justify-center gap-1.5">
                <Shield className="w-3 h-3" /> Secure payment · Instant confirmation
              </p>
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
                        x: `${Math.random() * 100}vw`,
                        y: `${Math.random() * 100}vh`,
                        scale: 1,
                        rotate: Math.random() * 720,
                      }}
                      transition={{ duration: 1.5 + Math.random(), ease: "easeOut" }}
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card-premium p-6 text-left mb-8 relative overflow-hidden"
              >
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

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-3"
              >
                <Button
                  onClick={() => navigate('/my-classes')}
                  className="w-full h-14 rounded-2xl font-black gradient-purple text-primary-foreground btn-press relative overflow-hidden"
                >
                  <span className="relative z-10 flex items-center gap-2">View My Classes <BookOpen className="w-4 h-4" /></span>
                  <div className="absolute inset-0 shimmer" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/feedback')}
                  className="w-full h-13 rounded-2xl font-bold border-2 btn-press"
                >
                  <span className="flex items-center gap-2">Quick Feedback <MessageSquare className="w-4 h-4" /></span>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="w-full font-bold text-muted-foreground"
                >
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
