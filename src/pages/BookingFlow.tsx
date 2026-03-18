import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { TimeSlot, RoleName, Booking } from '@/types';
import { ArrowLeft, Check, Clock, CreditCard, Music, Star, Timer, Sparkles, Shield, Mic2, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['Time', 'Role', 'Pay', 'Done'];

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
  const { groups, timeSlots, roles, selectRole, createBooking, completePayment, student } = useApp();
  const [step, setStep] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleName | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paynow'>('stripe');
  const [processing, setProcessing] = useState(false);
  const [holdTimer, setHoldTimer] = useState(1800);
  const [showConfetti, setShowConfetti] = useState(false);

  const group = groups.find(g => g.id === groupId);

  useEffect(() => {
    if (!student) navigate('/register');
  }, [student, navigate]);

  useEffect(() => {
    if (step !== 1 || !selectedRole) return;
    const interval = setInterval(() => {
      setHoldTimer(prev => {
        if (prev <= 0) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, selectedRole]);

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSelectSlot = (slot: TimeSlot) => setSelectedSlot(slot);

  const handleSelectRole = (role: RoleName) => {
    setSelectedRole(role);
    selectRole(role);
    setHoldTimer(1800);
  };

  const handlePayment = async () => {
    if (!selectedSlot || !selectedRole || !groupId) return;
    setProcessing(true);
    const b = createBooking(groupId, selectedRole, selectedSlot);
    setBooking(b);
    await new Promise(r => setTimeout(r, 2000));
    completePayment(b.id);
    setBooking(prev => prev ? { ...prev, paymentStatus: 'paid' } : null);
    setProcessing(false);
    setShowConfetti(true);
    setStep(3);
    toast.success("You're in! 🎉");
  };

  const progressValue = ((step + 1) / STEPS.length) * 100;

  if (!group) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Group not found</p>
    </div>
  );

  const slideVariants = {
    enter: { opacity: 0, x: 30 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 glass-strong border-b border-border/50 px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            {step < 3 && (
              <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="text-muted-foreground btn-press p-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider truncate">
                {group.songTitle} — {group.artist}
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-[10px] font-black text-accent-foreground">
              Step {step + 1}/{STEPS.length}
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1 rounded-full transition-all duration-500 ${
                  i <= step ? 'gradient-purple' : 'bg-muted'
                }`} />
                <p className={`text-[9px] font-bold mt-1 text-center ${
                  i <= step ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {s}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 max-w-md mx-auto">
        <AnimatePresence mode="wait">
          {/* Step 0: Time */}
          {step === 0 && (
            <motion.div key="time" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-black mb-1 text-foreground">Pick your time 📅</h2>
              <p className="text-sm text-muted-foreground mb-6">When works best for you?</p>
              <div className="space-y-2">
                {timeSlots.filter(s => s.available).map((slot, i) => (
                  <motion.button
                    key={slot.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => handleSelectSlot(slot)}
                    className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all btn-press ${
                      selectedSlot?.id === slot.id
                        ? 'border-primary bg-accent glow-purple'
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      selectedSlot?.id === slot.id ? 'gradient-purple' : 'bg-muted'
                    }`}>
                      <Clock className={`w-4 h-4 ${selectedSlot?.id === slot.id ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-sm text-foreground">{slot.day}</p>
                      <p className="text-xs text-muted-foreground">{slot.time}</p>
                    </div>
                    {selectedSlot?.id === slot.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full gradient-purple flex items-center justify-center"
                      >
                        <Check className="w-3.5 h-3.5 text-primary-foreground" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </div>
              <div className="sticky bottom-0 pt-4 pb-4 bg-gradient-to-t from-background via-background to-transparent">
                <Button
                  onClick={() => setStep(1)}
                  disabled={!selectedSlot}
                  className="w-full h-13 rounded-2xl font-black text-base gradient-purple text-primary-foreground btn-press disabled:opacity-40"
                >
                  Continue →
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 1: Role */}
          {step === 1 && (
            <motion.div key="role" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-black mb-1 text-foreground">Choose your role ⭐</h2>
              <p className="text-sm text-muted-foreground mb-5">What's your vibe?</p>

              {selectedRole && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 mb-5 p-3 rounded-2xl bg-accent border border-primary/20"
                >
                  <div className="w-6 h-6 rounded-full gradient-purple flex items-center justify-center pulse-ring">
                    <Timer className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <span className="text-xs font-black text-primary">Role held for {formatTimer(holdTimer)}</span>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {roles.map((role, i) => {
                  const RoleIcon = ROLE_ICONS[role.name] || Star;
                  return (
                    <motion.button
                      key={role.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => role.available && handleSelectRole(role.name)}
                      disabled={!role.available && role.heldBy !== student?.id}
                      className={`p-4 rounded-2xl border-2 text-center transition-all btn-press ${
                        selectedRole === role.name
                          ? 'border-primary bg-accent glow-purple'
                          : role.available
                          ? 'border-border bg-card hover:border-primary/30'
                          : 'border-border bg-muted opacity-40'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2.5 ${
                        selectedRole === role.name ? 'gradient-purple' : 'bg-muted'
                      }`}>
                        <RoleIcon className={`w-5 h-5 ${selectedRole === role.name ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                      </div>
                      <p className="font-black text-sm text-foreground">{role.name}</p>
                      <p className={`text-[10px] font-bold mt-1 ${
                        selectedRole === role.name ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {selectedRole === role.name ? '✅ Selected' : role.available ? '🟢 Available' : '🔴 Taken'}
                      </p>
                    </motion.button>
                  );
                })}
              </div>
              <div className="sticky bottom-0 pt-4 pb-4 bg-gradient-to-t from-background via-background to-transparent">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedRole}
                  className="w-full h-13 rounded-2xl font-black text-base gradient-purple text-primary-foreground btn-press disabled:opacity-40"
                >
                  Continue →
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <motion.div key="pay" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
              <h2 className="text-2xl font-black mb-1 text-foreground">Payment 💳</h2>
              <p className="text-sm text-muted-foreground mb-6">Almost there — one more step!</p>

              {/* Order summary */}
              <div className="card-premium p-5 mb-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 gradient-purple" />
                <p className="text-xs font-black uppercase tracking-wider text-primary mb-4">Order Summary</p>
                <div className="space-y-3 text-sm">
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
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> Time
                    </span>
                    <span className="font-bold text-foreground">{selectedSlot?.day} · {selectedSlot?.time}</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between items-center">
                    <span className="font-black text-foreground">Total</span>
                    <span className="text-2xl font-black text-gradient-purple">$45</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div className="mb-6">
                <p className="text-sm font-black text-foreground mb-3">Payment Method</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'stripe' as const, label: 'Card / Apple Pay', icon: CreditCard },
                    { id: 'paynow' as const, label: 'PayNow / QR', icon: Shield },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-4 rounded-2xl border-2 text-center transition-all btn-press ${
                        paymentMethod === method.id ? 'border-primary bg-accent' : 'border-border bg-card'
                      }`}
                    >
                      <method.icon className={`w-5 h-5 mx-auto mb-2 ${paymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-xs font-bold text-foreground">{method.label}</p>
                    </button>
                  ))}
                </div>
              </div>

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
                  ) : 'Pay $45 →'}
                </span>
                {!processing && <div className="absolute inset-0 shimmer" />}
              </Button>

              <p className="text-center text-[11px] text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Shield className="w-3 h-3" /> Secure payment · Instant confirmation
              </p>
            </motion.div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="text-center pt-6">
              {/* Confetti effect */}
              {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                  {Array.from({ length: 30 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{
                        opacity: 1,
                        x: '50vw',
                        y: '40vh',
                        scale: 0,
                      }}
                      animate={{
                        opacity: 0,
                        x: `${Math.random() * 100}vw`,
                        y: `${Math.random() * 100}vh`,
                        scale: 1,
                        rotate: Math.random() * 720,
                      }}
                      transition={{ duration: 1.5 + Math.random(), ease: "easeOut" }}
                      className="absolute w-2 h-2 rounded-full"
                      style={{ background: ['hsl(270 68% 32%)', 'hsl(280 100% 65%)', 'hsl(45 100% 60%)', 'hsl(350 80% 60%)'][i % 4] }}
                    />
                  ))}
                </div>
              )}

              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-24 h-24 rounded-3xl gradient-purple-deep flex items-center justify-center mx-auto mb-6 glow-purple-intense"
              >
                <Check className="w-12 h-12 text-primary-foreground" />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <h2 className="text-3xl font-black mb-1 text-foreground">You're in! 🎉</h2>
                <p className="text-muted-foreground mb-2">Welcome to the crew</p>
                <p className="text-xs text-muted-foreground mb-8">
                  📱 You'll receive a WhatsApp confirmation shortly
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card-premium p-5 text-left mb-8 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 gradient-purple" />
                <p className="text-xs font-black uppercase tracking-wider text-primary mb-4">Your Booking</p>
                <div className="space-y-3 text-sm">
                  {[
                    { label: 'Song', value: `${group.songTitle} — ${group.artist}` },
                    { label: 'Role', value: selectedRole },
                    { label: 'Time', value: `${selectedSlot?.day} · ${selectedSlot?.time}` },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-bold text-foreground">{item.value}</span>
                    </div>
                  ))}
                  <div className="h-px bg-border" />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Payment</span>
                    <Badge className="gradient-purple text-primary-foreground font-black">Paid ✅</Badge>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="space-y-2.5"
              >
                <Button
                  onClick={() => navigate('/my-classes')}
                  className="w-full h-13 rounded-2xl font-black gradient-purple text-primary-foreground btn-press relative overflow-hidden"
                >
                  <span className="relative z-10">View My Classes 📚</span>
                  <div className="absolute inset-0 shimmer" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/feedback')}
                  className="w-full h-12 rounded-2xl font-bold border-2 btn-press"
                >
                  Quick Feedback 📝
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
