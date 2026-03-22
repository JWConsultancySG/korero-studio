import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { RoleName, Booking } from '@/types';
import { ArrowLeft, Check, Clock, CreditCard, Music, Star, Timer, Sparkles, Shield, Mic2, Users, Zap, CircleCheck, CircleX, BookOpen, MessageSquare, ArrowRight } from 'lucide-react';
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
  const { groups, roles, selectRole, createBooking, completePayment, student, timeSlots } = useApp();
  const [step, setStep] = useState(0);
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

  const handleSelectRole = (role: RoleName) => {
    setSelectedRole(role);
    selectRole(role);
    setHoldTimer(1800);
  };

  const handlePayment = async () => {
    if (!selectedRole || !groupId) return;
    setProcessing(true);
    // Use the first available time slot as a placeholder for booking record
    const defaultSlot = timeSlots[0];
    const b = createBooking(groupId, selectedRole, defaultSlot);
    setBooking(b);
    await new Promise(r => setTimeout(r, 2000));
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
                  return (
                    <motion.button
                      key={role.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.06 }}
                      onClick={() => role.available && handleSelectRole(role.name)}
                      disabled={!role.available && role.heldBy !== student?.id}
                      className={`p-5 rounded-2xl border-2 text-center transition-all btn-press min-h-[120px] flex flex-col items-center justify-center ${
                        selectedRole === role.name
                          ? 'border-primary bg-accent glow-purple'
                          : role.available
                          ? 'border-border bg-card hover:border-primary/30'
                          : 'border-border bg-muted opacity-40'
                      }`}
                    >
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                        selectedRole === role.name ? 'gradient-purple' : 'bg-muted'
                      }`}>
                        <RoleIcon className={`w-5 h-5 ${selectedRole === role.name ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                      </div>
                      <p className="font-black text-sm text-foreground">{role.name}</p>
                      <p className={`text-[10px] font-bold mt-1.5 flex items-center gap-1 ${
                        selectedRole === role.name ? 'text-primary' : 'text-muted-foreground'
                      }`}>
                        {selectedRole === role.name ? (
                          <><CircleCheck className="w-3 h-3" /> Selected</>
                        ) : role.available ? (
                          <><CircleCheck className="w-3 h-3 text-success" /> Available</>
                        ) : (
                          <><CircleX className="w-3 h-3 text-destructive" /> Taken</>
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
                    <span className="text-2xl font-black text-gradient-purple">$45</span>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <p className="text-sm font-black text-foreground mb-4">Payment Method</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'stripe' as const, label: 'Card / Apple Pay', icon: CreditCard },
                    { id: 'paynow' as const, label: 'PayNow / QR', icon: Shield },
                  ].map(method => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-5 rounded-2xl border-2 text-center transition-all btn-press min-h-[80px] ${
                        paymentMethod === method.id ? 'border-primary bg-accent' : 'border-border bg-card'
                      }`}
                    >
                      <method.icon className={`w-5 h-5 mx-auto mb-2.5 ${paymentMethod === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
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
                  ) : <span className="flex items-center gap-2">Pay $45 <ArrowRight className="w-4 h-4" /></span>}
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
                      style={{ background: ['hsl(270 68% 32%)', 'hsl(280 100% 65%)', 'hsl(45 100% 60%)', 'hsl(350 80% 60%)'][i % 4] }}
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
