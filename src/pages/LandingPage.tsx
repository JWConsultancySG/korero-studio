import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Music, Users, Star, Zap, ChevronDown, Sparkles, Play } from 'lucide-react';
import { useRef } from 'react';

const features = [
  { icon: Music, title: 'Pick Your Song', desc: 'Trending K-pop hits updated weekly', emoji: '🎵' },
  { icon: Users, title: 'Find Your Crew', desc: 'Squad up with fellow stans', emoji: '👯' },
  { icon: Star, title: 'Own Your Role', desc: 'Main vocal, dancer, rapper — you decide', emoji: '⭐' },
  { icon: Zap, title: 'Hit The Stage', desc: 'Book, pay, and slay in minutes', emoji: '⚡' },
];

const stats = [
  { value: '500+', label: 'Students' },
  { value: '80+', label: 'Songs' },
  { value: '4.9', label: 'Rating' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { student } = useApp();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  const handleCTA = () => {
    navigate(student ? '/groups' : '/register');
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Hero Section with Video Background */}
      <section ref={heroRef} className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">
        {/* Video Background */}
        <motion.div style={{ scale: heroScale }} className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-background z-10" />
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.75) saturate(1.2)' }}
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
        </motion.div>

        {/* Hero Content */}
        <motion.div style={{ opacity: heroOpacity }} className="relative z-20 text-center px-8 max-w-sm mx-auto">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-20 h-20 rounded-3xl gradient-purple-deep flex items-center justify-center mx-auto mb-8 glow-purple-intense float-subtle"
          >
            <span className="text-3xl font-black text-primary-foreground tracking-tight">K</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-5xl font-black tracking-tight mb-3 text-white"
          >
            Korero
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5 }}
          >
            <p className="text-lg font-medium text-white/90 mb-1 leading-relaxed">
              K-pop Dance & Singing Studio
            </p>
            <p className="text-sm text-white/50 mb-4">
              Singapore's #1 place to learn, perform & slay
            </p>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="flex items-center justify-center gap-6 mb-10"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="text-center"
              >
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="space-y-4"
          >
            <Button
              onClick={handleCTA}
              size="lg"
              className="w-full text-lg font-black h-14 rounded-2xl gradient-purple-deep text-primary-foreground glow-purple-intense btn-press relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center gap-2">
                Join a Song Group
                <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </span>
              <div className="absolute inset-0 shimmer" />
            </Button>

            <p className="text-[11px] text-white/35 font-medium">
              Free to browse · No commitment needed
            </p>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-white/30" />
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-14 relative">
        <div className="max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">How it works</p>
            <h2 className="text-2xl font-black text-foreground leading-tight">
              4 steps to the stage 🔥
            </h2>
          </motion.div>

          <div className="space-y-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="card-premium p-5 flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-2xl gradient-purple flex items-center justify-center flex-shrink-0 group-hover:glow-purple transition-shadow">
                  <f.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm text-foreground flex items-center gap-1.5">
                    <span className="text-xs text-primary font-black">0{i + 1}</span>
                    {f.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                </div>
                <span className="text-lg">{f.emoji}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Songs Preview */}
      <section className="px-6 py-10">
        <div className="max-w-sm mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">Trending now</p>
            <h2 className="text-2xl font-black text-foreground">
              What's hot this week 🔥
            </h2>
          </motion.div>

          <div className="space-y-3">
            {[
              { song: 'Super Shy', artist: 'NewJeans', count: 4, hot: true },
              { song: 'SPOT!', artist: 'ZICO ft. JENNIE', count: 6, hot: true },
              { song: 'Supernova', artist: 'aespa', count: 7, hot: false },
            ].map((item, i) => (
              <motion.div
                key={item.song}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-premium p-5 flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-2xl gradient-purple flex items-center justify-center flex-shrink-0">
                  <Play className="w-4 h-4 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-foreground truncate">{item.song}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.artist}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs font-bold text-muted-foreground">{item.count}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8"
          >
            <Button
              onClick={handleCTA}
              variant="outline"
              className="w-full h-13 rounded-2xl font-bold btn-press border-primary/20 text-primary hover:bg-accent"
            >
              See All Groups →
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-12 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-sm mx-auto text-center gradient-purple-deep rounded-3xl p-10 glow-purple-intense relative overflow-hidden"
        >
          <div className="absolute inset-0 shimmer" />
          <div className="relative z-10">
            <p className="text-3xl mb-4">💜</p>
            <h3 className="text-xl font-black text-primary-foreground mb-3">
              Ready to slay?
            </h3>
            <p className="text-sm text-primary-foreground/70 mb-8 leading-relaxed">
              Join 500+ students already vibing at Korero
            </p>
            <Button
              onClick={handleCTA}
              size="lg"
              className="w-full h-14 rounded-2xl text-lg font-black bg-primary-foreground text-primary hover:bg-primary-foreground/90 btn-press"
            >
              Let's go 🔥
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
