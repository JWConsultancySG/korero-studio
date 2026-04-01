'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Music, Users, Star, Zap, ChevronDown, Sparkles, Play, Heart, ArrowRight, TrendingUp, LogIn, UserPlus, LogOut } from 'lucide-react';
import { useRef, useState, useCallback, useEffect } from 'react';
import { KoreroLogo } from '@/components/KoreroLogo';

const features = [
  { icon: Music, title: 'Pick Your Song', desc: 'Trending K-pop hits updated weekly' },
  { icon: Users, title: 'Find Your Crew', desc: 'Squad up with fellow stans' },
  { icon: Star, title: 'Own Your Role', desc: 'Main vocal, dancer, rapper — you decide' },
  { icon: Zap, title: 'Hit The Stage', desc: 'Book, pay, and slay in minutes' },
];

const stats = [
  { value: '500+', label: 'Students' },
  { value: '80+', label: 'Songs' },
  { value: '4.9', label: 'Rating' },
];

export default function LandingPage() {
  const router = useRouter();
  const { student, groups, isAuthenticated, logoutStudent } = useApp();
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const handleVideoReady = useCallback(() => setVideoReady(true), []);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  const handleCTA = () => {
    router.push(student ? '/browse' : '/register');
  };

  const trendingGroups = groups
    .filter(g => g.status === 'forming')
    .sort((a, b) => (b.interestCount / b.maxMembers) - (a.interestCount / a.maxMembers))
    .slice(0, 3);

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;

    if (connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g') {
      return;
    }

    const idleCallback = window.requestIdleCallback?.(() => setShouldLoadVideo(true), { timeout: 1200 });
    const timeoutId = window.setTimeout(() => setShouldLoadVideo(true), 180);

    return () => {
      if (idleCallback) window.cancelIdleCallback?.(idleCallback);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[100svh] flex flex-col items-center justify-center overflow-hidden lg:items-stretch lg:justify-center">
        {/* Top Auth Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 px-5 pt-5 md:px-8 lg:px-10 flex items-center justify-end gap-2 max-w-7xl mx-auto w-full">
          {isAuthenticated ? (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
              <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Hi, {student?.name || 'there'}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logoutStudent}
                className="h-9 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign Out
              </Button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/login')}
                className="h-9 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                <LogIn className="w-3.5 h-3.5 mr-1.5" /> Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/register')}
                className="h-9 px-3 rounded-xl text-xs font-bold gradient-purple text-primary-foreground"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Sign Up
              </Button>
            </motion.div>
          )}
        </div>

        <motion.div style={{ scale: heroScale }} className="absolute inset-0 z-0">
          <div className="absolute inset-0 z-10" style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.9) 100%)'
          }} />
          {/* Blurred poster – visible instantly */}
          <img
            src="/videos/hero-poster.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: videoReady && !videoFailed ? 0 : 1, filter: 'brightness(0.85) saturate(1.1)' }}
          />
          <video
            ref={videoRef}
            autoPlay muted loop playsInline
            preload="none"
            onCanPlay={handleVideoReady}
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            poster="/videos/hero-poster.jpg"
            style={{ opacity: shouldLoadVideo && videoReady && !videoFailed ? 1 : 0, filter: 'brightness(0.85) saturate(1.1)' }}
          >
            {shouldLoadVideo && <source src="/videos/hero.mp4" type="video/mp4" />}
          </video>
        </motion.div>

        <motion.div
          style={{ opacity: heroOpacity }}
          className="relative z-20 w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-12 flex flex-col lg:flex-row lg:items-center lg:gap-16 xl:gap-24 lg:py-12"
        >
          <div className="text-center lg:text-left flex-1 max-w-sm md:max-w-xl lg:max-w-2xl mx-auto lg:mx-0">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden mx-auto lg:mx-0 mb-6 shadow-lg shadow-black/40 ring-1 ring-white/25"
            >
              <KoreroLogo priority imgClassName="w-full h-full object-cover" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight mb-3"
              style={{ color: 'white', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}
            >
              Korero
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
            >
              <p
                className="text-lg md:text-xl font-semibold mb-1 leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.95)', textShadow: '0 1px 10px rgba(0,0,0,0.4)' }}
              >
                K-pop Dance & Singing Studio
              </p>
              <p
                className="text-sm md:text-base mb-5 max-w-md mx-auto lg:mx-0"
                style={{ color: 'rgba(255,255,255,0.65)', textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
              >
                Singapore's #1 place to learn, perform & slay
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="flex items-center justify-center lg:justify-start gap-0 mb-10 mx-auto lg:mx-0 max-w-md lg:max-w-none"
            >
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className={`text-center flex-1 ${i > 0 ? 'border-l border-white/15' : ''} px-5 md:px-8 py-1`}
                >
                  <p
                    className="text-xl md:text-2xl font-black"
                    style={{ color: 'white', textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
                  >
                    {s.value}
                  </p>
                  <p
                    className="text-[10px] uppercase tracking-[0.15em] font-bold"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {s.label}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="space-y-4 max-w-md mx-auto lg:mx-0"
            >
              <Button
                onClick={handleCTA}
                size="lg"
                className="w-full md:w-auto md:min-w-[280px] lg:min-w-[320px] text-lg font-black h-14 rounded-2xl gradient-purple-deep text-primary-foreground glow-purple-intense btn-press relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Join a song class
                  <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                </span>
                <div className="absolute inset-0 shimmer" />
              </Button>

              <p className="text-[11px] font-medium lg:text-left" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Free to browse · No commitment needed
              </p>
            </motion.div>
          </div>

          {/* Desktop / tablet: secondary panel — reinforces value without hiding mobile hero */}
          <div className="hidden lg:flex flex-1 flex-col justify-center gap-6 max-w-md">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md p-8 text-left">
              <p className="text-xs font-black text-white/50 uppercase tracking-[0.2em] mb-3">Why Korero</p>
              <p className="text-lg font-bold text-white leading-relaxed">
                Book studio time, join song classes, and train with a crew that matches your vibe — all in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {features.slice(0, 2).map((f) => (
                <div
                  key={f.title}
                  className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold text-white/90 border border-white/10"
                >
                  <f.icon className="w-4 h-4 text-primary-foreground shrink-0" />
                  {f.title}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

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
            <ChevronDown className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-14 md:py-20 relative">
        <div className="content-max">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10 md:mb-12"
          >
            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">How it works</p>
            <h2 className="text-2xl md:text-3xl font-black text-foreground leading-tight flex flex-wrap items-center justify-center gap-2">
              4 steps to the stage <Zap className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
            </h2>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 desktop:grid-cols-4 md:gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="card-premium p-5 md:p-6 flex items-center gap-4 group md:flex-col md:items-start md:text-left"
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
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Songs */}
      <section className="px-6 py-10 md:py-14">
        <div className="content-max">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-10"
          >
            <p className="text-xs font-black text-primary uppercase tracking-[0.2em] mb-2">Trending now</p>
            <h2 className="text-2xl md:text-3xl font-black text-foreground flex flex-wrap items-center justify-center gap-2">
              What's hot this week <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
            </h2>
          </motion.div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 md:gap-4">
            {trendingGroups.map((group, i) => {
              const fillPercent = (group.interestCount / group.maxMembers) * 100;
              return (
                <motion.div
                  key={group.id}
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
                    <p className="font-bold text-sm text-foreground truncate">{group.songTitle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{group.artist}</p>
                    <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                      <div className="h-full gradient-purple rounded-full transition-all" style={{ width: `${fillPercent}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground">{group.interestCount}/{group.maxMembers}</span>
                  </div>
                </motion.div>
              );
            })}
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
              className="w-full md:w-auto md:min-w-[240px] md:mx-auto h-13 rounded-2xl font-bold btn-press border-primary/20 text-primary hover:bg-accent"
            >
              Browse Classes <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-12 pb-28 md:pb-16 lg:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="content-narrow text-center gradient-purple-deep rounded-3xl p-10 md:p-12 lg:p-14 glow-purple-intense relative overflow-hidden"
        >
          <div className="absolute inset-0 shimmer" />
          <div className="relative z-10">
            <Heart className="w-8 h-8 text-primary-foreground mx-auto mb-4" />
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
              <span className="flex items-center gap-2">Let's go <Zap className="w-5 h-5" /></span>
            </Button>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
