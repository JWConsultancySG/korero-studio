'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays, Clock,
  Music, ArrowRight, Info, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfDay, getDay } from 'date-fns';
import type { AvailabilitySlot } from '@/types';
import ScheduleTimetable from '@/components/schedule/ScheduleTimetable';
import type { WeeklyTemplate } from '@/components/schedule/WeeklyGrid';
import { cn } from '@/lib/utils';

export default function AvailabilityPage() {
  const {
    student,
    availability,
    setAvailabilityBatch,
    clearAllAvailability,
    toggleFreeHour,
  } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const fromSignup = searchParams.get('fromSignup') === 'true';
  const onboardingExit = fromSignup || Boolean(returnTo);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showConfirmBanner, setShowConfirmBanner] = useState(false);

  const [weeklyTemplate, setWeeklyTemplate] = useState<WeeklyTemplate>({});

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pb-28 md:pb-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <CalendarDays className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-black text-foreground mb-2">Set Your Availability</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to manage your schedule</p>
          <Button onClick={() => router.push('/login')} className="rounded-2xl font-bold gradient-purple text-primary-foreground btn-press h-12 px-8">
            Sign In <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const today = startOfDay(new Date());
  const allDays = Array.from({ length: 30 }, (_, i) => addDays(today, i));

  const jsToGridDay = (jsDay: number) => jsDay === 0 ? 6 : jsDay - 1;

  const applyTemplate = () => {
    const slots: AvailabilitySlot[] = [];

    allDays.forEach(day => {
      const gridDay = jsToGridDay(getDay(day));
      const hours = weeklyTemplate[gridDay];
      if (!hours || hours.size === 0) return;

      const key = format(day, 'yyyy-MM-dd');
      const confirmedOnDate = availability.filter(s => s.date === key && s.isConfirmedClass);

      const sortedHours = Array.from(hours).sort((a, b) => a - b);
      let blockStart = sortedHours[0];
      let blockEnd = sortedHours[0] + 1;

      for (let i = 1; i <= sortedHours.length; i++) {
        if (i < sortedHours.length && sortedHours[i] === blockEnd) {
          blockEnd = sortedHours[i] + 1;
        } else {
          const overlapsConfirmed = confirmedOnDate.some(c =>
            blockStart < c.endHour && blockEnd > c.startHour
          );
          if (!overlapsConfirmed) {
            slots.push({ date: key, startHour: blockStart, endHour: blockEnd });
          }
          if (i < sortedHours.length) {
            blockStart = sortedHours[i];
            blockEnd = sortedHours[i] + 1;
          }
        }
      }
    });

    setAvailabilityBatch(slots);

    if (onboardingExit) {
      toast.success('Pattern applied — add more free hours or tap Continue below when you are ready.');
    } else {
      setShowConfirmBanner(true);
      toast.success('Pattern applied to the next 30 days.');
    }
  };

  const freeSlotCount = availability.filter((s) => !s.isConfirmedClass).length;
  const canProceedOnboarding = freeSlotCount > 0;

  const navigateAfterSchedule = () => {
    if (!canProceedOnboarding) {
      toast.error('Add at least one free hour so we can match you with classes and groups.');
      return;
    }
    if (returnTo && returnTo.startsWith('/')) {
      toast.success("You're set — taking you back…", { duration: 2000 });
      setTimeout(() => router.push(returnTo), 400);
      return;
    }
    if (fromSignup) {
      toast.success("Schedule saved — let's find your song.", { duration: 2000 });
      setTimeout(() => router.push('/groups'), 400);
    }
  };

  const totalSlots = freeSlotCount;
  const totalConfirmed = availability.filter(s => s.isConfirmedClass).length;
  const hasExistingSlots = totalSlots > 0;

  const daysWithSlots = new Set(availability.filter(s => !s.isConfirmedClass).map(s => s.date)).size;

  return (
    <div
      className={cn(
        'min-h-screen md:pb-10',
        onboardingExit ? 'pb-48 md:pb-40' : 'pb-28',
      )}
    >
      <div className="gradient-purple-subtle px-6 pt-7 pb-5 md:pt-10 md:pb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="content-max">
          <h1 className="text-2xl md:text-3xl font-black mb-1 text-foreground tracking-tight flex items-center gap-2">
            My Schedule <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-3xl">
            {fromSignup ? (
              <>
                <span className="font-bold text-foreground">Almost there — </span>
                mark when you&apos;re free (at least one hour) so we can match you with song groups and classes. Use a
                recurring week, apply to 30 days, or paint a specific week.
              </>
            ) : (
              <>
                One timetable: set a recurring week, apply it to the next 30 days, or switch to a specific week and paint
                your free hours directly. Studio class times are assigned by staff — students only share availability here.
              </>
            )}
          </p>
          <div className="flex items-center gap-2.5 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
              <Clock className="w-3 h-3 text-primary" />
              {totalSlots} free slot{totalSlots !== 1 ? 's' : ''} across {daysWithSlots} day{daysWithSlots !== 1 ? 's' : ''}
            </div>
            {totalConfirmed > 0 && (
              <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-card border border-border text-xs font-bold text-foreground min-h-[36px]">
                <Music className="w-3 h-3 text-primary" />
                {totalConfirmed} class{totalConfirmed !== 1 ? 'es' : ''} (studio)
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="px-5 pt-4 content-max space-y-6">
        <AnimatePresence>
          {showTutorial && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="card-premium p-4 border-primary/20 relative">
                <button
                  onClick={() => setShowTutorial(false)}
                  className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted btn-press"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl gradient-purple flex items-center justify-center flex-shrink-0">
                    <Info className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="pr-6">
                    <p className="text-xs font-black text-foreground mb-1.5">Drag on the grid</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="font-bold text-foreground">Recurring week</span> defines your usual pattern — use
                      &quot;Apply to next 30 days&quot; to copy it forward.{' '}
                      <span className="font-bold text-foreground">Specific week</span> edits one calendar week inside the
                      30-day window (tap arrows to change week).
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showConfirmBanner && !onboardingExit && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="card-premium p-4 border-primary/30 bg-accent">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl gradient-purple flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-foreground mb-1">Pattern applied</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                      Continue editing or dismiss this note.
                    </p>
                    <Button
                      onClick={() => setShowConfirmBanner(false)}
                      variant="outline"
                      size="sm"
                      className="rounded-2xl font-bold btn-press h-9 px-3 text-xs border-border"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ScheduleTimetable
          weeklyTemplate={weeklyTemplate}
          onTemplateChange={setWeeklyTemplate}
          onApplyPatternTo30Days={applyTemplate}
          onClearPatternAndAvailability={() => {
            setWeeklyTemplate({});
            clearAllAvailability();
            toast.success('Pattern and availability cleared');
          }}
          hasExistingSlots={hasExistingSlots}
          availability={availability}
          toggleFreeHour={toggleFreeHour}
          today={today}
        />
      </div>

      {onboardingExit && (
        <div className="fixed left-0 right-0 z-[45] border-t border-border bg-background/95 backdrop-blur-md shadow-[0_-8px_30px_rgba(0,0,0,0.08)] bottom-20 md:bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="content-max px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">
                {returnTo ? 'Finish your availability' : 'Finish onboarding'}
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                {canProceedOnboarding
                  ? returnTo
                    ? 'Continue to return to what you were doing.'
                    : 'Continue to browse and join song groups.'
                  : 'Paint or apply at least one free hour (not studio class blocks) before continuing.'}
              </p>
            </div>
            <Button
              type="button"
              disabled={!canProceedOnboarding}
              onClick={navigateAfterSchedule}
              className="rounded-2xl font-black gradient-purple text-primary-foreground btn-press h-12 px-8 shrink-0 w-full sm:w-auto disabled:opacity-50"
            >
              {returnTo ? 'Continue' : 'Continue to song groups'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
