'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { ArrowRight, Video, VideoOff, Film, Sparkles, Check } from 'lucide-react';
import type { ClassType } from '@/types';

const CLASS_OPTIONS: { id: ClassType; label: string; description: string; icon: typeof Video; emoji: string }[] = [
  {
    id: 'no-filming',
    label: 'No Filming',
    description: 'Practice only — no video recording during class. Great for beginners who want a chill vibe.',
    icon: VideoOff,
    emoji: '🎯',
  },
  {
    id: 'half-song',
    label: 'Half Song',
    description: 'Learn & film half the choreography. Perfect balance of practice + content for your feed.',
    icon: Film,
    emoji: '✨',
  },
  {
    id: 'full-song',
    label: 'Full Song',
    description: 'Full choreography cover with professional filming. The ultimate K-pop experience!',
    icon: Video,
    emoji: '🔥',
  },
];

export default function PreferencesPage() {
  const [selected, setSelected] = useState<ClassType | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { student, setClassPreference } = useApp();
  const returnTo = searchParams.get('returnTo');

  useEffect(() => {
    if (!student) {
      router.replace('/login');
    }
  }, [student, router]);

  if (!student) {
    return null;
  }

  const handleContinue = async () => {
    if (!selected) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    await setClassPreference(selected);
    setLoading(false);

    /** Always set availability on the schedule next; preserve deep-link return (e.g. booking) after schedule is done. */
    if (returnTo) {
      router.push(`/schedule?returnTo=${encodeURIComponent(returnTo)}`);
    } else {
      router.push('/schedule?fromSignup=true');
    }
  };

  return (
    <div className="min-h-screen gradient-purple-subtle">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-6 pt-12 pb-28 md:pb-16 content-narrow md:max-w-4xl"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-16 h-16 rounded-3xl gradient-purple flex items-center justify-center mx-auto mb-6 glow-purple"
        >
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </motion.div>

        <h1 className="text-2xl font-black text-foreground text-center mb-2 tracking-tight">
          What&apos;s your class style? 💃
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8 leading-relaxed">
          Pick your preferred class type — next you&apos;ll set your availability before browsing song classes.
        </p>

        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {CLASS_OPTIONS.map((option, i) => {
            const isSelected = selected === option.id;
            const Icon = option.icon;

            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                onClick={() => setSelected(option.id)}
                className={`w-full p-5 rounded-2xl border-2 text-left transition-all btn-press h-full flex flex-col ${
                  isSelected
                    ? 'border-primary bg-accent glow-purple'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'gradient-purple' : 'bg-muted'
                  }`}>
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-base text-foreground">{option.emoji} {option.label}</p>
                      {isSelected && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check className="w-4 h-4 text-primary" />
                        </motion.div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{option.description}</p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Button
            onClick={handleContinue}
            disabled={!selected || loading}
            className="w-full h-14 rounded-2xl font-black text-base gradient-purple text-primary-foreground btn-press relative overflow-hidden disabled:opacity-40"
          >
            <span className="relative z-10 flex items-center gap-2">
              {loading ? 'Saving...' : 'Continue to schedule'} <ArrowRight className="w-4 h-4" />
            </span>
            {selected && !loading && <div className="absolute inset-0 shimmer" />}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
