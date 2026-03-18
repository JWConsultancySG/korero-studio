import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 rounded-full gradient-purple flex items-center justify-center mx-auto mb-4 glow-purple">
            <Check className="w-8 h-8 text-primary-foreground" />
          </div>
          <h2 className="text-xl font-black text-foreground mb-2">Thanks! 💜</h2>
          <p className="text-muted-foreground text-sm mb-6">Your feedback helps us improve</p>
          <Button onClick={() => navigate('/')} variant="ghost" className="font-bold">
            Back to Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-4 pb-28 max-w-sm mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black mb-1 text-foreground">Quick Feedback 📝</h1>
        <p className="text-sm text-muted-foreground mb-6">Optional — but we'd love to hear from you!</p>

        <form onSubmit={e => { e.preventDefault(); setSubmitted(true); }} className="space-y-5">
          <div className="space-y-2">
            <Label className="font-bold">How did you hear about us?</Label>
            <Input placeholder="Instagram, friend, etc." className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Any song requests?</Label>
            <Input placeholder="Your dream K-pop song" className="h-12 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="font-bold">Anything else?</Label>
            <Textarea placeholder="Tell us anything..." className="rounded-xl min-h-[80px]" />
          </div>
          <Button type="submit" className="w-full h-12 rounded-xl font-bold gradient-purple text-primary-foreground">
            Submit ✨
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
