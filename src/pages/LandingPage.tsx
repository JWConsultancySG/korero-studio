import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Music, Users, Star, Zap } from 'lucide-react';

const features = [
  { icon: Music, title: 'Pick Your Song', desc: 'Choose from trending K-pop hits' },
  { icon: Users, title: 'Form Your Group', desc: 'Find your squad and vibe together' },
  { icon: Star, title: 'Choose Your Role', desc: 'Main vocal, dancer, rapper — you decide' },
  { icon: Zap, title: 'Start Dancing', desc: 'Book your class and get moving' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { student } = useApp();

  const handleCTA = () => {
    if (student) {
      navigate('/groups');
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 gradient-purple-subtle">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-sm mx-auto"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="w-20 h-20 rounded-2xl gradient-purple flex items-center justify-center mx-auto mb-6 glow-purple"
          >
            <span className="text-3xl font-black text-primary-foreground tracking-tight">K</span>
          </motion.div>

          <h1 className="text-4xl font-black tracking-tight mb-3 text-foreground">
            Korero
          </h1>
          <p className="text-lg text-muted-foreground mb-2">
            K-pop Dance & Singing Studio
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Singapore's coolest place to learn, perform & slay 💜
          </p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={handleCTA}
              size="lg"
              className="w-full text-lg font-bold h-14 rounded-2xl gradient-purple text-primary-foreground glow-purple active:scale-95 transition-transform"
            >
              Join a Song Group 🔥
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-6 py-8 pb-28">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-5 text-center">
          How it works
        </h2>
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="bg-card border border-border rounded-2xl p-4 text-center"
            >
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <p className="font-bold text-sm text-foreground mb-1">{f.title}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
