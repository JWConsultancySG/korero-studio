import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import type { TimeSlot, RoleName, Booking } from '@/types';
import { ArrowLeft, Check, Clock, CreditCard, Music, Star, Timer } from 'lucide-react';
import { toast } from 'sonner';

const STEPS = ['Time', 'Role', 'Pay', 'Done'];

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

  const group = groups.find(g => g.id === groupId);

  useEffect(() => {
    if (!student) navigate('/register');
  }, [student, navigate]);

  // Hold timer countdown
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

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

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
    setStep(3);
    toast.success("You're in! 🎉");
  };

  const progressValue = ((step + 1) / STEPS.length) * 100;

  if (!group) return <div className="p-6 text-center text-muted-foreground">Group not found</div>;

  return (
    <div className="min-h-screen px-4 pt-4 pb-28 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        {step < 3 && (
          <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
            {group.songTitle} — {group.artist}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {STEPS.map((s, i) => (
            <span key={s} className={`text-xs font-bold ${i <= step ? 'text-primary' : 'text-muted-foreground'}`}>
              {s}
            </span>
          ))}
        </div>
        <Progress value={progressValue} className="h-2 rounded-full" />
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Time */}
        {step === 0 && (
          <motion.div key="time" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-xl font-black mb-1 text-foreground">Pick Your Time 📅</h2>
            <p className="text-sm text-muted-foreground mb-5">When works for you?</p>
            <div className="space-y-2">
              {timeSlots.filter(s => s.available).map(slot => (
                <button
                  key={slot.id}
                  onClick={() => handleSelectSlot(slot)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.98] ${
                    selectedSlot?.id === slot.id
                      ? 'border-primary bg-accent glow-purple'
                      : 'border-border bg-card'
                  }`}
                >
                  <Clock className={`w-4 h-4 ${selectedSlot?.id === slot.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="text-left">
                    <p className="font-bold text-sm text-foreground">{slot.day}</p>
                    <p className="text-xs text-muted-foreground">{slot.time}</p>
                  </div>
                  {selectedSlot?.id === slot.id && (
                    <Check className="w-4 h-4 text-primary ml-auto" />
                  )}
                </button>
              ))}
            </div>
            <Button
              onClick={() => setStep(1)}
              disabled={!selectedSlot}
              className="w-full h-12 rounded-xl font-bold mt-6 gradient-purple text-primary-foreground active:scale-95 transition-transform"
            >
              Next →
            </Button>
          </motion.div>
        )}

        {/* Step 1: Role */}
        {step === 1 && (
          <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-xl font-black mb-1 text-foreground">Choose Your Role ⭐</h2>
            <p className="text-sm text-muted-foreground mb-5">What's your vibe?</p>

            {selectedRole && (
              <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-accent border border-primary/20">
                <Timer className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary">Hold expires in {formatTimer(holdTimer)}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {roles.map(role => (
                <button
                  key={role.name}
                  onClick={() => role.available && handleSelectRole(role.name)}
                  disabled={!role.available && role.heldBy !== student?.id}
                  className={`p-4 rounded-xl border text-center transition-all active:scale-[0.97] ${
                    selectedRole === role.name
                      ? 'border-primary bg-accent glow-purple'
                      : role.available
                      ? 'border-border bg-card'
                      : 'border-border bg-muted opacity-50'
                  }`}
                >
                  <Star className={`w-5 h-5 mx-auto mb-2 ${selectedRole === role.name ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-bold text-sm text-foreground">{role.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {selectedRole === role.name ? '✅ Selected' : role.available ? 'Available' : 'Taken'}
                  </p>
                </button>
              ))}
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedRole}
              className="w-full h-12 rounded-xl font-bold mt-6 gradient-purple text-primary-foreground active:scale-95 transition-transform"
            >
              Next →
            </Button>
          </motion.div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <motion.div key="pay" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h2 className="text-xl font-black mb-1 text-foreground">Payment 💳</h2>
            <p className="text-sm text-muted-foreground mb-5">Almost there!</p>

            <div className="bg-card border border-border rounded-2xl p-5 mb-5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-muted-foreground">Class Fee</span>
                <span className="text-2xl font-black text-foreground">$45</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>🎵 {group.songTitle} — {group.artist}</p>
                <p>⭐ {selectedRole}</p>
                <p>📅 {selectedSlot?.day} at {selectedSlot?.time}</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <p className="text-sm font-bold text-foreground">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {(['stripe', 'paynow'] as const).map(method => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      paymentMethod === method ? 'border-primary bg-accent' : 'border-border bg-card'
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 mx-auto mb-1 ${paymentMethod === method ? 'text-primary' : 'text-muted-foreground'}`} />
                    <p className="text-xs font-bold text-foreground">{method === 'stripe' ? 'Card' : 'PayNow'}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={processing}
              className="w-full h-14 rounded-2xl text-lg font-bold gradient-purple text-primary-foreground glow-purple active:scale-95 transition-transform"
            >
              {processing ? 'Processing...' : 'Pay $45 →'}
            </Button>
          </motion.div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center pt-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="w-20 h-20 rounded-full gradient-purple flex items-center justify-center mx-auto mb-6 glow-purple"
            >
              <Check className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <h2 className="text-2xl font-black mb-2 text-foreground">You're in! 🎉</h2>
            <p className="text-muted-foreground mb-8">See you at class!</p>

            <div className="bg-card border border-border rounded-2xl p-5 text-left mb-8">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Song</span>
                  <span className="font-bold text-foreground">{group.songTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-bold text-foreground">{selectedRole}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-bold text-foreground">{selectedSlot?.day} {selectedSlot?.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment</span>
                  <Badge className="gradient-purple text-primary-foreground">Paid ✅</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/my-classes')}
                className="w-full h-12 rounded-xl font-bold gradient-purple text-primary-foreground"
              >
                View My Classes
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/feedback')}
                className="w-full h-12 rounded-xl font-bold"
              >
                Quick Feedback 📝
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="w-full font-bold text-muted-foreground"
              >
                Done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
