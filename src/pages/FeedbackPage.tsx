import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, MessageCircle, Music, Heart } from 'lucide-react';

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState<number | null>(null);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 rounded-3xl gradient-purple-deep flex items-center justify-center mx-auto mb-6 glow-purple-intense"
          >
            <Heart className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h2 className="text-2xl font-black text-foreground mb-2">Thanks! 💜</h2>
          <p className="text-muted-foreground text-sm mb-10 leading-relaxed">Your feedback helps us improve</p>
          <Button onClick={() => navigate('/')} className="rounded-2xl font-bold gradient-purple text-primary-foreground btn-press h-13 px-8">
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  const emojis = ['😐', '🙂', '😊', '😍', '🤩'];

  return (
    <div className="min-h-screen pb-28">
      <div className="px-6 pt-5 pb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground text-sm font-medium btn-press min-h-[44px]">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-6 pt-6 max-w-sm mx-auto"
      >
        <h1 className="text-2xl font-black mb-1.5 text-foreground tracking-tight">Quick Feedback 📝</h1>
        <p className="text-sm text-muted-foreground mb-10 leading-relaxed">Optional — takes 30 seconds!</p>

        <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-8">
          {/* Emoji rating */}
          <div className="space-y-4">
            <Label className="font-black text-sm flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              How was your experience?
            </Label>
            <div className="flex items-center justify-between gap-2.5">
              {emojis.map((emoji, i) => (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setRating(i)}
                  className={`w-14 h-14 rounded-2xl text-2xl flex items-center justify-center transition-all min-h-[56px] ${
                    rating === i ? 'bg-accent border-2 border-primary glow-purple scale-110' : 'bg-card border-2 border-border'
                  }`}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <Label className="font-bold text-sm flex items-center gap-2">
              <MessageCircle className="w-3.5 h-3.5 text-primary" />
              How did you hear about us?
            </Label>
            <Input placeholder="Instagram, friend, TikTok..." className="h-13 rounded-2xl border-2" />
          </div>

          <div className="space-y-2.5">
            <Label className="font-bold text-sm flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-primary" />
              Any song requests?
            </Label>
            <Input placeholder="Your dream K-pop song" className="h-13 rounded-2xl border-2" />
          </div>

          <div className="space-y-2.5">
            <Label className="font-bold text-sm">Anything else?</Label>
            <Textarea placeholder="Tell us anything..." className="rounded-2xl border-2 min-h-[100px]" />
          </div>

          <Button
            type="submit"
            className="w-full h-14 rounded-2xl font-black gradient-purple text-primary-foreground btn-press relative overflow-hidden"
          >
            <span className="relative z-10">Submit ✨</span>
            <div className="absolute inset-0 shimmer" />
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
